import { afterEach, describe, expect, test, vi } from 'vitest';

import { createRoute } from './routes';

describe('createRoute', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('dispatches a SciGateway route registration event', () => {
    const listener = vi.fn();
    document.addEventListener('scigateway', listener);

    createRoute('Analysis', 'Reduction History', '/fia/reduction-history', 20, 'View reduction jobs', false);

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toMatchObject({
      type: 'scigateway:api:register_route',
      payload: {
        section: 'Analysis',
        link: '/fia/reduction-history',
        plugin: 'fia',
        displayName: 'Reduction History',
        order: 20,
        helpText: 'View reduction jobs',
        unauthorised: false,
        logoAltText: 'Flexible Interactive Automation',
      },
    });
    expect(event.detail.payload.logoLightMode).toContain('fia-dark-text-logo');
    expect(event.detail.payload.logoDarkMode).toContain('fia-light-text-logo');

    document.removeEventListener('scigateway', listener);
  });
});
