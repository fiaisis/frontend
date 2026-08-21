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
    const contentBottom = scrollContainer
      ? Math.min(scrollContainer.getBoundingClientRect().bottom, viewportBottom)
      : viewportBottom;
    const nextHeight = `${Math.max(0, Math.floor(contentBottom - root.getBoundingClientRect().top))}px`;

    setAvailableHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
  }, []);

  React.useLayoutEffect(() => {
    updateAvailableHeight();

    const scrollContainer = findScrollableAncestor(rootRef.current?.parentElement ?? null);
    const resizeObserver =
      scrollContainer && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateAvailableHeight) : undefined;

    if (scrollContainer && resizeObserver) {
      resizeObserver.observe(scrollContainer);
    }

    window.addEventListener('resize', updateAvailableHeight);
    window.visualViewport?.addEventListener('resize', updateAvailableHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateAvailableHeight);
      window.visualViewport?.removeEventListener('resize', updateAvailableHeight);
    };
  }, [updateAvailableHeight]);

  return { rootRef, availableHeight };
};
