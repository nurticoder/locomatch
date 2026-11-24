# LoCoMatch

A working FarmShare outreach prototype for **HKU CCAI9022, Group 3**. It turns product records into buyer offers through four accountable steps: capture, verify, match, and draft/review.

## Run it

Requires Node.js 20 or newer. No packages, API keys, account or build step are needed.

```sh
npm start
```

Open http://127.0.0.1:5173. For a different local port, run `PORT=5180 npm start`.

```sh
npm run check
npm test
```

The `dist/` directory can be served by any static host. `.openai/hosting.json` binds the private Sites deployment. The Node server is a local preview server, not a production application backend.

## Three-minute demonstration

1. Start at the **Workspace**. Explain that the records and buyers are fictional.
2. Open **Roselle jam**. The missing approved price prevents verification. Choose **Complete product details**, set a sample price of **40**, and save. Enter a reviewer name, check the source-review checklist and choose **Verify & find buyers**.
3. Return to the workspace and choose **Find suitable buyers** for **Orange marmalade**. Four of ten buyers qualify. Expand **Why this match?**; show an excluded buyer whose budget or quantity does not fit.
4. Choose **Prepare offer**. Edit an English or Traditional Chinese message. Complete the review checklist and approve it. Copy/download the offer, or select WhatsApp format and explicitly open WhatsApp after review. No message is sent by LoCoMatch.
5. Record a follow-up and open **Outreach**. Use **Demo & pilot guide → Reset demo** to prepare the next run.

## Implemented

- Responsive workbench, product records, buyer directory, outreach tracker and pilot guide.
- English / Traditional Chinese interface and editable message templates.
- Product entry and CSV import with source tracking. Imports always require new verification.
- Optional browser Cantonese dictation and narrow text extraction for product hints and jar quantities, with a manual fallback.
- Named product verification. Missing facts, estimates, invalid dates and incomplete delivery terms block matching.
- Eight explicit buyer checks: verified facts, outreach permission, category, quantity, budget, shelf life on arrival, delivery and storage.
- Human review gates copying, downloading and WhatsApp handoff. Changes to product or buyer records invalidate the previous draft snapshot. Editing a message clears its approval.
- Browser persistence, manual contact and follow-up states, CSV activity/audit export, JSON backup and reset.
- Demo interaction timing, without presenting it as proven staff time saved.

## Honest boundaries

This is a **single-browser prototype**, not an operational inventory or CRM system. It has no shared database, staff authentication, live ERP integration, stock reservation, automatic sending or photo OCR. Named reviewers represent a workflow convention, not authenticated roles. Drafts use deterministic bilingual templates; **no live language model is connected**. Optional dictation uses the browser's speech service, which may process audio externally; typing needs no speech service.

All seeded products, stock, prices, product illustrations, customer names and permissions are fictional and do not represent verified FarmShare records. Existing ERP/spreadsheet records remain the operational source of truth. The UI does not claim to verify food safety, environmental impact or commercial success. Buyers are checked independently, so several offers can refer to the same unreserved stock; recheck availability before an actual order.

Use fictional data for the demo. A real deployment needs staff identity, shared durable storage, access controls, real source verification, privacy/authorisation review, retention rules and operational ownership. This prototype does not establish legal compliance.

## Design choices

The brief led to a product workbench rather than a generic AI chat box: one primary next action, familiar jars and buyers, plain labels, visible missing information and explainable checks. The leaf-green palette and citrus illustrations refer to the actual product category. No fabricated KPI improvements, arbitrary AI scores, decorative gradients or automatic messages. Keyboard focus, native dialogs, connected form labels, reduced-motion support and mobile layouts are included.

Google Fonts improve the appearance when online; system font fallbacks preserve the workflow offline. Product illustrations are local SVG; the app needs no external image service. Initial page assets must have been loaded before using it offline; this is not an installable offline PWA.

## Files

- `dist/app.js`: UI, state, forms, verification and approval workflow.
- `dist/domain.js`: pure matching, validation, message templates, dates and CSV handling.
- `dist/styles.css`: responsive visual system.
- `tests/domain.test.mjs`: business-rule and import/export tests.
- `docs/DECISIONS.md`: source requirements, scope decisions and skill provenance.
- `docs/PILOT.md`: presentation notes and proposed pilot measurement.

## Next integration

Keep deterministic matching and verification on the server. Add a server-side drafting provider that receives only approved facts and buyer needs, returns a draft, and cannot send messages. Keep the current templates as a fallback. Add OCR and Cantonese transcription behind explicit staff review only after comparing their full correction/verification time against ordinary forms.
