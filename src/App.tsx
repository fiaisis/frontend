// React components
import React, { FC } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Local data
import Instruments from './Instruments';
import JobsAll from './Jobs/JobsAll';
import JobsGeneral from './Jobs/JobsGeneral';
import HomePage from './HomePage';
import ValueEditor from './ValueEditor';
import GlobalStyles from './GlobalStyles';
import { clearFailedAuthRequestsQueue, retryFailedAuthRequests } from './api';

// Initialize Google Analytics with the given tracking ID
ReactGA.initialize('G-7XJBCP6P75');
// Track the initial page load event
ReactGA.send({ hitType: 'pageview', page: window.location.pathname });

const App: FC = () => {
  // Force update mechanism using React's useReducer hook
  // This is used to trigger a re-render when necessary (e.g. when SciGateway requests it)
  // There is no direct forceUpdate in functional components, so we increment a state variable instead
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceUpdate] = React.useReducer((x) => x + 1, 0);

  function handler(e: Event): void {
    // Handle custom SciGateway events for triggering actions in the app
    const action = (e as CustomEvent).detail;

    // If SciGateway requests a plugin re-render, trigger a re-render
    if ('scigateway:api:plugin_rerender'.match(action)) {
      forceUpdate();
    }

    // If SciGateway invalidates the token, retry failed authentication requests
    if ('scigateway:api:invalidate_token'.match(action)) {
      retryFailedAuthRequests();
    }

    // If SciGateway requests signout, clear the authentication request queue
    if ('scigateway:api:signout'.match(action)) {
      clearFailedAuthRequestsQueue();
    }
  }

  // Attach event listener for SciGateway events when the component mounts
  React.useEffect(() => {
    document.addEventListener('scigateway', handler);

    // Remove event listener when the component unmounts
    return () => {
      document.removeEventListener('scigateway', handler);
    };
  }, []);

  return (
    <GlobalStyles>
      <Router basename="/fia">
        <Switch>
          {/* Define application routes */}
          <Route exact path="/">
            <HomePage /> {/* Renders the HomePage component on the root path */}
          </Route>
          <Route path="/instruments">
            <Instruments /> {/* Renders the Instruments page */}
          </Route>
          <Route path="/reduction-history/ALL">
            <JobsAll /> {/* Displays all reduction jobs */}
          </Route>
          <Route path="/reduction-history/:instrumentName">
            <JobsGeneral /> {/* Displays reduction jobs filtered by instrument name */}
          </Route>
          <Route path="/value-editor/:jobId">
            <ValueEditor /> {/* Opens the ValueEditor for a specific job */}
          </Route>
        </Switch>
      </Router>
    </GlobalStyles>
  );
};

export default App;
