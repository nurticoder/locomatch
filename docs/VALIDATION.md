# Validation — 24 November 2026

## Local checks

- JavaScript syntax checks: PASS.
- Node test runner: 19 tests, 19 passed, 0 failed.
- Git whitespace checks: PASS.
- No runtime dependencies or API keys are required.

## Browser checks

Chromium desktop viewport 1440×1080 and mobile viewport 390×844. Twelve checks passed:

1. Workspace loads with four seeded products.
2. Missing price prevents verification; correcting it and completing named review unlocks matching.
3. Orange marmalade produces four eligible buyers, eight visible checks per buyer and six explainable exclusions.
4. Export is blocked before review; message edits clear approval and its visible status.
5. A Traditional Chinese message can be rebuilt, approved and downloaded.
6. Follow-up state and drafts survive a browser reload.
7. Product edits invalidate old draft snapshots and prevent their export.
8. CSV imports remain unverified; imported markup is displayed as text.
9. Cantonese sample extraction suggests quantity without inventing price or finished-stock confirmation.
10. English and Traditional Chinese mobile layouts have no page-level horizontal overflow.
11. The full workflow produces no JavaScript runtime errors.
12. When access to localStorage throws a SecurityError, the app still opens and displays a saving warning.

Screenshots of the desktop board, buyer matching, reviewed offer and English/Chinese mobile views were inspected. Controls use native buttons, forms and a native modal dialog. Browser speech recognition and a real WhatsApp send were not exercised; no customer messages were sent.

## Repeat browser checks

Start the app with `npm start`. In another terminal, use an optional Python environment with Playwright installed:

```sh
python3 -m venv .venv
.venv/bin/pip install playwright
.venv/bin/playwright install chromium
.venv/bin/python tests/browser_qa.py
```

Screenshots and the JSON report are written to ignored `test-results/`. `LOCOMATCH_QA_URL` and `LOCOMATCH_QA_OUTPUT` override the target and output directory. These browser tools are development-only and are not needed to run the app.

## Acceptance limits

This verifies a student demonstration using fictional data, not FarmShare's real operations. Real workflow time savings, staff usability, speech accuracy, legal compliance, food safety and sales impact are not established by these tests. The deployed environment is checked separately from these local results.
