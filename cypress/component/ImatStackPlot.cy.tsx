import { Box } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { mount } from 'cypress/react';
import ndarray from 'ndarray';
import React, { useMemo, useState } from 'react';

import { getViewerPlotSx } from '../../src/components/experimentViewer/styles';
import ImatStackPlot from '../../src/components/imat/ImatStackPlot';
import colorBarStyles from '../../src/h5web/packages/lib/src/vis/heatmap/ColorBar.module.css';

import type { ViewerSize } from '../../src/components/imat/ImatStackPlot';
import type { Domain } from '@h5web/lib';

const modes: ViewerSize[] = ['fit', 'small', 'medium', 'large', 'full'];
const plotSelector = 'figure[aria-label="IMAT stack image"]';
const frameSelectors = ['svg[data-type="abscissa"]', 'svg[data-type="ordinate"]', `.${colorBarStyles.colorBar}`];

function PlotHarness({ originalWidth = 2048, originalHeight = 1024 }): React.ReactElement {
  const [viewerSize, setViewerSize] = useState<ViewerSize>('fit');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [domain, setDomain] = useState<Domain>([0, 65535]);
  const [frame, setFrame] = useState(0);
  const [preview, setPreview] = useState(false);
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  const dataArray = useMemo(() => {
    const rows = preview ? 32 : 64;
    const cols = rows * 2;
    const values = new Float32Array(rows * cols).fill(frame);
    for (let y = (rows * 3) / 8; y < (rows * 5) / 8; y += 1) {
      for (let x = (cols * 3) / 8; x < (cols * 5) / 8; x += 1) {
        values[y * cols + x] = 65535;
      }
    }
    return ndarray(values, [rows, cols]);
  }, [frame, preview]);

  return (
    <ThemeProvider theme={theme}>
      <div>
        {modes.map((size) => (
          <button key={size} onClick={() => setViewerSize(size)}>
            {size}
          </button>
        ))}
        <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>Theme</button>
        <button onClick={() => setDomain([0, 60000])}>Intensity</button>
        <button onClick={() => setFrame(frame + 1)}>Next frame</button>
        <button onClick={() => setPreview(!preview)}>Preview</button>
      </div>
      <Box sx={{ ...getViewerPlotSx(theme), width: '100%', height: 500, overflow: 'hidden' }}>
        <ImatStackPlot
          dataArray={dataArray}
          originalWidth={originalWidth}
          originalHeight={originalHeight}
          viewerSize={viewerSize}
          domain={domain}
        />
      </Box>
    </ThemeProvider>
  );
}

// Measure rendered pixels, not just axis labels: both must follow the camera.
const featureBounds = (canvas: HTMLCanvasElement): { left: number; width: number; top: number; height: number } => {
  const copy = canvas.ownerDocument.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d')!;
  context.drawImage(canvas, 0, 0);
  const horizontal = context.getImageData(0, Math.floor(copy.height / 2), copy.width, 1).data;
  const vertical = context.getImageData(Math.floor(copy.width / 2), 0, 1, copy.height).data;
  const bounds = (pixels: Uint8ClampedArray, cssScale: number): [number, number] => {
    const positions: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = pixels.subarray(i, i + 4);
      if (r > 200 && g > 180 && b < 100 && a > 100) positions.push(i / 4);
    }
    expect(positions.length, 'visible yellow feature').to.be.greaterThan(1);
    return [positions[0] * cssScale, (positions[positions.length - 1] - positions[0] + 1) * cssScale];
  };
  const rect = canvas.getBoundingClientRect();
  const [left, width] = bounds(horizontal, rect.width / copy.width);
  const [top, height] = bounds(vertical, rect.height / copy.height);
  return { left, width, top, height };
};

const zoomIn = (steps = 8): void => {
  for (let i = 0; i < steps; i += 1) {
    cy.get('canvas').trigger('wheel', 'center', { eventConstructor: 'WheelEvent', deltaY: -100 });
  }
};

const waitForRender = (): void => {
  cy.window().then(
    (win) =>
      new Cypress.Promise<void>((resolve) =>
        win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))
      )
  );
};

