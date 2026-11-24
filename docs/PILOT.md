# A five-minute demonstration

## The problem

A small sales team needs accurate stock information before contacting the right customers. Production staff should be able to give an update without navigating a complex ERP form.

## Before the presentation

- Keep the hosted Site signed in as its owner.
- Join the Twilio WhatsApp test number on the phone you will use in class.
- Send `JOIN b1`, `EN` or `ZH`, then `START` shortly before the demonstration so the reply window is active.
- Keep a clear printed production sheet or the supplied sample image ready. Test photo OCR once on the presentation browser so its models are cached.
- Keep ordinary text input ready if the browser does not support Cantonese dictation or microphone permission.

## Show the workflow

1. Open **Add stock**. Point out the three large choices. Speak a Cantonese note or scan the sheet. Text can be corrected before it becomes data.
2. Check a 40-jar marmalade update and save it. Explain that it is now visible in the shared database, but remains unverified.
3. On the phone, send `OFFERS`. The bot uses the latest verified stock and ignores the new unverified update.
4. In **Products**, review the new batch. Supply/check expiry, price, physical stock, storage and delivery, then verify with a reviewer name.
5. The 40-jar batch matches Harbour Pantry (36 jars) and Neighbourhood Café (24 jars). It does not match larger orders. Offers are automatically prepared. A subscribed phone in its active reply window can receive an automatic update.
6. Show **WhatsApp messages**: incoming messages, prepared promotions, and provider acceptance/delivery statuses. Do not describe acceptance as delivery unless a callback or the phone confirms it.
7. Send `STOP`, then demonstrate that updates are paused. For producer entry, switch to `JOIN worker` and send a text stock note; it is saved for staff review.

## Explain the technology plainly

“The photo is read in this browser. Speech uses the browser's service. A shared database keeps the latest stock. Clear rules check customer fit before a template writes the offer. WhatsApp sends real messages only after a verified match and customer opt-in.”

The simulator is explicitly labelled and sends no real messages. There is no live OpenAI model or API key. WhatsApp voice/image files are not processed by the bot itself in this MVP; voice/photo capture is on the web page.

## What remains to validate

Test the flow with FarmShare staff instead of assuming ease of use from age. Observe task completion, transcription/OCR corrections, verification effort and total staff time per accurate offer. Compare against the current spreadsheet workflow. Measure accuracy and time, not only drafting speed. Do not claim recurring sales or verified time savings from the classroom demo.
