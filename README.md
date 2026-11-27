# Járn verktakar ehf. — jarnverk.is

Stöðuvefur með nokkrum síðum. Engin byggingarþrep. Hýstur á Render. Render birtir aðeins `public/`, sem `node scripts/publish.mjs` fyllir. Minnisskrár (*.md), `api/` og stillingar fara ekki á vefinn.

This is a multi-page static site. It needs no build step. It is hosted on Render, which serves only `public/` (filled by `node scripts/publish.mjs`). Notes (*.md), `api/` and config are not published. Security headers are in `render.yaml`.

Quote requests are handled by `api/server.js`. The static site posts to `/api/tilbod`. Until `SMTP_HOST` and `QUOTE_TO` are set, the API answers with an error and the page does not show success. See `OWNER-TODO.md`. Run it with `cd api && npm install && npm start`.

- `/` Forsíða
- `/thjonusta/` Þjónusta
- `/verkefni/` Verkefni
- `/verkefni/verk/` Verk, þegar færsla er til
- `/taekjakostur/` Tækjakostur
- `/um-okkur/` Um okkur
- `/hafa-samband/` Hafa samband