const panRight = (): void => {
  cy.get('canvas').then(($canvas) => {
    const { width, height } = $canvas[0].getBoundingClientRect();
    cy.wrap($canvas).realMouseDown({ x: width * 0.5, y: height * 0.5 });
    cy.wrap($canvas).realMouseMove(width * 0.55, height * 0.5);
    cy.wrap($canvas).realMouseUp({ x: width * 0.55, y: height * 0.5 });
  });
};

describe('IMAT stack plot sizing', () => {
  beforeEach(() => cy.viewport(1000, 700));

  it('keeps both axes and the colour bar at Fit positions while scaling the rendered image', () => {
    mount(<PlotHarness />);
    const fitBounds: DOMRect[] = [];
    frameSelectors.forEach((selector, index) => {
      cy.get(selector)
        .should('be.visible')
        .then(($element) => {
          fitBounds[index] = $element[0].getBoundingClientRect();
        });
    });

    modes.slice(1).forEach((size, index) => {
      cy.contains('button', new RegExp(`^${size}$`)).click();
      frameSelectors.forEach((selector, frameIndex) => {
        cy.get(selector).should(($element) => {
          const bounds = $element[0].getBoundingClientRect();
          for (const key of ['x', 'y', 'width', 'height'] as const) {
            expect(bounds[key], `${size} ${selector} ${key}`).to.be.closeTo(fitBounds[frameIndex][key], 1);
          }
        });
      });
      cy.get('canvas').should(($canvas) => {
        const feature = featureBounds($canvas[0]);
        expect(feature.width).to.be.closeTo(128 * (index + 1), 3);
        expect(feature.height).to.be.closeTo(64 * (index + 1), 3);
      });
      cy.get(plotSelector).should(($plot) => {
        expect($plot[0].scrollWidth).to.equal($plot[0].clientWidth);
        expect($plot[0].scrollHeight).to.equal($plot[0].clientHeight);
      });
    });
    cy.get(plotSelector).screenshot('imat-full-light', { disableTimersAndAnimations: false });
    cy.contains('button', 'Theme').click();
    waitForRender();
    cy.get('canvas').should(($canvas) => {
      expect(featureBounds($canvas[0]).width).to.be.closeTo(512, 3);
    });
    cy.get(plotSelector).screenshot('imat-full-dark', { disableTimersAndAnimations: false });
    cy.get('canvas').should(($canvas) => {
      expect(featureBounds($canvas[0]).width).to.be.closeTo(512, 3);
    });
  });

  for (const size of modes) {
    it(`zooms smoothly and resets to the selected ${size} size`, () => {
      mount(<PlotHarness originalWidth={512} originalHeight={256} />);
      cy.contains('button', new RegExp(`^${size}$`)).click();
      let original: ReturnType<typeof featureBounds>;
      cy.get('canvas').should(($canvas) => {
        original = featureBounds($canvas[0]);
      });
      zoomIn(1);
      cy.get('canvas').should(($canvas) => {
        expect(featureBounds($canvas[0]).width).to.be.closeTo(original.width / 0.95, 2);
      });
      cy.contains('button', 'Reset zoom').click();
      cy.get('canvas').should(($canvas) => {
        const reset = featureBounds($canvas[0]);
        expect(reset.width).to.be.closeTo(original.width, 1);
        expect(reset.left).to.be.closeTo(original.left, 1);
      });
      cy.contains('button', 'Reset zoom').should('not.be.visible');
      cy.get('canvas').trigger('wheel', 'center', { eventConstructor: 'WheelEvent', deltaY: 100 });
      cy.get('canvas').should(($canvas) => {
        expect(featureBounds($canvas[0]).width).to.be.closeTo(original.width, 1);
      });
    });
  }

  it('pans oversized images, preserves the view across frames and previews, and resets after pan alone', () => {
    mount(<PlotHarness />);
    cy.contains('button', /^full$/).click();
    let original: ReturnType<typeof featureBounds>;
    let panned: ReturnType<typeof featureBounds>;
    let axisText: string;
    cy.get('canvas').should(($canvas) => {
      original = featureBounds($canvas[0]);
    });
    cy.get('svg[data-type="abscissa"]').then(($axis) => {
      axisText = $axis.text();
    });
    panRight();
    cy.get('canvas').should(($canvas) => {
      panned = featureBounds($canvas[0]);
      expect(panned.left).to.be.greaterThan(original.left + 20);
      expect(panned.width).to.be.closeTo(original.width, 1);
    });
    cy.get('svg[data-type="abscissa"]').should(($axis) => {
      expect($axis.text()).not.to.equal(axisText);
    });
    ['Next frame', 'Preview', 'Preview', 'Intensity'].forEach((action) => {
      cy.contains('button', action).click();
      waitForRender();
      cy.get('canvas').should(($canvas) => {
        const feature = featureBounds($canvas[0]);
        expect(feature.left).to.be.closeTo(panned.left, 1);
        expect(feature.width).to.be.closeTo(panned.width, 1);
      });
    });
    cy.contains('button', 'Reset zoom').click();
    cy.get('canvas').should(($canvas) => {
      expect(featureBounds($canvas[0]).left).to.be.closeTo(original.left, 1);
    });
  });

  it('preserves magnification on resize and supports selection zoom and preset changes', () => {
    mount(<PlotHarness />);
    cy.contains('button', /^medium$/).click();
    zoomIn();
    let zoomedWidth: number;
    let canvasWidth: number;
    cy.get('canvas').should(($canvas) => {
      zoomedWidth = featureBounds($canvas[0]).width;
      expect(zoomedWidth).to.be.closeTo(256 / 0.95 ** 8, 2);
      canvasWidth = $canvas[0].getBoundingClientRect().width;
    });
    cy.viewport(1200, 800);
    cy.get('canvas').should(($canvas) => {
      expect($canvas[0].getBoundingClientRect().width).to.be.closeTo(canvasWidth + 200, 1);
      expect(featureBounds($canvas[0]).width).to.be.closeTo(zoomedWidth, 2);
    });
    cy.contains('button', 'Reset zoom').click();
    cy.get('canvas').then(($canvas) => {
      const { width, height } = $canvas[0].getBoundingClientRect();
      cy.wrap($canvas).realMouseDown({ x: width * 0.3, y: height * 0.3, ctrlKey: true });
      cy.wrap($canvas).realMouseMove(width * 0.7, height * 0.7, { ctrlKey: true });
      cy.wrap($canvas).realMouseUp({ x: width * 0.7, y: height * 0.7, ctrlKey: true });
    });
    cy.get('canvas').should(($canvas) => {
      expect(featureBounds($canvas[0]).width).to.be.greaterThan(500);
    });
    cy.contains('button', /^small$/).click();
    cy.get('canvas').should(($canvas) => {
      const feature = featureBounds($canvas[0]);
      expect(feature.width).to.be.closeTo(128, 3);
      expect(feature.left + feature.width / 2).to.be.closeTo($canvas[0].getBoundingClientRect().width / 2, 1);
    });
  });

  it('falls back to sampled dimensions when original dimensions are missing', () => {
    mount(<PlotHarness originalWidth={0} originalHeight={0} />);
    cy.contains('button', /^full$/).click();
    cy.get('canvas').should(($canvas) => {
      const feature = featureBounds($canvas[0]);
      expect(feature.width).to.be.closeTo(32, 2);
      expect(feature.height).to.be.closeTo(16, 2);
    });
  });

  it('keeps original pixel coordinates and tooltip values aligned during previews', () => {
    mount(<PlotHarness />);
    cy.contains('button', /^full$/).click();
    const checkTooltip = (): void => {
      cy.get('canvas').trigger('pointermove', 'center', { eventConstructor: 'PointerEvent', buttons: 0 });
      cy.get(plotSelector)
        .contains(/x=102[34], y=51[12]/)
        .should('be.visible');
      cy.get(plotSelector).find('strong').should('contain.text', '65535');
    };
    checkTooltip();
    cy.contains('button', 'Preview').click();
    checkTooltip();
  });
});
