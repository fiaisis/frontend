import { Box } from '@mui/material';
import { mount } from 'cypress/react';
import React from 'react';

import PlotViewer from '../../src/components/experimentViewer/Graph';
import Viewer2D from '../../src/components/experimentViewer/Viewer2D';

const signal = [0, 0, 1, 0, 0];

// Measure the plotted feature itself: axis labels alone can change even when
// a graphics-library regression prevents the canvas from actually zooming.
const featureBounds = (canvas: HTMLCanvasElement, heatmap: boolean): [number, number] => {
  const copy = canvas.ownerDocument.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d')!;
  context.drawImage(canvas, 0, 0);
  const { data } = context.getImageData(0, Math.floor(copy.height / 2), copy.width, 1);
  const positions: number[] = [];

  for (let x = 0; x < copy.width; x += 1) {
    const [r, g, b, a] = data.subarray(x * 4, x * 4 + 4);
    const matches = heatmap ? r > 200 && g > 180 && b < 100 : r < 20 && g < 20 && b > 100;
    if (a > 100 && matches) {
      positions.push(x / copy.width);
    }
  }

  expect(positions.length, 'visible data pixels at the middle of the plot').to.be.greaterThan(1);
  return [positions[0], positions[positions.length - 1]];
};

const mountEmbeddedViewer = (heatmap: boolean): void => {
  cy.intercept('GET', '**/plottingapi/meta*', {
    body: {
      name: 'signal',
      kind: 'dataset',
      shape: heatmap ? [8, 8] : [5],
      type: { class: 1, size: 4, order: 0 },
      chunks: null,
      filters: null,
      attributes: [],
    },
  });
  cy.intercept('GET', '**/plottingapi/data*', {
    headers: { 'content-type': 'application/octet-stream' },
    // Float32 fixtures: the signal above, or an 8x8 image with a central 2x2
    // square of ones on a zero background.
    fixture: heatmap ? 'zoom-heatmap.f32,null' : 'zoom-line.f32,null',
  });
  mount(
    <Box sx={{ height: 500 }}>
      <Viewer2D filepath="/zoom.nxs" />
    </Box>
  );
};

describe('Viewer zoom and pan', () => {
  beforeEach(() => {
    cy.viewport(1200, 700);
    cy.clearLocalStorage();
  });

  for (const viewer of ['Experiment 1D', 'Experiment MD / Live data line', 'Experiment MD / Live data heatmap']) {
    it(`zooms, pans, and resets the rendered data in ${viewer}`, () => {
      const heatmap = viewer.endsWith('heatmap');
      if (viewer === 'Experiment 1D') {
        mount(
          <Box sx={{ height: 500 }}>
            <PlotViewer
              linePlotData={[{ filename: 'signal', data: signal }]}
              showErrors={false}
              onShowErrorsChange={() => undefined}
            />
          </Box>
        );
      } else {
        mountEmbeddedViewer(heatmap);
      }

      let original: [number, number];
      cy.get('canvas')
        .first()
        .should(($canvas) => {
          original = featureBounds($canvas[0], heatmap);
        });

      for (let step = 0; step < 12; step += 1) {
        cy.get('canvas').first().trigger('wheel', 'center', { eventConstructor: 'WheelEvent', deltaY: -100 });
      }
      cy.contains('button', 'Reset zoom').should('be.visible');
      cy.get('canvas')
        .first()
        .should(($canvas) => {
          const [left, right] = featureBounds($canvas[0], heatmap);
          expect(right - left, 'data feature expands when scrolling in').to.be.greaterThan(
            (original[1] - original[0]) * 1.5
          );
        });

      cy.contains('button', 'Reset zoom').click();
      cy.get('canvas')
        .first()
        .should(($canvas) => {
          const [left, right] = featureBounds($canvas[0], heatmap);
          expect(left).to.be.closeTo(original[0], 0.01);
          expect(right).to.be.closeTo(original[1], 0.01);
        });

      // Ctrl-drag selects the central 30% of the view.
      cy.get('canvas')
        .first()
        .then(($canvas) => {
          const { width, height } = $canvas[0].getBoundingClientRect();
          cy.wrap($canvas).realMouseDown({ x: width * 0.35, y: height * 0.35, ctrlKey: true });
          cy.wrap($canvas).realMouseMove(width * 0.65, height * 0.65, { ctrlKey: true });
          cy.wrap($canvas).realMouseUp({ x: width * 0.65, y: height * 0.65, ctrlKey: true });
        });

      let selected: [number, number];
      cy.get('canvas')
        .first()
        .should(($canvas) => {
          selected = featureBounds($canvas[0], heatmap);
          expect(selected[1] - selected[0], 'data feature expands to the selected region').to.be.greaterThan(
            (original[1] - original[0]) * 2.5
          );
        });

      // Ordinary dragging pans the zoomed view without changing magnification.
      cy.get('canvas')
        .first()
        .then(($canvas) => {
          const { width, height } = $canvas[0].getBoundingClientRect();
          cy.wrap($canvas).realMouseDown({ x: width * 0.5, y: height * 0.5 });
          cy.wrap($canvas).realMouseMove(width * 0.54, height * 0.5);
          cy.wrap($canvas).realMouseUp({ x: width * 0.54, y: height * 0.5 });
        });
      cy.get('canvas')
        .first()
        .should(($canvas) => {
          const [left, right] = featureBounds($canvas[0], heatmap);
          expect(left, 'data moves with the drag').to.be.closeTo(selected[0] + 0.04, 0.01);
          expect(right - left, 'pan preserves magnification').to.be.closeTo(selected[1] - selected[0], 0.01);
        });

      cy.contains('button', 'Reset zoom').click();
      cy.get('canvas')
        .first()
        .should(($canvas) => {
          const [left, right] = featureBounds($canvas[0], heatmap);
          expect(left).to.be.closeTo(original[0], 0.01);
          expect(right).to.be.closeTo(original[1], 0.01);
        });
      cy.contains('button', 'Reset zoom').should('not.be.visible');
    });
  }
});
