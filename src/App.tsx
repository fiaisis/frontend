// React components
import React, { FC } from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import ReactGA from 'react-ga4';

// Local data
import Instruments from './pages/Instruments';
import Homepage from './pages/Homepage';
import ValueEditor from './pages/ValueEditor';
import ExperimentViewer from './pages/ExperimentViewer';
import LiveData from './pages/LiveData';
import LiveValueEditor from './pages/LiveValueEditor';
import GlobalStyles from './GlobalStyles';
import Jobs from './pages/Jobs';
import DataViewer from './pages/DataViewer';
import { clearFailedAuthRequestsQueue, retryFailedAuthRequests } from './lib/api';
import 'dayjs/locale/en-gb';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

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
    const action = (e as CustomEvent).detail?.type;

    // If SciGateway requests a plugin re-render, trigger a re-render
    if (action === 'scigateway:api:plugin_rerender') {
      forceUpdate();
    }

    // If SciGateway invalidates the token, retry failed authentication requests
    if (action === 'scigateway:api:invalidate_token') {
      retryFailedAuthRequests();
    }

    // If SciGateway requests signout, clear the authentication request queue
    if (action === 'scigateway:api:signout') {
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
              <Homepage />
            </Route>
            <Route path="/instruments">
              <Instruments />
            </Route>
            <Route exact path="/reduction-history">
              <Jobs />
            </Route>
            <Route exact path="/reduction-history/:instrumentName">
              <Jobs />
            </Route>
            <Route path="/reduction-history/:instrumentName/value-editor-:jobId">
              <ValueEditor />
            </Route>
            <Route path="/reduction-history/:instrumentName/experiment-viewer-:jobId">
              <ExperimentViewer />
            </Route>
            <Route path="/experiment-viewer">
              <ExperimentViewer />
            </Route>
            <Route path="/live-data/:instrumentName/edit-script">
              <LiveValueEditor />
            </Route>
            <Route path="/live-data">
              <LiveData />
            </Route>
            <Route path="/data-viewer/view/generic/experiment_number/:experimentNumber/:filename">
              <DataViewer />
            </Route>
            <Route path="/data-viewer/view/generic/user_number/:userNumber/:filename">
              <DataViewer />
            </Route>
            <Route path="/data-viewer/view/:instrument/:experimentNumber/:filename">
              <DataViewer />
            </Route>
            {/* Blank route for login page*/}
            <Route path="/login" />
            {/* Catch-all that redirects unmatched routes to the homepage*/}
            <Route render={() => <Redirect to="/" />} />
          </Switch>
        </Router>
      </GlobalStyles>
    </LocalizationProvider>
  );
};

export default App;
