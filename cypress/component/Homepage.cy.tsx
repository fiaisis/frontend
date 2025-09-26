import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { mount } from '@cypress/react';
import Homepage from '../../src/pages/Homepage';

describe('HomePage Component Tests', () => {
  beforeEach(() => {
    // Before each test, mount the HomePage component wrapped in BrowserRouter
    // This setup is necessary since HomePage uses Link components for routing
    mount(
      <BrowserRouter>
        <Homepage />
      </BrowserRouter>
    );
  });

  it('displays correct title size for desktop', () => {
    cy.get('h2').should('have.css', 'font-size', '32px');
  });

  it('renders the title correctly in two parts', () => {
    cy.contains('Data reduction and processing').should('be.visible');
    cy.contains('for large-scale science facilities').should('be.visible');
  });

  it('displays the background image', () => {
    cy.get('div[id="fia-homepage"] > div')
      .first()
      .should('exist')
      .and('have.css', 'backgroundImage')
      .and((url) => {
        expect(url).to.match(/background.*\.jpg/);
      });
  });
});
