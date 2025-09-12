// React components
import React, { FC, useEffect, useReducer } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Pages
import Instruments from './pages/Instruments';
import HomePage from './pages/HomePage';
import ValueEditor from './pages/ValueEditor';
import JobsPage from './pages/JobsPage';
import GlobalStyles from './GlobalStyles';

// MUI date pickers
import 'dayjs/locale/en-gb';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Auth queue helpers
import { clearFailedAuthRequestsQueue, retryFailedAuthRequests } from './lib/api';

// Google Analytics
// TODO: expand on this to show more metrics
ReactGA.initialize('G-7XJBCP6P75');
ReactGA.send({ hitType: 'pageview', page: window.location.pathname });

const App: FC = () => {
  // Force-update mechanism (used when SciGateway asks for a re-render)
  // There is no direct forceUpdate in functional components, so we increment a state variable instead
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceUpdate] = useReducer((x) => x + 1, 0);

  const basename = import.meta.env.BASE_URL ?? '/';

  function handler(e: Event): void {
    // Handle custom SciGateway events for triggering actions in the app
    const action = (e as CustomEvent<{ type?: string }>).detail;
    switch (action?.type) {
      // If SciGateway requests a plugin re-render, trigger a re-render
      case 'scigateway:api:plugin_rerender':
        forceUpdate();
        break;
      // If SciGateway invalidates the token, retry failed authentication requests
      case 'scigateway:api:invalidate_token':
        retryFailedAuthRequests();
        break;
      // If SciGateway requests signout, clear the authentication request queue
      case 'scigateway:api:signout':
        clearFailedAuthRequestsQueue();
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    // Remove event listener when the component unmounts
    document.addEventListener('scigateway', handler);
    return () => document.removeEventListener('scigateway', handler);
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      <GlobalStyles>
        <Router basename={basename}>
          <Switch>
            <Route exact path="/">
              <HomePage />
            </Route>

            <Route path="/instruments">
              <Instruments />
            </Route>

            <Route path="/reduction-history/:instrumentName">
              <JobsPage />
            </Route>

            <Route path="/value-editor/:jobId">
              <ValueEditor />
            </Route>

            {/* Fallback so "/" always shows something in dev */}
            <Route path="*">
              <HomePage />
            </Route>
          </Switch>
        </Router>
      </GlobalStyles>
    </LocalizationProvider>
  );
};

export default App;
