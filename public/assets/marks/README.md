# Team marks

Drop a compact, roughly square logo mark for each team here and it replaces the
colour chip everywhere in the UI (tables, legends, filters, headers):

    brotherhood.png   grv.png   1-million.png
    royal-family.png  jam-republic.png  quick-style.png

`.png`, `.webp` or `.svg` all work — update `TEAM_MARK` in `src/lib/data.js` if
you use a different extension. Until a file exists the chip falls back to the
team's brand-colour square. idl.pro's press kit only ships the IDL brand marks,
not per-team logos, so these have to be supplied by hand.
