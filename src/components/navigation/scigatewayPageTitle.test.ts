import { runInNewContext } from 'node:vm';

import { expect, test } from 'vitest';

import titleScript from '../../../container/scigateway-page-title.js?raw';

function createHost(path: string): {
  page: Document;
  navigate(nextPath: string, navigationIsCanceled?: boolean): void;
} {
  const location = new URL(path, 'https://fia.example');
  const page = document.implementation.createHTMLDocument('FIA');
  const hostWindow = Object.assign(new EventTarget(), { location });

  runInNewContext(titleScript, { document: page, window: hostWindow });

  return {
    page,
    navigate(nextPath: string, navigationIsCanceled = false): void {
      location.href = new URL(nextPath, location).href;
      hostWindow.dispatchEvent(
        new CustomEvent('single-spa:before-mount-routing-event', { detail: { navigationIsCanceled } })
      );
    },
  };
}

test.each([
  ['/help', 'Help | FIA'],
  ['/help/#reduction-history', 'Help | FIA'],
  ['/HELP?from=menu', 'Help | FIA'],
  ['/login', 'Sign in | FIA'],
  ['/accessibility', 'Accessibility | FIA'],
  ['/cookies', 'Cookies | FIA'],
])('sets the title on a direct visit to %s', (path, title) => {
  expect(createHost(path).page.title).toBe(title);
});

test('keeps the default title for other host pages', () => {
  expect(createHost('/admin').page.title).toBe('FIA');
});

test('updates the title when navigating between host pages and restores the default on other routes', () => {
  const { page, navigate } = createHost('/help');

  navigate('/accessibility');
  expect(page.title).toBe('Accessibility | FIA');

  navigate('/cookies');
  expect(page.title).toBe('Cookies | FIA');

  navigate('/admin');
  expect(page.title).toBe('FIA');
});

test('restores the default title before FIA mounts after leaving a host page', () => {
  const { page, navigate } = createHost('/fia');

  navigate('/login');
  expect(page.title).toBe('Sign in | FIA');

  navigate('/fia');
  expect(page.title).toBe('FIA');

  page.title = 'Home page | FIA';
  navigate('/fia/isis-instruments');
  expect(page.title).toBe('Home page | FIA');
});

test('preserves a newer title when leaving a host page', () => {
  const { page, navigate } = createHost('/cookies');

  page.title = 'Home page | FIA';
  navigate('/fia');

  expect(page.title).toBe('Home page | FIA');
});

test('preserves the current Help title if navigation is canceled', () => {
  const { page, navigate } = createHost('/help');

  navigate('/fia', true);

  expect(page.title).toBe('Help | FIA');
});
