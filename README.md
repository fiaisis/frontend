# Flexible Interactive Automation frontend

This repository is for the frontend web application side of [FIA](https://github.com/fiaisis) that allows users to view and manage runs and reductions performed by ISIS instruments. The frontend acts as a plugin for the [SciGateway](https://github.com/ral-facilities/scigateway) application and was made using Yarn, React, Typescript, and Material-UI. The project is in the early stages of development and is continuously being worked on.

## Starting development

### Downloading prerequisites

To get started developing for the frontend, first you will need to have [Node.js](https://nodejs.org/en/download/package-manager) and [Yarn](https://classic.yarnpkg.com/en/docs/install) installed on your machine. You will then want to clone the SciGateway repository. From now on stick to SciGateway's `develop` branch (which is the default branch) and pull from it regularly to keep up to date with changes.

### Downloading the frontend

With that done, you can now clone the FIA frontend repository. The frontend works by building the project and then running it through SciGateway as a plugin. To get this set-up you will want to create a `settings.json` file in SciGateway's public folder. Do this by simply duplicating [`settings.example.json`](https://github.com/ral-facilities/scigateway/blob/develop/public/settings.example.json), renaming it, then adding FIA as a plugin with what port to listen on:

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
{
  "plugins": [
    {
      "type": "static",
      "location": "C:\\[path]\\[to]\\[frontend\\[build]\\[folder]",
      "port": 5001
    }
  ]
}
```

You will also want to delete the contents of SciGateway's [`res`](https://github.com/ral-facilities/scigateway/tree/develop/public/res) folder and copy over the contents from this repository's [`container`](https://github.com/fiaisis/frontend/tree/main/container) folder. This is mainly to overwrite [`default.json`](https://github.com/ral-facilities/scigateway/blob/develop/public/res/default.json) which deals with information within the footer and help page.

## Available scripts

In the project directory, you can run:

### `yarn install`

Installs the necessary dependencies for the project. You will need to run this command before running the project for the first time or after adding new dependencies to the project.

### `yarn start`

Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits. You will also see any lint errors in the console.

### `yarn build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance. The build is minified and the filenames include the hashes.

You can then open a terminal in SciGateway and have it act as a parent application for running the frontend. Assuming the relevant files have been set-up correctly you only need to do `yarn start` and the FIA frontend will be running on [http://localhost:3000/fia](http://localhost:3000/fia).

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

### `yarn cypress open`

Opens the Cypress Test Runner. This provides a graphical display for running end-to-end and component tests within a browser.

### `yarn cypress run`

Runs Cypress tests headlessly in the terminal. This is useful for running tests in a CI/CD pipeline (currently there are no e2e spec files so shouldn't do anything).

## Package issues

When adding new depencies to [`package.json`](https://github.com/fiaisis/frontend/blob/main/package.json) or switching between branches with different dependencies, you will need to run `yarn install` to update the `node_modules` folder.

Occassionally there are issues with package conflicts that require `node_modules` and `yarn.lock` to be deleted and the cache cleared. You can do this with the following command:

```bash
$ rm -rf node_modules && yarn cache clean && rm -f yarn.lock && yarn install
```

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
