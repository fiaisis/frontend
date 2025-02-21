// React components
import React, { FC } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import ReactGA from 'react-ga4';
import 'dayjs/locale/en-gb';
// Local data
import Instruments from './pages/Instruments';
import HomePage from './pages/HomePage';
import ValueEditor from './components/ValueEditor';
import GlobalStyles from './GlobalStyles';
import { clearFailedAuthRequestsQueue, retryFailedAuthRequests } from './lib/api';
import JobsPage from './pages/JobsPage';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Initialize Google Analytics
ReactGA.initialize('G-7XJBCP6P75');
ReactGA.send({ hitType: 'pageview', page: window.location.pathname });

const App: FC = () => {
  // Need to call forceUpdate if SciGateway tells us to rerender but there's no
  // forceUpdate in functional components, so this is the hooks equivalent. See
  // https://reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, forceUpdate] = React.useReducer((x) => x + 1, 0);

  function handler(e: Event): void {
    // Attempt to re-render the plugin if we get told to
    const action = (e as CustomEvent).detail;
    if ('scigateway:api:plugin_rerender'.match(action)) {
      forceUpdate();
    }
    if ('scigateway:api:invalidate_token'.match(action)) {
      retryFailedAuthRequests();
    }
    if ('scigateway:api:signout'.match(action)) {
      clearFailedAuthRequestsQueue();
    }
  }

  React.useEffect(() => {
    document.addEventListener('scigateway', handler);
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
            <Route path="/reduction-history/:instrumentName">
              <JobsPage />
            </Route>
            <Route path="/value-editor/:jobId">
              <ValueEditor />
            </Route>
          </Switch>
        </Router>
      </GlobalStyles>
    </LocalizationProvider>
  );
};

export default App;
