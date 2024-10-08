# Flexible Interactive Automation frontend

This repository is for the frontend web application side of [FIA](https://github.com/fiaisis) which has been using Yarn, React, Typescript, Material-UI and serves as a plugin for [SciGateway](https://github.com/ral-facilities/scigateway). The application allows for users to view and manage runs and reductions performed by ISIS instruments.

FIA is in the early stages of development and is continuously being worked on.

## Starting development

### Downloading the code

To get started developing for the frontend, first you will need to have [Node.js](https://nodejs.org/en/download/package-manager) and [Yarn](https://classic.yarnpkg.com/en/docs/install) installed and set-up on your machine. When following the install wizards just keep to default settings. You will then want to clone the [SciGateway](https://github.com/ral-facilities/scigateway) repository. From now on stick to SciGateway's `develop` branch (which is the default) and pull from it regularly to keep up to date with changes.

With that done, you can now clone the FIA frontend repository.

### Setting up FIA as a plugin

The frontend works by building the project and then running it through SciGateway as a plugin. To get started developing locally, you will want to create a `settings.json` file in SciGateway's `public` folder. Do this by simply duplicating [`settings.example.json`](https://github.com/ral-facilities/scigateway/blob/develop/public/settings.example.json), renaming it, then adding FIA as a plugin with what port to listen on:

```json
// settings.json
"plugins": [
    {
        "name": "fia",
        "src": "http://localhost:5001/main.js",
        "enable": true,
        "location": "main"
    }
]
```

A `dev-plugin-settings.json` file is also needed in SciGateway's `micro-frontend-tools` folder. Like before, simply duplicate [`dev-plugin-settings.example.json`](https://github.com/ral-facilities/scigateway/blob/develop/micro-frontend-tools/dev-plugin-settings.example.json), rename it, and add the path to the FIA frontend build folder:

```json
// dev-plugin-settings.json
"plugins": [
    {
      "type": "static",
      "location": "C:\\[path]\\[to]\\[frontend\\[build]\\[folder]",
      "port": 5001
    }
]
```

### Specifying environment variables

Unless you have a working API and data-viewer set-up locally you will want the frontend to point to the ones in staging which require your machine to be on the company VPN. The URLs for the `REST_API` and `DATA_VIEWER` are found in [`.env`](https://github.com/fiaisis/frontend/blob/main/.env).

## Running the frontend for the first time

Assuming all the previous steps have been completed, you can now use these commands in the terminal to get the web application running.

### `yarn install`

Installs the necessary dependencies for the project. You will also need to run this after adding new dependencies or switching to branches with a modified [`package.json`](https://github.com/fiaisis/frontend/blob/main/package.json) file.

### `yarn build`

Builds the app for production. You will need to do this every time the frontend changes as the `build` folder isn't tracked by Git and SciGateway uses this folder to display the frontend.

### `yarn start`

You can now open a terminal in SciGateway and have it act as a parent application for running the frontend. You only need to run `yarn start` and the FIA frontend will be running on http://localhost:3000/fia.

If you're testing changes that don't strictly need SciGateway, the API, or the data-viewer, you can run the frontend on its own by running `yarn start` in the frontend directory. This will also be running on http://localhost:3000/fia.

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

As an alternative to testing using containers, you can replace the contents of SciGateway's [`res`](https://github.com/ral-facilities/scigateway/tree/develop/public/res) folder with the frontend's [`default.json`](https://github.com/fiaisis/frontend/blob/main/container/default.json) file and [`images`](https://github.com/fiaisis/frontend/tree/main/container/images) folder. This will allow you to see the changes made by running `yarn start`.

<span style="color:red">BEWARE:</span> this can give false positives. And do not push changes to SciGateway.

## Package issues

When adding new depencies to [`package.json`](https://github.com/fiaisis/frontend/blob/main/package.json) or switching between branches with different dependencies, you will need to run `yarn install` to update the `node_modules` folder.

Occassionally there are issues with package conflicts that require `node_modules` and `yarn.lock` to be deleted and the cache cleared. You can do this with the following command:

```bash
rm -rf node_modules && yarn cache clean && rm -f yarn.lock && yarn install
```

## Writing browser tests

The FIA frontend makes use of [Cypress](https://www.cypress.io/) for conducting end-to-end and component testing. These tests will be ran by a [workflow](https://github.com/fiaisis/frontend/blob/main/.github/workflows/cypress_tests.yml) whenever a commit is pushed or a pull request merged. The tests can also be ran locally.

For writing your own tests, follow the guide [here](https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test). Alternatively you can replicate the methods used in pre-existing `.cy.tsx` files, like the [home page](https://github.com/fiaisis/frontend/blob/main/cypress/component/HomePage.cy.tsx).

## Additional scripts

Here are a few other scripts to be aware of:

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

### `yarn cypress open`

Opens the Cypress Test Runner. This provides a graphical display for running end-to-end and component tests within a browser.

### `yarn cypress run`

Runs Cypress tests headlessly in the terminal. This is useful for running tests in a CI/CD pipeline (currently there are no e2e spec files so shouldn't do anything).

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
