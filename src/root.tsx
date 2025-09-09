import React from 'react';
import ReactDOM from 'react-dom';
import singleSpaReact from 'single-spa-react';
import App from './App';

// Single-spa lifecycles for React 17
const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err, info, props) {
    return <div style={{ padding: 16 }}>Plugin error</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
