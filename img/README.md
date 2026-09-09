# Plates

Five photographs open five parts of the book. Drop the files in here with these
**exact names** and they appear automatically — no code change needed.

| File | Where it appears | The image |
|---|---|---|
| `plate-horizon.jpg` | Contents (the title page) | the figure walking the golden field under sunset cloud |
| `plate-meadow.jpg`  | Book II · Life & Purpose | the sunlit meadow of pink flowers, sparkling |
| `plate-oak.jpg`     | Book III · Relationships & Belonging | the great oak with the sunburst through its trunk |
| `plate-window.jpg`  | Book IV · Place | golden rays through the garden window onto tile |
| `plate-prism.jpg`   | Book V · Patterns & Tensions | the forest split into prismatic rainbow light |

`.jpg` is expected. If you have `.png` or `.webp` instead, either convert them or
change the five `url(...)` lines under **§7 PLATES** in `css/styles.css`.

Until a file is present, that plate falls back to a gradient built from the same
colours, so nothing ever looks broken or empty.

Keep them reasonably sized — 1600px on the long edge is plenty, and the page stays
fast. They are decorative: every plate carries its caption as an accessible label.
