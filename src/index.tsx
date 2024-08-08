import ReactDOM from 'react-dom';
import React from 'react';
import './index.css';
import App from './App';
import singleSpaReact from 'single-spa-react';
import * as log from 'loglevel';
import { createRoute } from './routes';
import { createWebsocketClient } from './websocket';

if (process.env.NODE_ENV === `development`) {
  const el = document.getElementById('fia');
  if (el) {
    ReactDOM.render(<App />, document.getElementById('fia'));
  }
  log.setDefaultLevel(log.levels.DEBUG);
} else {
  log.setDefaultLevel(log.levels.ERROR);
}

function domElementGetter(): HTMLElement {
  // Make sure there is a div for us to render into
  let el = document.getElementById('fia');
  if (!el) {
    el = document.createElement('div');
  }
  return el;
}

// Create WebSocket client to respond to listen for pushed notifications
createWebsocketClient('ws://localhost:3210/');

const reactLifecycles = singleSpaReact({
  React,
  ReactDOM,
  renderType: 'render',
  rootComponent: App,
  domElementGetter,
  errorBoundary: (error): React.ReactElement => {
    log.error(`fia failed with error: ${error}`);

    return (
      <div className="error">
        <div
          style={{
            padding: 20,
            background: 'red',
            color: 'white',
            margin: 5,
          }}
        >
          Something went wrong...
        </div>
      </div>
    );
  },
});

// Route registration events being fired back to the parent
createRoute(
  'Reductions', // what section of the menu you want the link to be in
  'Home page', // text of the link
  '/fia', // route the link should link to
  1, // how high up in the section should your link be - ascending order
  'Data help text', // help text renders a tooltip in the site tour for this link
  false // whether the link should be visible to unauthenticated users
);
createRoute('Reductions', 'Instruments', '/fia/instruments', 2, 'Data help text', false);
createRoute('Reductions', 'Reduction history', '/fia/reduction-history/all', 3, 'Data help text', false);

// Single-SPA bootstrap methods have no idea what type of inputs may be
// pushed down from the parent app
export function bootstrap(props: unknown): Promise<void> {
  return reactLifecycles
    .bootstrap(props)
    .then(() => {
      log.info('fia has been successfully bootstrapped');
    })
    .catch((error: unknown) => {
      log.error('fia failed whilst bootstrapping: ' + error);
    });
}

export function mount(props: unknown): Promise<void> {
  return reactLifecycles
    .mount(props)
    .then(() => {
      log.info('fia has been successfully mounted');
    })
    .catch((error: unknown) => {
      log.error('fia failed whilst mounting: ' + error);
    });
}

export function unmount(props: unknown): Promise<void> {
  return reactLifecycles
    .unmount(props)
    .then(() => {
      log.info('fia has been successfully unmounted');
    })
    .catch((error: unknown) => {
      log.error('fia failed whilst unmounting: ' + error);
    });
}
