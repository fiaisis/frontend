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
  }

  React.useEffect(() => {
    document.addEventListener('scigateway', handler);
    return () => {
      document.removeEventListener('scigateway', handler);
    };
  }, []);

  return (
    <GlobalStyles>
      <Router basename="/fia">
        <Switch>
          <Route exact path="/">
            <HomePage />
          </Route>
          <Route path="/instruments">
            <Instruments />
          </Route>
          <Route path="/reduction-history/ALL">
            <JobsAll />
          </Route>
          <Route path="/reduction-history/:instrumentName">
            <JobsGeneral />
          </Route>
          <Route path="/value-editor/:jobId">
            <ValueEditor />
          </Route>
        </Switch>
      </Router>
    </GlobalStyles>
  );
};

export default App;
