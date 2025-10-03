// React components
import React, { FC } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Local data
import Instruments from './pages/Instruments';
import HomePage from './pages/HomePage';
import ValueEditor from './pages/ValueEditor';
import GlobalStyles from './GlobalStyles';
import { clearFailedAuthRequestsQueue, retryFailedAuthRequests } from './lib/api';
import 'dayjs/locale/en-gb';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import JobsPage from './pages/JobsPage';

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
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={'en-gb'}>
      <GlobalStyles>
        <Router basename="/fia">
          <Switch>
            <Route exact path="/">
              <HomePage />
            </Route>
            <Route path="/instruments">
              <Instruments />
            </Route>
            <Route exact path="/reduction-history">
              <JobsPage />
            </Route>
            <Route exact path="/reduction-history/:instrumentName">
              <JobsPage />
            </Route>
            <Route path="/reduction-history/:instrumentName/value-editor-:jobId">
              <ValueEditor />
            </Route>
          </Switch>
        </Router>
      </GlobalStyles>
    </LocalizationProvider>
  );
};

export default App;
