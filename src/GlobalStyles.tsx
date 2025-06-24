// React components
// Material UI components
import { createTheme, StyledEngineProvider, Theme, ThemeProvider } from '@mui/material/styles';
import React from 'react';

// Initialize a default theme
let theme: Theme = createTheme();

// Listen for theme changes from SciGateway and update the theme dynamically
document.addEventListener('scigateway', (e) => {
  const action = (e as CustomEvent).detail;
  // If the event contains theme options, update the theme
  if (action.type === 'scigateway:api:send_themeoptions' && action.payload && action.payload.theme) {
    theme = action.payload.theme;
  }
});

// GlobalStyles component wraps the app in a theme provider
class GlobalStyles extends React.Component<{ children: React.ReactNode }> {
  public constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  public render(): React.ReactElement {
    return (
      <StyledEngineProvider injectFirst>
        {/* Apply the theme to all children components */}
        <ThemeProvider theme={theme}>{this.props.children}</ThemeProvider>
      </StyledEngineProvider>
    );
  }
}

export default GlobalStyles;
