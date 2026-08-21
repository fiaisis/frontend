import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { useAvailablePluginHeight } from './useAvailablePluginHeight';

const originalInnerHeight = window.innerHeight;

const createRect = (top: number, bottom: number): DOMRect =>
  ({
    x: 0,
    y: top,
    top,
    right: 0,
    bottom,
    left: 0,
    width: 0,
    height: bottom - top,
    toJSON: () => ({}),
  }) as DOMRect;

const TestPage = (): React.ReactElement => {
  const { rootRef, availableHeight } = useAvailablePluginHeight();

  return <div ref={rootRef} data-testid="plugin-page" style={{ height: availableHeight }} />;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
});

describe('useAvailablePluginHeight', () => {
  test('uses the viewport bottom when FIA is running standalone', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'plugin-page' ? createRect(120, 120) : createRect(0, 0);
    });

    render(<TestPage />);

    expect(screen.getByTestId('plugin-page')).toHaveStyle({ height: '780px' });
  });

  test.each([
    ['desktop footer boundary', 968, 804],
    ['mobile content boundary', 1000, 836],
  ])('uses the SciGateway host bottom for the %s', (_label, hostBottom, expectedHeight) => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === 'plugin-host') return createRect(64, hostBottom);
      if (this.dataset.testid === 'plugin-page') return createRect(164, 164);
      return createRect(0, 0);
    });

    render(
      <div data-testid="plugin-host" style={{ overflowY: 'auto' }}>
        <TestPage />
      </div>
    );

    expect(screen.getByTestId('plugin-page')).toHaveStyle({ height: `${expectedHeight}px` });
  });

  test('recalculates when the window or host container resizes', () => {
    let hostBottom = 968;
    let triggerResizeObserver = (): void => undefined;

    class ResizeObserverMock {
      public constructor(callback: ResizeObserverCallback) {
        triggerResizeObserver = () => callback([], this as unknown as ResizeObserver);
      }

      public observe(): void {}

      public disconnect(): void {}

      public unobserve(): void {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === 'plugin-host') return createRect(64, hostBottom);
      if (this.dataset.testid === 'plugin-page') return createRect(164, 164);
      return createRect(0, 0);
    });

    render(
      <div data-testid="plugin-host" style={{ overflowY: 'auto' }}>
        <TestPage />
      </div>
    );

    expect(screen.getByTestId('plugin-page')).toHaveStyle({ height: '804px' });

    hostBottom = 900;
    act(() => triggerResizeObserver());
    expect(screen.getByTestId('plugin-page')).toHaveStyle({ height: '736px' });

    hostBottom = 850;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(screen.getByTestId('plugin-page')).toHaveStyle({ height: '686px' });
  });
});
