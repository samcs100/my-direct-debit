# My Direct Debits

A local proof of concept for understanding and managing fictional direct debits. All data is synthetic, all changes are held in temporary memory, and **no money moves**. Predictions are estimates, not creditor notifications. This is not a bank integration or production application.

## Requirements

- Node.js 22.18 or newer (22.23.4 recommended) and npm
- VS Code or another editor

## Run locally

1. Open this folder in VS Code.
2. In the integrated terminal run `npm ci --ignore-scripts`.
3. Run `npm run dev` and open http://127.0.0.1:5173.
4. Use Ctrl+C in the terminal to stop both services.

The app has an offline browser fallback without the helper: template explanations and all simulated controls run in the browser. The helper runs only on 127.0.0.1:8787. No account, API key, database, or internet connection is needed after dependencies are installed. When the helper is running, changes and the activity log survive a browser reload but reset when the helper restarts or you choose Reset demo. Without the helper, changes remain in browser memory and reset on reload.

## Demo

The demo clock starts on 12 November 2026. TelcoNext appears in the three-day heads-up, and four agreements need attention. Open Voltara, set a €130 limit and confirm; simulate the latest amount to see `REFUSED_OVER_LIMIT`. Open StreamBox and pause for 30 days to simulate `REFUSED_PAUSED`. Stopping is irreversible within the demo. The action log records confirmed changes only. Use Reset demo to start over.

The optional request field uses local deterministic rules. A request proposes an action, which must be confirmed. The AI input inspector displays the whitelisted data used for explanations; it contains no names, identifiers, account numbers or dates. Template mode sends nothing to a model.

## Configuration

Thresholds and demo windows are in `packages/core/src/types.ts` (`DEFAULT_CONFIG`); fictional fixtures and the initial clock are in `packages/core/src/fixtures.ts`. Restart the app after edits. The date picker is limited to 120 days around the initial demo date. Predictions use the provided 2026 holiday fixture; they are illustrative and are not maintained beyond it.

Optional helper environment variables are listed in `.env.example`. Set them in your terminal before starting the helper; this project does not automatically load `.env` files. The default `LLM_MODE=template` is fully offline. To experiment with an approved local Ollama model, set `LLM_MODE=ollama`, `LLM_MODEL` and optionally `OLLAMA_URL` (localhost only); select Helper model in a detail panel. The helper sends only the inspector's structured input and validates the response before displaying it, falling back to the template on errors. This validation is heuristic and does not guarantee factual accuracy. No command text is sent to the model. Do not use real data.

PowerShell example:

```powershell
$env:LLM_MODE = 'ollama'
$env:LLM_MODEL = 'your-approved-local-model'
npm run dev
```

## Checks

- `npm test` — core and helper tests
- `npm run check:synthetic` — fixture checks
- `npm run build` — TypeScript check and production build
- `npm run preview` — preview the built web app (start `npm run dev:helper` separately for helper features)

## GitHub

Review the contents and your organisation's IP rules before sharing. A private repository is recommended for the hackathon. Create an empty repository on GitHub, then from this folder run:

```powershell
git init
git add .
git commit -m "Add direct debits proof of concept"
git branch -M main
git remote add origin <your-repository-url>
git push -u origin main
```

Do not commit real customer data, credentials, or internal bank material. The fixture checks are limited and do not prove that names are unused by real businesses. Check names and the live banking experience before presenting any competitive claims. Compliance, accessibility audit, security review, production identity controls, and real payment integration are outside this PoC.

## Browser and accessibility checks

Run `npm run build` followed by `npm run test:e2e`. By default the suite uses Microsoft Edge at its standard Windows path. On another machine set `PLAYWRIGHT_BROWSER_PATH` to a Chromium-based browser executable. The suite tests the overview, actions, audit, commands, offline fallback, keyboard interaction, narrow viewport, and local-only browser requests. It runs axe WCAG 2.0/2.1 A and AA checks on the overview, details and confirmation states. Automated checks and a keyboard journey do not replace a full manual accessibility audit with assistive technology.

The helper model adapter also has automated tests using a simulated local model server. It verifies the exact structured input and fallback when output contains a link or invented amount. Model-output checks are heuristic and cannot prove correctness.

**Future model decision:** No hackathon model has been approved yet. The provisional local evaluation model should be replaced with the organisers' approved model via `LLM_MODEL`; repeat the evaluation in both languages before using it for a demo. Keep template mode as the default until approval. Never use real customer data in this PoC.

To evaluate a local model, install Ollama separately and download the candidate model. The local candidate installed on this computer is `qwen:1.8b`; it is **not hackathon-approved**, and Dutch quality must be reviewed. In one PowerShell terminal start Ollama, then start the helper:

```powershell
$env:LLM_MODE = 'ollama'
$env:LLM_MODEL = 'qwen:1.8b' # TODO: replace with the model approved by the organisers
$env:LLM_TIMEOUT_MS = '120000' # allow for a cold model on CPU
npm run dev:helper
```

In another terminal run `npm run evaluate:model`. It tests all four flag types in English and Dutch and reports accepted text and fallback reasons. Review each result manually; passing the heuristic validator is not proof that the explanation is accurate. Repeat with the approved model and its configuration, record results and use template mode if it is unreliable.



## Try the local model on this computer

The local model files are stored in `.local-model/` and are ignored by Git. Start the app and local model together from a VS Code terminal:

```powershell
npm run dev:ai
```

Open http://127.0.0.1:5173, open an agreement, and change **AI: Template** to **Helper model** in its detail panel. The source label shows `model` if the response passes the heuristic checks, or `template` with reasons if it is rejected. The first request can take longer while the model loads. Stop the services with Ctrl+C.

This setup uses the provisional `qwen:1.8b` local model and a portable Ollama runtime. It is not approved by the organisers. Small local models can get facts or language wrong, and even the checks cannot guarantee correctness; review results and use template mode for the demo if the output is unreliable. Set `LLM_MODEL` before `npm run dev:ai` to change the model. The candidate and runtime are local-only and are not included when the repository is shared; set up Ollama and pull a model separately on another computer. See `scripts/start-local-ai.ps1` for the model setting and future approval comment.

Local evaluation on 29 October 2026: `qwen:1.8b` generated responses for all eight cases, but 0/8 passed the finding and number checks, so all displayed the deterministic template. `qwen:0.5b` also passed 0/8 after the checks were tightened. This makes both models useful for testing the integration and fallback, but unsuitable for model-written demo explanations. The checks are heuristic; passing them would not itself establish factual accuracy. Evaluate a more capable, organiser-approved model before presenting model-written text.


## In-memory backend

The local helper serves fictional agreements and handles confirmed simulated actions, audit entries, simulation and reset through /api/demo. It also returns computed predictions and flags; the existing dashboard still computes its display locally from the shared core. The helper holds one shared demo state for all browser tabs and resets on restart. The demo clock remains in each browser. No database is used. If the helper is unavailable on load, the browser starts an independent offline demo; it does not synchronize offline changes to the helper.

