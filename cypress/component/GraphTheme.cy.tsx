import { Box } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { mount } from 'cypress/react';
import React, { useState } from 'react';

import PlotViewer from '../../src/components/experimentViewer/Graph';

const ThemeSwitchingGraph = (): React.ReactElement => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [highContrast, setHighContrast] = useState(false);
  const theme = createTheme({
    palette: {
      mode,
      background: {
        default: highContrast ? (mode === 'dark' ? '#000000' : '#ffffff') : undefined,
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <button type="button" onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
        Toggle light/dark
      </button>
      <button type="button" onClick={() => setHighContrast(!highContrast)}>
        Toggle high contrast
      </button>
      <Box sx={{ height: 500 }}>
        <PlotViewer
          linePlotData={[{ filename: 'signal', data: [1, 3, 2, 4, 1] }]}
          showErrors={false}
          onShowErrorsChange={() => undefined}
        />
      </Box>
    </ThemeProvider>
  );
};

const expectLineColor = (expected: [number, number, number]): void => {
  cy.get('canvas').should(($canvases) => {
    const canvas = $canvases[0] as HTMLCanvasElement;
    const copy = canvas.ownerDocument.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d')!;
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    let matchingPixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 100 && expected.every((channel, offset) => Math.abs(data[index + offset] - channel) <= 3)) {
        matchingPixels += 1;
      }
    }

    expect(matchingPixels, `line pixels matching rgb(${expected.join(', ')})`).to.be.greaterThan(100);
  });
};

describe('Experiment graph theme colors', () => {
  it('updates rendered line colors immediately and consistently across theme toggles', () => {
    cy.viewport(1200, 700);
    mount(<ThemeSwitchingGraph />);
    expectLineColor([0, 0, 139]);

    cy.contains('button', 'Toggle light/dark').click();
    expectLineColor([144, 202, 249]);
    cy.contains('button', 'Toggle high contrast').click();
    expectLineColor([144, 202, 249]);
    cy.contains('button', 'Toggle light/dark').click();
    expectLineColor([0, 0, 139]);
    cy.contains('button', 'Toggle high contrast').click();
    expectLineColor([0, 0, 139]);
    cy.contains('button', 'Toggle light/dark').click();
    expectLineColor([144, 202, 249]);
  });
});
