import { ScaleType } from '@h5web/lib';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { BOUND_CLASSES, COLOUR_BAR_CLASS } from './colourBarBounds';
import EditableColourBarBounds from './EditableColourBarBounds';
import { HeatmapConfigProvider, useHeatmapConfig } from '../../h5web/packages/app/src/vis-packs/core/heatmap/config';

const LOWER_LIMIT = '1.00e+0';
const UPPER_LIMIT = '1.23e+3';

const LIMITS = {
  min: { text: LOWER_LIMIT, label: 'Lower colour-scale limit' },
  max: { text: UPPER_LIMIT, label: 'Upper colour-scale limit' },
} as const;

type FakeBound = keyof typeof LIMITS;

/** Stands in for the `1.23e+3` / `1.00e+0` labels H5Web renders either side of the colour bar. */
const FakeColourBar = ({ lower, upper }: { lower: string; upper: string }): JSX.Element => (
  <div className={COLOUR_BAR_CLASS}>
    <p className={BOUND_CLASSES.min}>{lower}</p>
    <div data-testid="gradient" />
    <p className={BOUND_CLASSES.max}>{upper}</p>
  </div>
);

/** Mirrors what the toolbar's domain widget would show, i.e. H5Web's persisted custom domain. */
const CustomDomainProbe = (): JSX.Element => {
  const { customDomain } = useHeatmapConfig();
  return <p data-testid="custom-domain">{JSON.stringify(customDomain)}</p>;
};

const LogScaleButton = (): JSX.Element => {
  const { setScaleType } = useHeatmapConfig();
  return (
    <button type="button" onClick={() => setScaleType(ScaleType.Log)}>
      Use log scale
    </button>
  );
};

const persistedDomain = (): string => screen.getByTestId('custom-domain').textContent ?? '';

const renderColourBar = ({ withLogScale = false } = {}): void => {
  render(
    <HeatmapConfigProvider>
      <EditableColourBarBounds>
        <FakeColourBar lower={LOWER_LIMIT} upper={UPPER_LIMIT} />
      </EditableColourBarBounds>
      <CustomDomainProbe />
      {withLogScale && <LogScaleButton />}
    </HeatmapConfigProvider>
  );
};

const editLimit = async (bound: FakeBound, input: string): Promise<void> => {
  await userEvent.dblClick(screen.getByText(LIMITS[bound].text));
  const field = await screen.findByLabelText(LIMITS[bound].label);
  await userEvent.clear(field);
  await userEvent.type(field, `${input}{Enter}`);
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

test('edits the upper limit shown above the colour bar on double click', async () => {
  renderColourBar();

  await userEvent.dblClick(screen.getByText(UPPER_LIMIT));
  const input = await screen.findByLabelText('Upper colour-scale limit');
  expect(input).toHaveValue(UPPER_LIMIT);

  await userEvent.clear(input);
  await userEvent.type(input, '1000{Enter}');

  expect(screen.queryByLabelText('Upper colour-scale limit')).not.toBeInTheDocument();
  expect(persistedDomain()).toBe(JSON.stringify([null, 1000]));
});

test('edits the lower limit shown below the colour bar and keeps the other limit', async () => {
  renderColourBar();

  await editLimit('max', '1000');
  expect(persistedDomain()).toBe(JSON.stringify([null, 1000]));

  await editLimit('min', '5');
  expect(persistedDomain()).toBe(JSON.stringify([5, 1000]));
});

test('leaves the limits alone when an unchanged value is submitted', async () => {
  renderColourBar();

  // H5Web shows three significant figures, so applying the displayed text verbatim would otherwise
  // quietly replace a limit such as 1234.56 with the rounded 1230 shown on screen.
  await userEvent.dblClick(screen.getByText(UPPER_LIMIT));
  await userEvent.keyboard('{Enter}');

  expect(screen.queryByLabelText('Upper colour-scale limit')).not.toBeInTheDocument();
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('cancels on Escape without changing the limits', async () => {
  renderColourBar();

  await userEvent.dblClick(screen.getByText(LOWER_LIMIT));
  const input = await screen.findByLabelText('Lower colour-scale limit');
  await userEvent.clear(input);
  await userEvent.type(input, '5');
  await userEvent.keyboard('{Escape}');

  expect(screen.queryByLabelText('Lower colour-scale limit')).not.toBeInTheDocument();
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('cancels when the editor loses focus', async () => {
  renderColourBar();

  await userEvent.dblClick(screen.getByText(UPPER_LIMIT));
  await screen.findByLabelText('Upper colour-scale limit');
  await userEvent.click(document.body);

  expect(screen.queryByLabelText('Upper colour-scale limit')).not.toBeInTheDocument();
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('hands a limit back to the data when auto is typed', async () => {
  renderColourBar();

  await editLimit('max', '1000');
  expect(persistedDomain()).toBe(JSON.stringify([null, 1000]));

  await editLimit('max', 'auto');
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('pops up an error and changes nothing when the input is not a number', async () => {
  renderColourBar();

  await editLimit('max', 'bright pink');

  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a number for the upper limit');
  expect(screen.queryByLabelText('Upper colour-scale limit')).not.toBeInTheDocument();
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('pops up an error and changes nothing when the limits would cross over', async () => {
  renderColourBar();

  await editLimit('min', '9999');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    `The lower limit must be less than the upper limit (${UPPER_LIMIT})`
  );
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('pops up an error for a limit the current colour scale cannot show', async () => {
  renderColourBar({ withLogScale: true });
  await userEvent.click(screen.getByRole('button', { name: 'Use log scale' }));

  await editLimit('min', '-5');

  expect(await screen.findByRole('alert')).toHaveTextContent('On a log scale, the lower limit');
  expect(persistedDomain()).toBe(JSON.stringify([null, null]));
});

test('ignores double clicks that are not on a limit', async () => {
  renderColourBar();

  await userEvent.dblClick(screen.getByTestId('gradient'));

  expect(screen.queryByLabelText('Upper colour-scale limit')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Lower colour-scale limit')).not.toBeInTheDocument();
});

test('hints that a limit is editable when it is hovered', async () => {
  renderColourBar();

  await userEvent.hover(screen.getByText(UPPER_LIMIT));

  expect(screen.getByText(UPPER_LIMIT)).toHaveAttribute('title', 'Double-click to edit the colour-scale limit');
});
