#!/usr/bin/env python3
"""Parse the Fulfillment source documents into js/data.js.

Sources:
  - Fulfillment_and_Identity.docx           (question-mapped summary: the spine)
  - Fulfillment_Discovery_Full_QA_Transcript.docx  (the spoken conversation)

Re-run after editing either source:  python3 tools/build_data.py
"""
import json, os, re, zipfile
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NS = {'w': W[1:-1]}

SUMMARY = '/Users/randymcfarland/Documents/Codex/2026-09-08/referenced-chatgpt-conversation-this-is-an/outputs/Fulfillment_and_Identity.docx'
TRANSCRIPT = os.path.expanduser('~/Downloads/Fulfillment_Discovery_Full_QA_Transcript.docx')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'js', 'data.js')


def paragraphs(path):
    """[(style, text)] for every non-empty paragraph, in order."""
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out = []
    for p in root.iter(W + 'p'):
        st = p.find('w:pPr/w:pStyle', NS)
        style = st.get(W + 'val') if st is not None else ''
        text = ''.join(t.text or '' for t in p.iter(W + 't')).strip()
        if text:
            out.append((style, text))
    return out


# ---------------------------------------------------------------- summary ---
ID_RE = re.compile(r'^([LRC]\d{2}\.\d+)\s\s+(.+)$')
EV_RE = re.compile(r'^Full words and examples:\s*(.+)$')
COUNT_RE = re.compile(r'^(\d+) answered in substance • (\d+) partial • (\d+) unanswered • (\d+) total$')
QUEUE_RE = re.compile(r'^([LRC]\d{2}\.\d+)\s\s+\[(Partial|Unanswered)\]\s+(.+)$')

STATUSES = [
    ('Answered in substance.', 'answered'),
    ('Partial — refinement needed.', 'partial'),
    ('Unanswered.', 'unanswered'),
]

BOOKS = {
    'Life Fulfillment and Purpose': dict(id='life', letter='L', icon='🌿',
        tag='What makes a life worth living for me?'),
    'Relationship and Belonging': dict(id='relationships', letter='R', icon='🫂',
        tag='Where can I stay myself and still be close?'),
    'Location Fulfillment': dict(id='location', letter='C', icon='🏙️',
        tag='What must a place support for me to live well in it?'),
}


def split_status(text):
    for prefix, key in STATUSES:
        if text.startswith(prefix):
            return key, text[len(prefix):].strip()
    return None, text


