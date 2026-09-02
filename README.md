# Water Secret Contracting — Sales Application

Internal mobile app for the sales team. While standing with the client, the
sales representative opens the app on their phone, fills in the client and
project details, picks the products the client needs, answers the high level
technical questions for each product, attaches drawings or site photos, and
sends the whole thing to the engineering team as a formatted e-mail — before
leaving the site.

Every registration gets a reference number (`WSC-2026-0001`) so sales and
engineering can talk about the same opportunity.

## What the sales team sees

| Step | Screen | What is filled in |
| --- | --- | --- |
| 1 | Client details | Company, client type, contact person, position, mobile, e-mail |
| 2 | Project details | Project name, location, emirate, stage, our scope, **offer deadline**, expected start, estimated value, competition |
| 3 | Opportunity overview | Priority, chance of winning, high level description, client conditions |
| 4 | Our products | STP, Greywater, RO, Stormwater, Landscape, Vacuum sewer (multi-select) |
| 5 | Technical information | The questions for each selected product (flow, technology, water quality, …) |
| 6 | Attachments | Camera photo, drawings, tender documents, water analysis |
| 7 | Review & send | Sales rep details, who receives it, message, full summary, **Send to engineer** |

Built as an installable web app (PWA): "Add to Home Screen" puts it on the
phone next to the normal apps, and it opens full screen without a browser bar.

### On site with no signal

Sites are often basements, new plots or industrial areas with no coverage, so:

* the form works offline once the app has been opened once;
* an unfinished registration is kept on the phone — the app offers to continue it;
* if the send fails, the opportunity **including the photos** is queued on the
  phone and sent by itself as soon as there is signal again;
* the result screen also offers "Send from my mail app" (opens Outlook/Gmail
  with the full summary already written) and "Share" for WhatsApp or Teams.

A submission carries a client id, so a queued retry never registers the same
opportunity twice.

## What the engineer receives

A branded HTML e-mail with the reference, priority, offer deadline, the product
tags, every answer grouped by section, the sales rep's note, and the client's
files attached. Replying to it replies to the sales representative.

Subject line: `[URGENT] [WSC-2026-0001] STP + Greywater - Dubai South Labour Village Ph.2 (Al Naboodah Contracting)`

## Running it

```bash
npm install
cp .env.example .env      # then fill in the SMTP settings
npm start                 # http://localhost:3000
```

Without SMTP settings the app still works: opportunities are saved and the
e-mail is written to `data/outbox/` so it can be checked or forwarded by hand.

### Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Port to listen on (default 3000) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Mail server. Office 365: `smtp.office365.com`, `587`, `false` |
| `SMTP_USER` / `SMTP_PASS` | Mailbox the app sends from |
| `MAIL_FROM` | From header, e.g. `"Water Secret Sales App <sales-app@watersecret.ae>"` |
| `MAIL_REPLY_TO_SALES` | Replies go back to the sales rep (default true) |
| `MAIL_CC_SALES` | Copy the sales rep on every registration (default true) |
| `TEAM_ACCESS_CODE` | Optional shared code, needed if the app is published on the internet |
| `MAX_UPLOAD_MB` / `MAX_FILES` | Attachment limits (default 15 MB, 10 files) |
| `DATA_DIR` | Where records and attachments are stored (default `./data`) |

### Who receives the opportunity

Edit `config/recipients.json` — it is read on every request, so no restart is
needed:

```json
{ "name": "STP & Greywater Engineer", "email": "stp.engineer@watersecret.ae", "products": ["stp", "greywater"] }
```

* `default: true` — always pre-selected.
* `products: [...]` — pre-selected when one of those products is chosen.

The sales rep can always add or remove recipients before sending.

### Adding a product or a question

Everything the form asks is defined in `server/catalog.js`. Add a field to a
product, or a whole new product, and the mobile form, the validation, the
summary screen and the e-mail all pick it up — there is nothing else to change.

Field types: `text`, `textarea`, `number`, `date`, `tel`, `email`, `select`,
`multiselect`, `checkbox`.

## Deployment notes

* Serve it over **HTTPS** — the camera, "Add to Home Screen" and the offline
  cache only work on a secure origin. Put it behind IIS, nginx or Cloudflare
  Tunnel with a certificate.
* Keep it on the company network or set `TEAM_ACCESS_CODE` if it is reachable
  from outside.
* Back up the `data/` folder: it holds every registration and its attachments.
* Run it under a process manager, e.g. `pm2 start server/index.js --name wsc-sales`.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/catalog` | Form definition, products, recipients, limits |
| `POST` | `/api/opportunities` | Register and e-mail an opportunity (multipart) |
| `GET` | `/api/opportunities` | Recent registrations |
| `GET` | `/api/opportunities/:reference` | One full registration |
| `POST` | `/api/opportunities/:reference/resend` | Retry a failed e-mail |
| `GET` | `/api/mail-check` | Verify the SMTP settings |
| `GET` | `/api/health` | Health check |

## Project layout

```
server/     Express API, catalogue, validation, e-mail builder, file store
public/     The mobile app (no build step: plain HTML, CSS and JavaScript)
config/     recipients.json - the engineers who receive the opportunities
scripts/    make-icons.js - regenerates the app icons
test/       API, validation and e-mail tests (npm test)
data/       Created at runtime: registrations, attachments, outbox
```

## Tests

```bash
npm test
```
