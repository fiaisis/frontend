# AGENTS.md

Guidance for coding agents working in this repository.

## What this repo is

`frontend` is the React/TypeScript/Vite micro-frontend plugin for the Flexible Interactive
Automation (FIA) system (see `README.md`). It is built as an IIFE bundle (`build/main.js`) that
exposes `window.fia`, and is loaded as a plugin by `scigateway`'s micro-frontend host shell at
runtime — it is **not** a standalone deployable web app on its own. It lets users browse and manage
instrument runs/reductions, view NeXus/HDF5 data (via the `h5web` git submodule), view IMAT image
stacks, and view live-reduction logs/plots.

## Position in the FIA service

### Overarching FIA architecture

FIA is a multi-repository system (all checked out as siblings under the same parent workspace
directory) that automatically reduces instrument data, and also lets users browse, plot, and rerun
that data interactively:

```text
[ISIS Instrument Archive (/archive, /imat) & lastrun.txt]
        │
        ▼
  file-watcher (Kopf Operator + Per-Instrument Watcher Pods)
        │  publishes file path to RabbitMQ: `watched-files`
        ▼
  run-detection ◄──── fetches instrument rules (`GET /instrument/{inst}/specification`) ────► FIA-API
        │  ingests .nxs metadata, verifies rules, publishes JobRequest JSON
        │  to RabbitMQ: `scheduled-jobs` (or retries via `failed-watched-files`)
        ▼
  jobcontroller (job_creator) ◄──── requests PreScript (`GET /script/{inst}`) & posts Job ──► FIA-API ◄──► autoreduction-scripts
        │  spawns Kubernetes Job in cluster:
        ├──► Main container: runners (`ghcr.io/fiaisis/mantid` or `mantid-imaging`) -> writes reduced data to `/ceph`
        └──► Sidecar container: jobcontroller (job_watcher) -> updates job status/outputs in FIA-API (`PATCH /job/{id}`)

[Interactive / Web & Live Data Paths]
  scigateway (Host App) ──► frontend (THIS REPO) (FIA React Plugin)
                                ├──► fia-auth (UOWS login, JWT verify/refresh, `/experiments` RB lookup)
                                ├──► FIA-API (runs, jobs, scripts, specifications, reruns -> `watched-files` / `scheduled-jobs`)
                                └──► plotting-service (h5grove NeXus/HDF5 & IMAT image serving from `/ceph` & `/imat`)

  Kafka (`<INST>_events`, `<INST>_sampleEnv`, `<INST>_runInfo`)
        └──► live-data (Live Data Operator + Mantid Live Data Processor fetching `/live-data/{inst}/script` from FIA-API)

  LLSP (Long Lived Script Processors: `LLSP-API` + RabbitMQ + Celery `LLSP-Worker` built on `ghcr.io/fiaisis/mantid`)

[Infrastructure & Deployment]
  k8s (Terraform + Ansible for OpenStack clusters, Redpanda, local Minikube)
  gitops (ArgoCD App-of-Apps & Kustomize `base`/`envs`/`variants` manifests for all FIA services)
```

### This repository's location (upstream, downstream & siblings)

- **Role**: The only user-facing web UI in FIA; everything else in the system exists to produce
  data or answer API calls this plugin makes on the user's behalf.
- **Hosted by**: `scigateway` (`../scigateway`, upstream `ral-facilities/scigateway`) — the
  micro-frontend shell application. **Do not develop inside `../scigateway` itself**; this repo's
  `container/` directory (below) is the sanctioned place to customize scigateway's *deployed*
  appearance for FIA.
