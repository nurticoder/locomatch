# LoCoMatch

A working **FarmShare / CCAI9022 Group 3** prototype: simple stock entry, shared records, explainable customer matching and a real WhatsApp webhook.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm start
```

Open http://127.0.0.1:5173. Choose **Start demo workspace** once to load fictional products and customers. Local data is stored in ignored `.local-state/locomatch.sqlite`. The local server listens only on loopback; it is a development preview, not a public production server.

```sh
npm run check
npm test
npm run build
```

## For production staff

The first page offers three large actions: **Speak an update**, **Take or upload a photo**, and **Type a short update**. Review the suggested product, quantity and expiry, then save for sales review. A known product reuses its price/storage/delivery settings as suggestions; a new batch still requires verification.

Speech uses the browser's recognition service with Cantonese requested. Availability depends on the browser/device and may require an internet connection. The photo route runs Tesseract OCR in the browser; it downloads recognition models, but the photo is not sent to an OCR API. Printed sheets work better than handwriting. Both inputs retain an ordinary text-editing fallback. No OpenAI API key is needed or used.

## For sales staff

**Products** shows the shared stock records. Complete missing facts and verify the batch against its source. Verification automatically applies eight customer-fit rules and creates personalised bilingual template messages. **Customers** holds purchasing requirements. **WhatsApp messages** shows live conversations, automatic offers and actual provider statuses. **Reviewed offers** retains the manual offer-review workflow.

The first pilot uses a small shared workspace document in D1. Updates merge independent record changes and reject conflicting edits to the same record. This keeps the demo understandable without silently overwriting another browser or bot update. It is not a multi-tenant production ERP, and matching does not reserve stock.

## WhatsApp demo

1. Create/join the Twilio WhatsApp test environment using your own phone.
2. In **WhatsApp messages → WhatsApp connection**, enter the Account SID, Auth Token and test sender number. Tokens are encrypted server-side and never returned to the browser.
3. Set Twilio's **Custom** incoming-message webhook to the URL shown in the connection dialog, using **HTTP POST**.
4. Send **JOIN b1** from your phone to try the fictional Harbour Pantry customer profile.
5. Send **OFFERS** for a promotion generated from the latest verified stock. Send **ZH** or **EN** to switch language.
6. Send **START** to opt in. Add and verify a fresh matching batch in the app; LoCoMatch can send an update automatically during the active WhatsApp 24-hour reply window. **STOP** takes effect immediately.
7. Send **JOIN worker**, then a text note such as `Orange marmalade 40 jars. Best before 2027-05-01.` to submit an unverified stock update from WhatsApp.

The labelled web simulator uses the same database and rules but never sends a WhatsApp message or changes a real customer's subscription. WhatsApp voice/photo messages are not transcribed by the bot; use the web capture page for these inputs.

## Hosting and access

The existing Site is upgraded to a Cloudflare Worker with a D1 binding. Schema-only migrations are generated into `drizzle/`. The public WhatsApp endpoints verify Twilio's signature, account and recipient; staff pages and APIs require the configured owner's Sites sign-in. Making the hosting audience public requires the user's explicit approval and does not make the staff database public.

Hosted settings are configured through Sites environment secrets:

- `OWNER_USER_ID`: the existing Site owner's scoped identity.
- `PUBLIC_ORIGIN`: the exact deployed Site origin used for webhook signatures.
- `SECRET_ENCRYPTION_KEY`: a 32-byte base64 AES-GCM key, held outside source.
- `SERVICE_SECRET`: scoped server-to-server verification access, kept outside source.
- Optional `DEMO_TWILIO_ACCOUNT_SID` / `DEMO_TWILIO_WHATSAPP_FROM`: prefill setup without storing an Auth Token in the client.

Never commit credentials or publish the local SQLite database. The app has no browser secret-readback endpoint. Unknown delivery outcomes are labelled **uncertain** and are not blindly retried. Successful API acceptance is not labelled as delivery; signed status callbacks record later delivery states.

## Scope and limits

All seeded products, prices, stock, customer names and authorisation flags are fictional. Customer `JOIN b1` and `JOIN worker` are explicitly classroom-demo enrollment commands, not production authentication. A real deployment needs staff roles, per-customer enrollment, retention rules, operational ownership and compliance review. The first presentation should use sample data only.

Promotions use deterministic templates grounded in verified facts. No live language model is connected. Food safety, environmental impact, demand, staff time savings and sales results are not independently verified. Outside an active WhatsApp reply window, approved WhatsApp message templates would be needed; this MVP holds the offer rather than attempting an unauthorised free-form send.

See [docs/PILOT.md](docs/PILOT.md), [docs/DECISIONS.md](docs/DECISIONS.md), and [docs/VALIDATION.md](docs/VALIDATION.md).
