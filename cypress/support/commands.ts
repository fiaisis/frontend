/// <reference types="cypress" />

const createUnsignedJwt = (win: Window, payload: Record<string, unknown>): string => {
  const base64UrlEncode = (value: Record<string, unknown>): string =>
    win.btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

  const header = { alg: 'none', typ: 'JWT' };
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.`;
};

Cypress.Commands.add('visitFia', (path = '/fia') => {
  cy.visit(path, {
    onBeforeLoad(win) {
      const token = createUnsignedJwt(win, {
        role: 'staff',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      });

      win.localStorage.setItem('scigateway:token', token);
      win.localStorage.setItem('autoLogin', 'true');
    },
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      visitFia(path?: string): Chainable<Window>;
    }
  }
}

export {};
