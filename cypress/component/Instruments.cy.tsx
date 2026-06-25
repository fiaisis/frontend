import { mount } from 'cypress/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import Instruments from '../../src/pages/Instruments';

describe('<Instruments />', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    mount(
      <MemoryRouter initialEntries={['/instruments']}>
        <Instruments />
      </MemoryRouter>
    );
  });

  it('renders instrument cards at an equal height', () => {
    cy.get('[data-testid="instrument-card"]').should(($cards) => {
      const heights = $cards.toArray().map((card) => Math.round(card.getBoundingClientRect().height));
      const uniqueHeights = new Set(heights);

      expect(uniqueHeights.size).to.equal(1);
    });
  });
});