- **Downstream callees (what `frontend` calls)**, all via `src/lib/` API clients:
  - `FIA-API` (`../FIA-API`) — runs, jobs, scripts, specifications, and rerun/resubmit requests, at
    `VITE_FIA_REST_API_URL` (proxied to `/api` in dev).
  - `plotting-service` (`../plotting-service`) — H5Web/NeXus data, IMAT image stacks, and live-data
    SSE streams, at `VITE_FIA_PLOTTING_API_URL` (proxied to `/plottingapi` in dev).
  - `fia-auth` (`../fia-auth`) — indirectly: authentication itself is owned by `scigateway`/`fia-auth`
    (`authUrl` in SciGateway's `settings.json`), and this plugin only reads the resulting
    `scigateway:token` from `localStorage` (see "Auth & API client conventions" below).
- **Sibling repositories to check when changing contracts**: `../FIA-API` (REST response shapes
  consumed by `src/lib/api.ts` and page components), `../plotting-service`
  (`src/lib/plottingServiceAPI.ts`, `src/lib/useLiveDataSSE.ts`), `../fia-auth` /
  `../scigateway` (auth token storage key and refresh event contract), and `../gitops`
  (`components/frontend/` and `components/scigateway/` deployment manifests).

### Core technologies
- **React 18** + **TypeScript** + **Vite**: SPA framework, language, and build tool (see
  `package.json` / `vite.config.ts` for exact pinned versions — do not hardcode versions here).
- **MUI** (`@mui/material`, `@mui/icons-material`, `@mui/system`, `@mui/x-date-pickers`): the sole
  component library. The legacy `@material-ui/core`/`@material-ui/icons` (MUI v4) packages have been
  removed from `package.json` (they were unused dependencies) — do not reintroduce them.
- **h5web** (`src/h5web/`, a **git submodule** pinned to a specific branch/tag — see
  `src/.gitmodules`): low-level HDF5/NeXus viewer components, aliased in `vite.config.ts` so the
  `@h5web/*` npm packages' supporting code is used alongside the submodule's source for internal
  viewer components.
- **Monaco Editor** (`@monaco-editor/react`, `react-monaco-editor`): embedded script editor.
- **i18next** / **react-i18next**: internationalization.
- **Axios**: HTTP client (`src/lib/api.ts`).
- **Vitest** (not Jest, despite `@types/jest` and `setupTests.ts` lingering in the tree — see
  "Testing" below): unit/component test runner, configured in `vitest.config.ts`.
- **Cypress**: component and E2E browser testing.
- **ESLint** + **Prettier** + **Husky** + **lint-staged**: linting, formatting, and pre-commit hooks.

---

## Repository structure

```
src/                          Application source
  components/                 Reusable UI components (config settings drawer, data viewer, IMAT
                               stack viewer, experiment viewer, job table, navigation, etc.)
  pages/                      Top-level routed pages (Homepage, Instruments, Jobs, DataViewer,
                               ExperimentViewer, IMATViewer, LiveData, ValueEditor, LiveValueEditor,
                               PageChrome)
  lib/                        API clients and hooks (FIA-API and plotting-service Axios clients,
                               SciGateway auth-token wiring, live-data SSE / live-log hooks,
                               instrument metadata/support)
  h5web/                      Git submodule (silx-kit/h5web) providing low-level HDF5/NeXus viewer
                               internals aliased in `vite.config.ts`
  images/                     Per-instrument images used on the Instruments page
  (top-level files)           App shell, routing, global styles, and the micro-frontend entrypoint
                               that registers `window.fia` via single-spa-react

cypress/                      Cypress test suite
  component/                  Component tests (Vite dev server)
  e2e/                        End-to-end tests (run against a live `yarn start` dev server)
  fixtures/                   Binary/data fixtures for viewer tests

server/                       Standalone Node/Express server (`yarn serve:backend`)
container/                    Deployment assets for two separate images — one Dockerfile that builds
                               and serves this plugin via nginx (`ghcr.io/fiaisis/frontend`), and a
                               second Dockerfile + JSON/HTML/image overrides that layer FIA branding,
                               help pages, and default plugin settings onto the upstream SciGateway
                               host image (`ghcr.io/fiaisis/scigateway`); see "Container images"
                               below before touching this directory
.github/workflows/            CI workflows: build & unit tests, Cypress tests, container build/push,
                               scorecard, and Trivy scanning
Root config files             `package.json` (source of truth for dependencies, scripts, Yarn pin,
                               and Node `engines` range) plus Vite, Vitest, and Cypress configs
```

---

## `package.json` — read this first

`package.json` is the single source of truth for dependencies, scripts, and the required Node/Yarn
versions. Read it before adding dependencies or changing build/test/lint commands:

- `engines.node` constrains the supported Node.js version range — check it (not this document)
  before assuming a Node version.
- `packageManager` pins an exact Yarn (Classic, v1) version; use `yarn`, not `npm`, for all
  dependency management (`yarn install --immutable` in CI, matching `.github/workflows/`).
- The `scripts` block is the authoritative list of available commands (`start`/`dev`, `build`,
  `build:standalone`, `test`, `cypress:*`, `lint:js`, `format`, etc.) — prefer running these over
  invoking the underlying tools (`vite`, `vitest`, `cypress`, `eslint`) directly with ad hoc flags.
- `react-scripts`, the CRA-era `eslintConfig: { extends: "react-app" }` block, the `"eject"` script,
  and `src/react-app-env.d.ts` have been removed as unused leftovers from before the Vite migration
  — the actual build/dev/test tooling is Vite + Vitest + the `lint:js` ESLint invocation (config in
  `.eslintrc.js`), not CRA. Don't reintroduce CRA-specific tooling or assume CRA behavior.
- `resolutions` pins `@types/react` and the TypeScript ESLint packages — be aware of these when
  debugging version-mismatch dependency issues.
- As with `pyproject.toml` in the Python FIA repos, `package.json` is the single source of truth for
  dependency versions and which packages are actually included — do not hardcode package versions in
  this document (the `h5web` git submodule is the one exception: its version is tracked via
  `src/.gitmodules`, not `package.json`).

---

## Setup: submodule, Node, and dependencies

This repo embeds `h5web` as a **git submodule** at `src/h5web`, pinned to a specific branch/tag in
`src/.gitmodules`. Submodule contents must be present before `yarn install`/`yarn build` will work.

1. **Clone with submodules** (or initialize them afterwards):
   ```shell
   git clone --recurse-submodules https://github.com/fiaisis/frontend.git
   # or, in an existing checkout:
   git submodule update --init --recursive
   ```
2. **Install dependencies** (matches CI's `yarn install --immutable`):
   ```shell
   yarn install
   ```
3. Do not assume `node_modules`/`yarn.lock` are in a good state across branch switches — if you hit
   odd dependency/type errors after switching branches, per `README.md`:
   ```shell
   rm -rf node_modules && yarn cache clean && rm -f yarn.lock && yarn install
   ```

### Running the FIA plugin standalone vs. inside SciGateway

#### Mode 1: Standalone dev server (`http://localhost:3000`, no SciGateway)
```shell
yarn start
```
In dev mode, Vite proxies `/api`, `/auth`, `/plottingapi`, and `/data-viewer` to
`https://dev.reduce.isis.cclrc.ac.uk` (see `vite.config.ts`) unless you point those services at
something else — this requires site VPN access for the proxied dev backend.

#### Mode 2: Running FIA inside the `scigateway` host application

1. **Locate or clone `scigateway`**:
   - Check whether `scigateway` is already present at the same directory level (`../scigateway`).
   - If `../scigateway` does not exist, search for an existing checkout or **ask the user** where
     `scigateway` lives (or confirm before cloning it into `../scigateway`):
     ```shell
     git clone https://github.com/ral-facilities/scigateway.git ../scigateway
     ```
2. **Apply the required local (gitignored) configuration in `scigateway`**:
   `scigateway` requires two gitignored JSON files copied and modified from their tracked
   `*.example.json` counterparts (you can inspect existing local changes at any time with
   `git -C ../scigateway status --ignored` and `diff -u` against the `.example.json` files):
   - **`../scigateway/public/settings.json`** (copied from `public/settings.example.json`):
     Replace the `demo_plugin` entry in `"plugins"` and point `"authUrl"` at the FIA dev auth
     service (optionally adding `"homepageUrl": "/fia"`):
     ```json
     "plugins": [
       {
         "name": "fia",
         "src": "http://localhost:5001/main.js",
         "enable": true,
         "location": "main"
       }
     ],
     "ui-strings": "res/default.json",
     "auth-provider": "jwt",
     "authUrl": "https://dev.reduce.isis.cclrc.ac.uk/auth",
     ```
   - **`../scigateway/micro-frontend-tools/dev-plugin-settings.json`** (copied from
     `micro-frontend-tools/dev-plugin-settings.example.json`):
     Point the static plugin server on port `5001` to the absolute path of this repo's `build/`
     directory:
     ```json
     {
       "plugins": [
         {
           "type": "static",
           "location": "/absolute/path/to/frontend/build",
           "port": 5001
         }
       ]
     }
     ```
3. **Install `scigateway` dependencies (first time only)**:
   ```shell
   cd ../scigateway && yarn install
   ```
   *(This also runs `scigateway`'s `postinstall` hook `yarn copy-cdn-fallbacks`, which copies
   `react.production.min.js` and `react-dom.production.min.js` into `public/` so externals resolve.)*
4. **Build `frontend` and launch `scigateway`**:
   - From this repo (`frontend`), you can build and launch `../scigateway` in one step:
     ```shell
     yarn run-frontend   # runs: yarn build && cd ../scigateway && yarn dev
     ```
   - Or run the steps separately:
     ```shell
     yarn build
     cd ../scigateway && yarn dev
     ```
     `yarn dev` in `scigateway` uses `concurrently` to start `yarn serve:plugins` (serving
     `frontend/build/main.js` on `http://localhost:5001/main.js`), `node server/auth-server.js`, and
     the SciGateway Vite host on `http://localhost:3000`.
   - Whenever you modify code in `frontend`, re-run `yarn build` so `build/main.js` updates (on
     Windows, stop `scigateway` before rebuilding if `serve:plugins` locks files in `build/`).
   - Note: `yarn build:standalone` additionally bundles React/ReactDOM into `build/main.js` for
     hosts that do not provide them as externals (the default `yarn build` treats `react` and
     `react-dom` as externals provided by `scigateway`).

### Environment variables (`VITE_*`)
Read via `import.meta.env` and documented in `.env` (not readable by this agent due to sandbox
policy — treat `.env` and `README.md` as the source of truth, and re-verify directly if unsure):
- `VITE_FIA_REST_API_URL` — base URL for `FIA-API` calls in `src/lib/api.ts` / `useLiveLogs.ts`
  (proxied to `/api` in dev via `isDev`).
- `VITE_FIA_PLOTTING_API_URL` — base URL for `plotting-service` calls in `src/lib/api.ts`,
  `plottingServiceAPI.ts`, `useLiveDataSSE.ts`, and `pages/DataViewer.tsx` (proxied to
  `/plottingapi` in dev).
- `VITE_DEV_MODE` — when `"true"`, forces the same dev-proxy/no-auth code paths as Vite's own `DEV`
  flag (`isDev` in `src/lib/api.ts`, `useLiveDataSSE.ts`, `useLiveLogs.ts`).
- `VITE_H5GROVE_BATCH_SIZE` — batch size for H5Grove dataset fetches in `plottingServiceAPI.ts`
  (defaults to `50` if unset/invalid).
- `VITE_PLUGIN_URL` — not referenced in `src/`, but is consumed by `scigateway` (`../scigateway`)
  for certain asset URLs when hosting this plugin; keep it defined in
  `container/frontend.dockerfile` even though this repo's own code doesn't read it directly.
  (`VITE_FIA_DATA_VIEWER_URL` was a stale, unused env var and has been removed from
  `container/frontend.dockerfile` and `README.md`.)
- In production (`container/frontend.dockerfile`), `VITE_*` values are baked in as Vite **build-time**
  envs — changing one requires rebuilding the Docker image, not just restarting the container.

---

## Auth & API client conventions (`src/lib/api.ts`)

- The access token is **not** owned by this repo: it is read from `localStorage.getItem('scigateway:token')`
  and attached as `Authorization: Bearer <token>` on every `fiaApi`/`h5Api` request (skipped in dev
  mode, where the dev proxy handles auth).
- On a `403` response, the request is queued and a `scigateway` custom DOM event
  (`detail.type === 'scigateway:api:invalidate_token'`) is dispatched to ask the SciGateway host to
  refresh the token; `retryFailedAuthRequests()` / `clearFailedAuthRequestsQueue()` are the
  corresponding hooks SciGateway is expected to call back into. Preserve this contract exactly if
  you touch auth/interceptor code — it is the one concrete coupling point with `../scigateway` and
  `../fia-auth`'s refresh flow.

## Container images — two separate, differently-triggered builds

`.github/workflows/build-push-action.yml` builds **two independent images** from this repo, and
only one of them is "this plugin":

1. **`ghcr.io/fiaisis/frontend`** (`container/frontend.dockerfile`) — always built on every push to
   `main`. This is the actual FIA plugin bundle served by nginx.
2. **`ghcr.io/fiaisis/scigateway`** (`container/scigateway.dockerfile`) — only rebuilt when specific
   paths change (`container/scigateway.dockerfile`, `container/settings.json`,
   `container/default.json`, `container/images/**`, `container/favicon.ico`, `container/index.html`,
   checked via `dorny/paths-filter`). This image layers FIA's branding/default settings/help pages
   on top of the **upstream** SciGateway application — it does **not** contain this repo's own
   plugin code, and editing it is **not** the same as developing inside `../scigateway`'s own
   source (which `README.md` explicitly warns against). Only touch these `container/` files when
   asked to change SciGateway's *deployed configuration/branding* for FIA, not its behavior.

Both images, once built, have their staging manifests (`components/frontend/` and
`components/scigateway/`) automatically updated in `../gitops` by this workflow.

---

## Testing

- **Unit/component tests run under Vitest, not Jest** (`vitest.config.ts` merges `vite.config.ts`
  and sets `environment: 'jsdom'`, `setupFiles: ['./src/setupTests.js']`). `src/setupTests.ts`
  (TypeScript, near-identical content) appears to be an unused leftover — the configured entrypoint
  is `setupTests.js`. `@types/jest` is present as a dependency but is not the active test runner.
  ```shell
  yarn test            # vitest run --coverage
  yarn test:watch      # vitest (watch mode)
  ```
  Coverage excludes `src/h5web/**`, `cypress/**`, and a handful of entrypoint/setup files — see
  `vitest.config.ts` for the exact list before assuming a file should/shouldn't be covered.
- **Cypress component tests** (Vite dev server, no running app needed):
  ```shell
  yarn cypress:run:component
  ```
- **Cypress E2E tests** (require a running dev server at `http://127.0.0.1:3000`, matching
  `cypress.config.ts`'s `baseUrl`; CI starts one via `yarn start --host 127.0.0.1 --port 3000 --strictPort`):
  ```shell
  yarn start &   # or let `cypress-io/github-action`'s `start`/`wait-on` handle this in CI
  yarn cypress:run:e2e
  ```
  E2E specs stub backend responses with `cy.intercept(...)` (per `README.md`) rather than requiring
  live SciGateway-backed auth, so they don't need `VITE_FIA_REST_API_URL`/auth to be real.
- **Build verification**: CI's `yarn_build.yml` also runs `yarn build` and `yarn test --passWithNoTests`
  on every push — a change that breaks the production build is a CI failure even if tests pass.

## Requirements for code changes

Only run tests, linters, and builds when they are **relevant to the files you actually changed** —
if a change only touches documentation (e.g. `.md` files), skip `yarn test`, `yarn lint:js`,
`yarn build`, and Cypress. When you do change TypeScript/JavaScript source, `package.json`, or
configuration, before considering the change complete:
1. **Add or update unit/component tests** (Vitest `*.test.{ts,tsx}` alongside the file you changed,
   or a Cypress component spec under `cypress/component/`) for any new or changed behavior.
2. **Add or update Cypress E2E specs** under `cypress/e2e/` when the change affects a user-facing
   flow that suite already exercises (stub backend calls with `cy.intercept(...)` as existing specs
   do).
3. **Run the linter and build** (`yarn lint:js`, `yarn format:check`, `yarn build`) and fix
   everything reported — there is no CI bot that auto-commits formatting fixes for this repo, unlike
   the Python services.
4. **Run the full test suite with coverage** (`yarn test`) and confirm coverage has not regressed
   compared to `main` (CI uploads `coverage/lcov.info` to Codecov; locally, compare the terminal
   coverage table `yarn test` prints before and after your change). Also run the Cypress component
   and E2E suites (`yarn cypress:run:component`, `yarn cypress:run:e2e`) for UI-affecting changes.

---

## The `h5web` submodule & related Dependabot constraints

- `src/h5web` is pinned to a specific branch/tag in `src/.gitmodules` — bumping it is a **manual,
  coordinated** action (update the submodule pointer *and* the `@h5web/*` npm package versions in
  `package.json` together, then validate the viewer still works), not something Dependabot should
  do alone.
- `.github/dependabot.yml` reflects this explicitly: it **ignores** `*react*` packages, `@h5web/*`
  packages, and `three` versions `>=0.183.0` (the bundled H5Web zoom implementation depends on
  camera-scaling behavior removed in Three.js r183). Any Dependabot PR attempting one of these
  updates should **not** be approved/merged through the normal playbook below — close it or flag it
  for manual, validated coordination with the submodule/React version instead.

## Managing issues

This repo has no local `.github/ISSUE_TEMPLATE/`; GitHub serves the org-wide default template from
`fiaisis/.github` instead. Always use it rather than inventing an ad hoc issue format:

```shell
gh issue create --template Issue
```

Check `gh issue list` / `gh issue view <number>` first to avoid duplicates.

## Branch naming

Branches use `snake_case` descriptions of the work being done, without category prefixes like
`feature/` or `fix/` — the same convention used across the rest of the FIA organization. (Recent
`main` history also shows some `kebab-case`/slash-style branch names, e.g.
`fix-nested-specification-rendering`, `fix/reduction-viewer-shortcut`; follow the `snake_case`,
 no-prefix convention for new work regardless.)

## Commit messages

`main`'s history (`git log --oneline main`) is predominantly **squash merges**: one commit per PR,
titled `<PR title> (#<PR number>)`, e.g. `Fix plugin height issue (#813)`. This has two practical
consequences:

- **The PR title is what actually survives into permanent history.** Individual commits on a working
  branch are squashed on merge, so getting the PR title right (see "Pull request process" below)
  matters more than crafting a commit-by-commit history.
- **Individual commit messages still matter for review and for the squash commit body.** By default,
  GitHub's squash merge concatenates every commit subject on the branch into the squashed commit's
  body. Write each commit as a focused, reviewable unit of work with a clear, imperative-mood
  summary line — avoid noise like `wip` or `fix` that would leak into the squashed body. Leave
  auto-generated Dependabot commit messages as-is.

## Pull request process

1. **Local validation** before opening a PR (when source, config, or `package.json` files are
   changed; skip for `.md`-only changes):
   ```shell
   yarn install
   yarn build
   yarn test --passWithNoTests
   yarn lint:js
   yarn cypress:run:component
   yarn cypress:run:e2e   # requires a running `yarn start` dev server
   ```
   This matches the checks CI runs across `yarn_build.yml` and `cypress_tests.yml`. There is no
   formatting/linting bot auto-committing fixes for this repo (unlike the Python services); run
   `yarn format` / `yarn lint:js` yourself before pushing.
2. **PR title**: a clear, concise description in normal grammar/sentence case (e.g. `Fix plugin
   height issue`, `Add more icon to reduction outputs`). Do not use `snake_case` for PR titles.
3. **PR description**: use the org-wide default template from `fiaisis/.github`
   (`.github/pull_request_template.md` — no local override in this repo), which is just
   `Closes # <Issue Number>` followed by a `## Description` section. Ask the user for the issue
   number if one isn't evident from the task, or confirm there is none to link.
4. **AI-assistance label**: attach a label to the PR indicating that it was made with the assistance
   of AI. Check existing labels first with `gh label list` (e.g. `AI` or `AI_code` in this org) and
   apply the matching label via `gh pr create --label <label>` or
   `gh pr edit <number> --add-label <label>`; if the repo does not have an AI label yet, create one
   first (`gh label create "AI" --description "Created with the assistance of AI"`).

## Handling Dependabot PRs

Dependabot creates daily PRs grouped as `JS-packages` (npm/yarn, **excluding** `*react*`,
`@h5web/*`, and `three>=0.183.0` — see above), `action-packages` (GitHub Actions), and
`docker-packages` per `.github/dependabot.yml`. When asked to handle these:

1. **List and identify**: `gh pr list` to find open Dependabot PRs.
2. **Review changes**: `gh pr diff <number>`, paying close attention to major version bumps in
   `package.json`, `container/*.dockerfile`, or `.github/workflows/`. Immediately flag (rather than
   fast-track) any PR touching React, `@h5web/*`, or Three.js — these are intentionally excluded
   from automatic Dependabot updates for this repo.
3. **Validate**:
   - JS/dependency changes: `gh pr checkout <number>`, `yarn install`, then `yarn build`,
     `yarn test --passWithNoTests`, `yarn lint:js`, and (if UI-affecting) the Cypress suites.
   - Docker/Action changes: verify CI checks pass with `gh pr checks <number>`.
4. **Approve and merge** once validation passes:
   ```shell
   gh pr review <number> --approve
   gh pr merge <number> --merge
   ```
   Use `--admin` if blocked by branch protection (`gh pr merge <number> --merge --admin`).
5. **Clean up**: close redundant/superseded PRs with `gh pr close <number> --delete-branch`.
6. **Final verification**: checkout `main`, pull latest changes, and re-run `yarn build && yarn test`
   to confirm `main` is green.

## Kubernetes commands

Available kubectl contexts vary per machine/operator — always run `kubectl config get-contexts`
first before targeting a cluster. Never rely on the current context; always pass `--context`
explicitly at the **end** of the command:

```shell
kubectl get pods -n fia --context <context-name>
kubectl logs deploy/frontend -n fia --context <context-name>
```

Double- and triple-check the context name before running anything against a production-like cluster.

## General working practices

- Prefer the `read` tool (with `offset`/`limit`) over `sed -n`, `cat`, or similar shell one-liners
  when inspecting file contents, and prefer the `write` and `edit` tools over `bash` (`cat <<EOF`,
  `sed -i`, `echo >`), Python one-liners, or other non-tool-based commands whenever creating or
  modifying files.
- Ask the user a clarifying question whenever a task is ambiguous — especially around: whether a
  change belongs in `container/frontend.dockerfile` (this plugin) vs. `container/scigateway.dockerfile`
  (SciGateway host branding/config — see "Container images" above), whether the `h5web` submodule
  pointer needs bumping alongside `@h5web/*` npm versions, or whether an issue number exists to
  link in a PR — rather than guessing.
- Do not edit files under `../scigateway` itself; this repo's `container/` directory is the
  sanctioned mechanism for customizing the deployed SciGateway host for FIA.
- Keep dependency versions and the `h5web` submodule pointer consistent with the existing pinning
  style in `package.json` / `src/.gitmodules`.

## Keeping this document up to date

If a change you make would make any information in this `AGENTS.md` inaccurate or incomplete —
e.g. a new environment variable, a changed build/test command, a changed `container/` layout or
image-build trigger, a new/renamed CI workflow, an updated Dependabot grouping or ignore list, a new
sibling-repo contract, or an `h5web` submodule bump — update the relevant section of this file as
part of the same change. Treat it the same way you would treat `README.md`: documentation that goes
stale is worse than no documentation, so don't leave it to a future agent or PR to notice the drift.
