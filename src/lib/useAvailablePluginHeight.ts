import React from 'react';

const scrollableOverflowValues = new Set(['auto', 'scroll', 'overlay']);

export const findScrollableAncestor = (element: HTMLElement | null): HTMLElement | null => {
  let currentElement = element;

  while (currentElement && currentElement !== document.body && currentElement !== document.documentElement) {
    if (scrollableOverflowValues.has(window.getComputedStyle(currentElement).overflowY)) {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  return null;
};

const getViewportBottom = (): number => {
  if (window.visualViewport) {
    return window.visualViewport.offsetTop + window.visualViewport.height;
  }

  return window.innerHeight;
};

export const useAvailablePluginHeight = <T extends HTMLElement = HTMLDivElement>(): {
  rootRef: React.RefObject<T>;
  availableHeight: string;
} => {
  const rootRef = React.useRef<T>(null);
  const [availableHeight, setAvailableHeight] = React.useState('100vh');

  const updateAvailableHeight = React.useCallback((): void => {
    const root = rootRef.current;
    if (!root) return;

    const viewportBottom = getViewportBottom();
    const scrollContainer = findScrollableAncestor(root.parentElement);
    const rootTopAtScrollOrigin =
      root.getBoundingClientRect().top + (scrollContainer ? scrollContainer.scrollTop : window.scrollY);
    const contentBottom = scrollContainer
      ? Math.min(scrollContainer.getBoundingClientRect().bottom, viewportBottom)
      : viewportBottom;
    const nextHeight = `${Math.max(0, Math.floor(contentBottom - rootTopAtScrollOrigin))}px`;

    setAvailableHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
  }, []);

  React.useLayoutEffect(() => {
    let observedScrollContainer: HTMLElement | null = null;
    let firstResizeFrame: number | undefined;
    let secondResizeFrame: number | undefined;
    let settledResizeTimer: number | undefined;

    const measureAndObserve = (): void => {
      updateAvailableHeight();

      const nextScrollContainer = findScrollableAncestor(rootRef.current?.parentElement ?? null);
      if (nextScrollContainer === observedScrollContainer) return;

      resizeObserver?.disconnect();
      observedScrollContainer = nextScrollContainer;
      if (observedScrollContainer) {
        resizeObserver?.observe(observedScrollContainer);
      }
    };

    const cancelScheduledMeasurements = (): void => {
      if (firstResizeFrame !== undefined) window.cancelAnimationFrame(firstResizeFrame);
      if (secondResizeFrame !== undefined) window.cancelAnimationFrame(secondResizeFrame);
      if (settledResizeTimer !== undefined) window.clearTimeout(settledResizeTimer);
    };

    const handleViewportResize = (): void => {
      measureAndObserve();
      cancelScheduledMeasurements();
      firstResizeFrame = window.requestAnimationFrame(() => {
        measureAndObserve();
        secondResizeFrame = window.requestAnimationFrame(measureAndObserve);
      });
      settledResizeTimer = window.setTimeout(measureAndObserve, 100);
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureAndObserve) : undefined;
    measureAndObserve();

    window.addEventListener('resize', handleViewportResize);
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
      cancelScheduledMeasurements();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, [updateAvailableHeight]);

  return { rootRef, availableHeight };
};