def parse_summary(paras):
    doc = dict(title='', subtitle='', intro=[], howto=[], progress=[], books=[],
               themes=[], northStar=[], anchors=[], tensions=[], evidence=[],
               deferred=[], queueNote=[], supporting=[], sources=[], evidenceNote=[])
    section = None      # top-level Heading1
    book = None         # current workbook dict
    module = None       # current Heading2 inside a workbook
    item = None         # current prompt / inventory / theme / evidence entry
    bucket = None       # current list for free-form Heading2 sections
    queue_group = None

    i = 0
    while i < len(paras):
        style, text = paras[i]
        i += 1

        if style == 'Title':
            doc['title'] = text
            continue
        if style == 'Subtitle':
            doc['subtitle'] = text
            continue

        # -------------------------------------------------- Heading1 ------
        if style == 'Heading1':
            section = text
            book = module = item = bucket = queue_group = None
            if text in BOOKS:
                meta = BOOKS[text]
                book = dict(title=text, modules=[], **meta)
                doc['books'].append(book)
            continue

        # -------------------------------------------------- Heading2 ------
        if style == 'Heading2':
            item = None
            if book is not None:
                num, _, name = text.partition(' ')
                module = dict(num=num, title=name or text, label=text,
                              counts=None, items=[])
                book['modules'].append(module)
                continue
            if section == 'Recurring Themes':
                item = dict(title=text, body=[], evidence=[])
                doc['themes'].append(item)
            elif section == 'North Star Statements':
                if text.startswith('Anchor phrases'):
                    bucket = 'anchors'
                    item = None
                else:
                    bucket = None
                    item = dict(title=text, body=[], evidence=[])
                    doc['northStar'].append(item)
            elif section == 'Core Contradictions and Tensions':
                item = dict(title=text, body=[], evidence=[])
                doc['tensions'].append(item)
            elif section == 'Evidence Library':
                eid, _, name = text.partition(' ')
                item = dict(id=eid, title=name, source='', body=[], mapped=[])
                doc['evidence'].append(item)
            elif section == 'Remaining Questions':
                bucket = {'Explicitly deferred material': 'deferred',
                          'Supporting fields still to complete': 'supporting',
                          'Source workbooks': 'sources'}.get(text)
                queue_group = None
            else:  # front matter
                bucket = 'howto' if text.startswith('How to use') else \
                         'progress' if text.startswith('Overall progress') else 'contents'
            continue

        # -------------------------------------------------- Heading3 ------
        if style == 'Heading3':
            if module is not None:
                item = dict(kind='inventory', title=text, fields=[], body=[], evidence=[])
                module['items'].append(item)
            elif section == 'Remaining Questions':
                queue_group = text
            continue

        # -------------------------------------------------- body ----------
        ev = EV_RE.match(text)
        if ev and item is not None:
            item.setdefault('evidence', []).extend(
                [e.strip() for e in ev.group(1).split(';') if e.strip()])
            continue

        if book is not None and module is not None:
            m = COUNT_RE.match(text)
            if m and module['counts'] is None and not module['items']:
                module['counts'] = dict(answered=int(m.group(1)), partial=int(m.group(2)),
                                        unanswered=int(m.group(3)), total=int(m.group(4)))
                continue
            m = ID_RE.match(text)
            if m:
                item = dict(kind='prompt', id=m.group(1), prompt=m.group(2),
                            status=None, answer='', evidence=[])
                module['items'].append(item)
                continue
            if item is not None:
                if item['kind'] == 'inventory':
                    if text.startswith('Original response fields:'):
                        item['fields'] = [f.strip() for f in
                                          text.split(':', 1)[1].split(';') if f.strip()]
                    else:
                        item['body'].append(text)
                    continue
                if item['status'] is None:
                    st, rest = split_status(text)
                    if st:
                        item['status'] = st
                        item['answer'] = rest
                        continue
                item['answer'] = (item['answer'] + ' ' + text).strip()
            continue

        if section == 'Evidence Library':
            if item is None:
                doc['evidenceNote'].append(text)
            elif not item['source'] and not item['body']:
                # first paragraph of every entry names its place in the recording
                item['source'] = text
            elif text.startswith('Mapped to:'):
                item['mapped'] = [x.strip() for x in
                                  text.split(':', 1)[1].split(',') if x.strip()]
            else:
                item['body'].append(text)
            continue

        if section == 'Remaining Questions':
            m = QUEUE_RE.match(text)
            if m:
                continue  # the queue is derived from the prompts themselves
            if bucket == 'deferred':
                doc['deferred'].append(dict(text=text, evidence=[]))
                item = doc['deferred'][-1]
            elif bucket in ('supporting', 'sources'):
                doc[bucket].append(text)
            else:
                doc['queueNote'].append(text)
            continue

        if section in ('Recurring Themes', 'North Star Statements',
                       'Core Contradictions and Tensions'):
            if bucket == 'anchors':
                item = dict(text=text.strip('“”"'), evidence=[])
                doc['anchors'].append(item)
            elif item is not None:
                item['body'].append(text)
            continue

        # front matter
        if section is None:
            if bucket == 'howto':
                doc['howto'].append(text)
            elif bucket == 'progress':
                doc['progress'].append(text)
            elif bucket == 'contents':
                pass
            else:
                doc['intro'].append(text)
    return doc


# ------------------------------------------------------------- transcript ---
def parse_transcript(paras):
    out = dict(title='', note=[], map=[], sections=[])
    section = None
    entry = None
    seen_map = False
    for style, text in paras:
        if style == 'Title':
            out['title'] = text.replace('Fulfillment Discovery', 'Fulfillment Discovery — ')
            continue
        if style == 'Heading1':
            if text == 'Session Map':
                seen_map = True
                section = None
                continue
            seen_map = False
            section = dict(title=text, entries=[])
            out['sections'].append(section)
            entry = None
            continue
        if style == 'QuestionLabel':
            entry = dict(n=int(re.sub(r'\D', '', text) or 0), question='', answer=[])
            if section:
                section['entries'].append(entry)
            continue
        if style == 'Heading2':
            if entry is not None:
                entry['question'] = text
            continue
        if style == 'AnswerLabel':
            continue
        if text.replace('•', '').strip() == '':
            continue
        if seen_map:
            out['map'].append(text)
        elif entry is not None:
            entry['answer'].append(text)
        elif section is None:
            out['note'].append(text)
    return out


def main():
    doc = parse_summary(paragraphs(SUMMARY))
    tx = parse_transcript(paragraphs(TRANSCRIPT))

    # sanity report
    prompts = [it for b in doc['books'] for m in b['modules']
               for it in m['items'] if it['kind'] == 'prompt']
    bad = [p['id'] for p in prompts if not p['status']]
    print(f"books={len(doc['books'])} modules={sum(len(b['modules']) for b in doc['books'])} "
          f"prompts={len(prompts)} evidence={len(doc['evidence'])} themes={len(doc['themes'])} "
          f"northstar={len(doc['northStar'])} anchors={len(doc['anchors'])} "
          f"tensions={len(doc['tensions'])} qa={sum(len(s['entries']) for s in tx['sections'])}")
    from collections import Counter
    print(' status:', Counter(p['status'] for p in prompts))
    if bad:
        print(' !! prompts with no status:', bad)

    payload = dict(doc=doc, transcript=tx)
    with open(OUT, 'w') as f:
        f.write('// Generated by tools/build_data.py from the discovery documents.\n')
        f.write('// Edit the sources and re-run, or hand-edit below — the site only reads DATA.\n')
        f.write('const DATA = ')
        json.dump(payload, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')


if __name__ == '__main__':
    main()
