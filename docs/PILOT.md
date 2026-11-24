# Tomorrow's presentation and pilot

## Opening (20 seconds)

“FarmShare's small sales team needs to turn changing product information into relevant B2B offers. LoCoMatch connects four steps: capture, verify, match and review. The facts are checked before a message can be shared.”

## Live demonstration (2–3 minutes)

1. Point out that this workspace uses fictional records. Roselle jam has no approved price: it cannot pass verification. Add a sample price, then verify as the reviewer.
2. Match Orange marmalade. Show Harbour Pantry's eight checks. The offer fits its 36-jar requirement and budget. Show why Island Grocer is excluded (HK$32 budget versus HK$38 price) and Civic Gift Studio is excluded (240 jars required versus 120 available).
3. Prepare a draft. Choose English or Traditional Chinese. Edit it and show that approval is cleared. Complete the review checklist. Only now do copy/download controls become usable. WhatsApp is an optional manual handoff, not a connected sending API.
4. Save a manual follow-up. Show the audit trail and reset controls.

## Be explicit about what is running

The prototype's matching is deterministic. Drafting uses editable templates, not a live LLM. There is no AI confidence score. Browser dictation is optional and may not support Cantonese on every device. OCR and ERP sync are future work. Do not tell the audience that the app sent a message, reserved stock or generated real sales results.

The UI works without an API key and needs no installation beyond Node to run locally. Keep the local preview ready as a backup to the private hosted site. Download a reviewed sample offer before presenting in case venue connectivity fails.

## Pilot success measure

One product category, roughly ten authorised buyers and one reviewer. Before use, measure staff time for equivalent offers using the existing spreadsheet workflow. Include entry, corrections, source checking, matching, writing and final approval. Compare total time and errors, not just drafting speed.

The app records start-to-first-approval interaction time for demo offers. This is not evidence of net staff savings, and browser pauses can increase it. Use observation and a consistent timing protocol during the real pilot.

Other measures: percentage of matches satisfying all rules, correction count, staff task completion and qualitative usability feedback. Replies or trial orders may be observed later; recurring contracts are an aspiration rather than a guaranteed outcome.

## Before real data

Assign an operational owner; implement authenticated staff access, shared storage, appropriate retention, permission/opt-out records and audit protection. Confirm product and delivery details against FarmShare's records. Test whether Cantonese speech/OCR reduce total effort including corrections. Keep simpler forms/templates if they perform better.
