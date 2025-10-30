# Flexible Interactive Automation frontend

This repository is for the frontend web application side of [FIA](https://github.com/fiaisis). It uses Yarn, React, TypeScript, Material UI and serves as a plugin for [SciGateway](https://github.com/ral-facilities/scigateway). The application allows users to view and manage runs and reductions performed by ISIS instruments.

## Starting development

This project uses Vite for development and builds.

### Downloading the code

To get started developing for the frontend, first you will need to have [Node.js](https://nodejs.org/en/download/package-manager) and [Yarn](https://classic.yarnpkg.com/en/docs/install) installed and set-up on your machine. When following the install wizards just keep to default settings. You will then want to clone the [SciGateway](https://github.com/ral-facilities/scigateway) repository. From now on stick to SciGateway's `release/v2.0.0` branch (worth noting that `develop` is the repository's default branch instead of "main" or "master").

With that done, you can now clone the FIA frontend repository.

### Setting up FIA as a plugin

The frontend works by building the project and then running it through SciGateway as a plugin. You will want to create a `settings.json` file in SciGateway's `public` folder. Do this by simply duplicating [`settings.example.json`](https://github.com/ral-facilities/scigateway/tree/release/v2.0.0/public/settings.example.json) and renaming it. A few adjustments will need to be made, like adding FIA as a plugin, setting `homeepageUrl` to `"/fia"`, and setting the `authUrl` to `"https://dev.reduce.isis.cclrc.ac.uk/auth"` (or `null` to disable it entirely). Aside from that, keep everything else as is:

```json
// settings.json

"plugins": [
  {
    "name": "fia",
    "src": "http://localhost:5001/main.js",
    "enable": true,
    "location": "main"
  }

  "authUrl": "https://dev.reduce.isis.cclrc.ac.uk/auth",
  "homepageUrl": "/fia",
]
```

A `dev-plugin-settings.json` file is also needed in SciGateway's `micro-frontend-tools` folder. Like before, simply duplicate [`dev-plugin-settings.example.json`](https://github.com/ral-facilities/scigateway/blob/release/v2.0.0/micro-frontend-tools/dev-plugin-settings.example.json), rename it, and add the path to the FIA frontend build folder:

```json
// dev-plugin-settings.json

// Replace [path] and [to] with the actual path
"plugins": [
  {
    "type": "static",
    "location": "C:\\[path]\\[to]\\frontend\\build",
    "port": 5001
  }
]
```

### Specifying environment variables

Unless you have a working API and data viewer set up locally, point the frontend at the staging services (requires site VPN). Vite uses `VITE_*` environment variables. See [`.env`](.env) for examples:

- `VITE_FIA_REST_API_URL`
- `VITE_FIA_DATA_VIEWER_URL`
- `VITE_PLUGIN_URL` (used for certain asset URLs)
- `VITE_DEV_MODE` (optional)

## Running the frontend for the first time

Assuming all the previous steps have been completed, you can now use these commands in the terminal to get the web application running.

### `yarn install`

Installs the necessary dependencies for the project. Run this after adding new dependencies or switching to branches with a modified [`package.json`](package.json).

### `yarn build`

Builds the app with Vite into `build/` for use as a SciGateway plugin. Do this whenever the frontend changes; `build/` is not tracked by Git and SciGateway serves this folder.

Notes:

- The default build expects React and ReactDOM to be provided by the host (externals). If your host does not provide them, use `yarn build:standalone` to bundle React into `build/main.js`.
- On Windows, SciGateway may lock files in `build/` while serving them. Stop SciGateway before rebuilding to avoid `EPERM` errors.

### `yarn start`

Runs the Vite dev server on http://localhost:3000.

- For integration testing inside SciGateway, build with `yarn build` and start SciGateway. The plugin will be available at the route configured in SciGateway (typically `/fia`).
- For quick standalone development (no SciGateway), use http://localhost:3000.

Other useful dev commands:

- `yarn preview`: Serves the built `build/` output for local checks. Do not run this on the same port SciGateway uses (5001) at the same time.
- `yarn serve:build`: Builds and previews on port 5001. Avoid running while SciGateway is serving the static plugin to prevent port conflicts.

## Container files

Certain features of the frontend such as the help page are handled by files in SciGateway which are overwritten during production to display the correct information to users. Files for this purpose are stored in the [`container`](https://github.com/fiaisis/frontend/tree/main/container) folder. Any changes made locally to this folder won't be visible when running the web application using `yarn start`. So to test changes you need to create a container image. To do this we recommend installing and using [Docker](https://www.docker.com/).

#### To build the frontend:

```bash
docker build . -t ghcr.io/fiaisis/frontend -f ./frontend.dockerfile
```

#### To build SciGateway (NOTE: the working directory needs to be in the container folder for this):

```bash
docker build . -t ghcr.io/fiaisis/scigateway -f ./scigateway.dockerfile
```

#### To run the frontend container:

```bash
docker run --rm -it -p 8080:80 ghcr.io/fiaisis/frontend
```

#### To run the SciGateway container (NOTE: without the frontend running on the same local network this will not display the plugin):

```bash
docker run --rm -it -p 8080:80 ghcr.io/fiaisis/scigateway
```

To access the websites made by the above containers navigate to http://localhost:8080.

### Container alternative

As an alternative to testing using containers, you can replace the contents of SciGateway's [`res`](https://github.com/ral-facilities/scigateway/tree/release/v2.0.0/public/res) folder with the frontend's [`default.json`](https://github.com/fiaisis/frontend/blob/main/container/default.json) file and [`images`](https://github.com/fiaisis/frontend/tree/main/container/images) folder. This will allow you to see the changes made by running `yarn start`.

<span style="color:red">BEWARE:</span> this can give false positives. Do not push changes to SciGateway as we do not develop in that repo.

## Package issues

When adding new dependencies to [`package.json`](package.json) or switching between branches with different dependencies, run `yarn install` to update the `node_modules` folder.

Occasionally there are issues with package conflicts that require `node_modules` and `yarn.lock` to be deleted and the cache cleared. You can do this with the following command:

```bash
rm -rf node_modules && yarn cache clean && rm -f yarn.lock && yarn install
```

## Writing browser tests

The FIA frontend uses [Cypress](https://www.cypress.io/) for end-to-end and component testing. These tests run in a [workflow](.github/workflows/cypress_tests.yml) whenever a commit is pushed or a pull request is merged. Tests can also be run locally.

For writing your own tests, follow the guide [here](https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test). Alternatively, replicate the methods used in pre-existing `.cy.tsx` files, like the [home page](cypress/component/HomePage.cy.tsx).

## Additional scripts

Here are a few other scripts to be aware of:

### `yarn cypress open`

Opens the Cypress Test Runner. This provides a graphical display for running end-to-end and component tests within a browser.

### `yarn cypress run`

Runs Cypress tests headlessly in the terminal. This is useful for running tests in a CI/CD pipeline (currently there are no e2e spec files so shouldn't do anything).

### `yarn run-frontend`

Builds the frontend and then navigates to the `SciGateway` folder (assuming it's in an adjacent directory) and runs `yarn start` there. A helper script to quickly get SciGateway running with the latest frontend build without needing two terminal windows open.

## Learn more

Read more:

- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [React documentation](https://react.dev/)
- [Yarn documentation](https://classic.yarnpkg.com/en/docs/)
- [Vite documentation](https://vite.dev/guide/)
- [Material UI documentation](https://mui.com/material-ui/getting-started/overview/)
- [Cypress documentation](https://docs.cypress.io/guides/overview/why-cypress)
- [Docker documentation](https://docs.docker.com/get-started/)
