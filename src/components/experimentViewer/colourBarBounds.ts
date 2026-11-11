import colourBarStyles from '../../h5web/packages/lib/src/vis/heatmap/ColorBar.module.css';

import type { CustomDomain } from '@h5web/lib';

/**
 * H5Web draws the current colour-scale limits next to every heatmap as two plain labels: the upper
 * limit above the gradient and the lower limit below it (`ColorBar.tsx`, rendered by `HeatmapVis`
 * with `withBounds`). The only way upstream offers to change them is the toolbar's domain widget, so
 * `EditableColourBarBounds` makes the labels themselves the edit targets, and these helpers are how
 * it finds and reads them.
 *
 * The labels are identified with H5Web's own CSS-module class names, imported from the submodule in
 * the same way as `styles.ts` imports the toolbar ones. That is not a public H5Web API, so every
 * lookup is optional: should upstream rename them, the selectors below come out empty and the editor
 * switches itself off instead of breaking the viewer.
 */
export type ColourBarBound = 'min' | 'max';

export const COLOUR_BAR_BOUNDS: readonly ColourBarBound[] = ['min', 'max'];

/** Composed CSS modules export several class names; selectors need the first (local) one. */
const localClass = (name: string): string | undefined => colourBarStyles[name]?.split(' ')[0];

/** `[…=…]` rather than `.name` selectors: a CSS-module hash is arbitrary text, not a CSS ident. */
const classSelector = (name: string | undefined): string | undefined => (name ? `[class~="${name}"]` : undefined);

export const COLOUR_BAR_CLASS = localClass('colorBar');

export const BOUND_CLASSES: Record<ColourBarBound, string | undefined> = {
  min: localClass('minBound'),
  max: localClass('maxBound'),
};

const COLOUR_BAR_SELECTOR = classSelector(COLOUR_BAR_CLASS);
const BOUND_SELECTORS: Record<ColourBarBound, string | undefined> = {
  min: classSelector(BOUND_CLASSES.min),
  max: classSelector(BOUND_CLASSES.max),
};

/** `[class~=…]` selectors for both limit labels, for consumers that only need to style them. */
export const BOUND_CLASS_SELECTORS: string[] = COLOUR_BAR_BOUNDS.map((bound) =>
  classSelector(BOUND_CLASSES[bound])
).filter((selector): selector is string => Boolean(selector));

export interface ColourBarBoundHit {
  /** The colour bar element containing the label. */
  bar: HTMLElement;
  bound: ColourBarBound;
  /** The limit label element itself. */
  element: HTMLElement;
}

export const otherBound = (bound: ColourBarBound): ColourBarBound => (bound === 'min' ? 'max' : 'min');

/** The limit label of one bound within a colour bar, if H5Web rendered it. */
export function getBoundElement(bar: HTMLElement, bound: ColourBarBound): HTMLElement | undefined {
  const selector = BOUND_SELECTORS[bound];
  if (!selector) {
    return undefined;
  }

  return bar.querySelector<HTMLElement>(selector) ?? undefined;
}

/** Which colour-scale limit, if any, an event target sits on. */
export function findColourBarBound(target: HTMLElement): ColourBarBoundHit | undefined {
  if (!COLOUR_BAR_SELECTOR) {
    return undefined;
  }

  const bar = target.closest(COLOUR_BAR_SELECTOR);
  if (!(bar instanceof HTMLElement)) {
    return undefined;
  }

  const hit = COLOUR_BAR_BOUNDS.map((bound) => ({ bound, element: getBoundElement(bar, bound) })).find((candidate) =>
    candidate.element?.contains(target)
  );

  return hit && hit.element ? { bar, bound: hit.bound, element: hit.element } : undefined;
}

/** The text H5Web shows for a limit, i.e. the value rounded to H5Web's bound precision. */
export function getBoundText(bar: HTMLElement, bound: ColourBarBound): string | undefined {
  return getBoundElement(bar, bound)?.textContent ?? undefined;
}

// d3's exponent formatting can use U+2212 for the minus sign; `parseFloat` needs an ASCII one.
const MINUS_SIGN = /\u2212/g;

/** Parse a limit label (or a user's input) the way H5Web's own bound editor does. */
export function parseBoundText(text: string): number | undefined {
  const parsed = Number.parseFloat(text.replace(MINUS_SIGN, '-').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Replace one limit of H5Web's persisted custom domain, leaving the other one as it was. */
export function withCustomBound(customDomain: CustomDomain, bound: ColourBarBound, value: number | null): CustomDomain {
  return bound === 'min' ? [value, customDomain[1]] : [customDomain[0], value];
}
