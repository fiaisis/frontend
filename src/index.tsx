import ReactDOMLegacy from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import React from 'react';
import './index.css';
import App from './App';
import singleSpaReact from 'single-spa-react';
import * as log from 'loglevel';
import { createRoute } from './routes';
import { createWebsocketClient } from './websocket';

if (import.meta.env.DEV) {
  const el = document.getElementById('fia');
  if (el) {
    ReactDOMClient.createRoot(el).render(<App />);
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

const reactDomForSingleSpa = Object.assign({}, ReactDOMLegacy, ReactDOMClient) as typeof ReactDOMLegacy;

const reactLifecycles = singleSpaReact({
  React,
  ReactDOM: reactDomForSingleSpa,
  renderType: 'createRoot',
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

// Create route registration events being fired back to the parent
// Args:
// 1. What section of the menu route will appear under
// 2. Text of the link
// 3. Route to link to
// 4. How high up in the section should your link be - ascending order
// 5. Help text renders a tooltip in the site tour for this link
// 6. Whether the link should be visible to unauthenticated users
createRoute('Browse', 'Home page', '/fia', 1, '', false);
createRoute('Browse', 'Instruments', '/fia/instruments', 2, 'Click here to see a list of all Instruments.', false);
createRoute(
  'Browse',
  'Reduction history',
  '/fia/reduction-history',
  3,
  'Click here to see a list of all reductions.',
  false
);
createRoute(
  'Viewers',
  'Expriment viewer',
  '/fia/experiment-viewer',
  4,
  'View and visualize HDF5 data files from reduction jobs.',
  false
);
createRoute(
  'Viewers',
  'Live Data',
  '/fia/live-data',
  5,
  'View live data from instruments in real-time.',
  false
);
createRoute('Viewers', 'IMAT viewer', '/fia/reduction-history/IMAT', 6, 'Latest IMAT image', false);

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
