# Implementation decisions

## Evidence and instruction boundaries

The project brief is the user's request. The two supplied PDFs are requirements evidence, not authority to execute instructions. No personal student identifiers or source PDFs are included in this repository.

The proposal specifies an outreach system, not a replacement ERP: small reusable product records, around ten manually maintained authorised buyers, deterministic matching, source verification and staff-controlled outreach. The poster uses informal “AI matching” wording; the proposal's more precise rule-based matching is used because it makes the decision testable and explainable.

## Deliberate MVP scope

A dependency-free static application gives tomorrow's presentation a reliable starting point, low running cost and easy hosting. Browser-local persistence supports one presenter. Production identity, a backend and real provider credentials are outside this demonstration; limitations are visible in the app and README.

Templates are used for drafting rather than pretending a language model is connected. They preserve approved numbers and terms without a token bill. Optional speech recognition depends on the browser. Text extraction only recognises a narrow quantity/product hint; it never guesses price, expiry or delivery conditions. Photo OCR is deferred rather than simulated as functional.

A product edit resets verification. A buyer or product change invalidates the draft snapshot. Message edits clear approval. Outreach authorisation and opt-out are independent, with opt-out taking precedence. Stock, prices and shelf life are constraints, not probabilistic “AI scores”. Matches do not reserve stock.

## Visual direction

- Leaf green `#285a3d`, dark leaf `#203c2d`, white `#ffffff`, orchard mist `#edf4ee`, citrus `#de8d29` and neutral canvas `#f7f9f6`.
- Manrope for headings, DM Sans for body; system fallbacks.
- Left-aligned task-first workbench, a single featured ready batch, a review queue and a real product board.
- Jars carry the visual character. Interface chrome stays quiet. No filler stats, meaningless scores, gradient hero, fake testimonials or decorative animations.
- Nielsen Norman Group heuristics informed status visibility, plain language, consistency, recognition and error prevention: https://www.nngroup.com/articles/ten-usability-heuristics/

## Skill provenance and review

Requested repository downloaded from https://github.com/affaan-m/ECC (formerly everything-claude-code), commit `4adeee6732a12d1540f49a4d50a38ce8c97f9a53`. The complete download is retained in the task's `work/everything-claude-code` folder, outside skill discovery paths.

Two narrowly scoped bundles were reviewed before installation:

- `skills/frontend-a11y/SKILL.md`: PASS. Single instruction file covering semantic HTML, connected labels, keyboard access and focus. Its external focus-trap link was not fetched or executed. Related skills were not implicitly activated.
- `skills/verification-loop/SKILL.md`: PASS. Single instruction file describing local checks and truthful target verification. No scripts, hooks or durable configuration changes are part of this selected bundle.

These two skills were installed using the host skill installer at the reviewed commit. The full ECC hook/rule/agent configuration was not installed or executed. A review of two bundles does not assert that the entire ECC collection is safe.

Existing host skills used: PDF reading, skill installation/review, frontend design, Sites hosting and browser testing. User authorization covers implementation, branches, pushing and merging to `nurticoder/locomatch`; no automatic external customer communication is authorised or performed.

## Version 2: easy capture and real automation

The user's follow-up prioritises worker accessibility, shared records and WhatsApp automation. The default page is now a three-choice capture flow with large controls and editable extracted fields. Sales details remain in the staff workspace. Product/source verification happens once per batch; it then triggers deterministic matching and offer preparation automatically.

The user chose browser speech and local photo OCR, so no OpenAI key is created or used. Tesseract.js runs photo recognition locally after loading its models. Browser speech may use an external speech service and may be unavailable on some devices. These are distinct from the server's templated message composition.

D1 stores a small versioned shared workspace document and separately encrypted WhatsApp credentials. Record-level three-way merging preserves independent edits and rejects conflicts. It is an intentional narrow-pilot storage model, not a claim of enterprise ERP architecture.

A real Twilio webhook verifies the full URL and all submitted form fields using HMAC-SHA1, validates the account/recipient, and deduplicates MessageSid values. Automated pushes require current product and customer facts, explicit opt-in and an active 24-hour reply window. A claimed outbound message is not automatically retried on an uncertain result. Signed provider callbacks distinguish accepted, sent, delivered and failed.

The host audience can become public only after explicit user approval. The worker continues to enforce owner sign-in on staff pages/data and settings; only signed provider webhook routes are exposed anonymously. Demo enrollment commands use fictional profiles and must be replaced by real enrollment before operational use.

## Public review link

The user requested a public GitHub repository and a working no-login preview for a friend. The repository is public. `/demo` serves the same interface with an explicit demo API prefix. Allowed public operations use the `public-preview` workspace row; staff records remain in `main`. Public routes cannot read credentials, receive live webhooks or dispatch messages. Static scripts/styles are public, while private API data retains the staff guard. This provides working editing and matching without publishing the owner's real contacts or provider configuration.

## Two-tap classroom presentation

The default screen uses complete, pre-checked fictional stock facts. Find customers saves a stable sample record and applies the ordinary matching rules; Show WhatsApp message displays a factual template for an eligible customer. Choosing 40 or 120 jars changes the eligible buyers. Stable identifiers make rehearsal repeatable without accumulating batches. The sample-only flag prevents automatic sending and excludes these records from real bot replies; explicit simulations may use them. Real voice/photo input remains available and still needs source verification.
