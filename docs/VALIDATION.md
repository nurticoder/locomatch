# Version 2 validation — 24 November 2026

## Local checks

- JavaScript syntax checks: PASS.
- Node tests: 41 passed, 0 failed.
- Production Worker bundle: built successfully.
- Runtime dependency audit: no reported vulnerabilities at the time of testing.
- No OpenAI API key is configured or used.

The tests cover matching constraints, missing facts, speech/OCR text extraction, shared-state merging and conflicts, staff API access and request-origin checks, source verification, automatic offer preparation, duplicate webhook suppression, latest-stock replies, opt-in/opt-out, the 24-hour reply window, stale product/customer offers, simulation isolation, credential encryption and the official Twilio signature vector.

## Browser checks

Chromium desktop 1440×1000 and mobile 390×844. Passed:

1. Three large worker input choices load.
2. A stock note is reviewed and saved as a pending batch.
3. A second browser page reads the same saved stock.
4. Verifying a 40-jar batch automatically prepares offers for two eligible customers.
5. The labelled simulator reads verified stock from the backend.
6. STOP pauses simulated promotions without changing a real customer's subscription.
7. WhatsApp setup masks the token and provides no secret readback.
8. Real in-browser Tesseract OCR reads a synthetic production sheet and extracts 40 jars.
9. English and Traditional Chinese layouts fit a 390px phone.
10. No JavaScript runtime errors occur across those workflows.

Photo recognition downloaded its models during the test. Microphone transcription was not exercised with real speech: device/browser support and microphone permission still need checking on the presentation device. A synthetic test image is not evidence of handwritten-sheet accuracy.

## Repeat

Start `npm start`, then run `tests/browser_qa.py` in a Python environment with Playwright and Chromium installed. It resets sample stock in its target demo workspace and writes screenshots/results to ignored `test-results/`. Use only a disposable demo target. `LOCOMATCH_QA_URL` and `LOCOMATCH_QA_OUTPUT` override target and output.

## Hosted verification

The deployment, hosted access boundary and real WhatsApp send/receive are verified separately after deployment. Local simulations and tests do not establish live delivery, operational time savings, legal compliance or FarmShare staff usability.
