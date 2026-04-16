import React, { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { createRoot, type Root } from 'react-dom/client';

import type { LinePlotData } from '../../lib/types';
import PlotViewer from './Graph';

type MockLineVisProps = {
  abscissaParams?: {
    label?: string;
    scaleType?: string;
  };
  curveType?: string;
  domain?: [number, number];
  interpolation?: string;
};

const mockLineVis = vi.fn();

vi.mock('@h5web/lib', () => {
  const mockBuildDomain = (
    array: { data: ArrayLike<number> },
    _scaleType?: string,
    errors?: { data: ArrayLike<number> }
  ): [number, number] | undefined => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    Array.from(array.data).forEach((value, index) => {
      if (!Number.isFinite(value)) {
        return;
      }

      const error = errors ? Array.from(errors.data)[index] : undefined;
      const hasFiniteError = typeof error === 'number' && Number.isFinite(error);
      const low = hasFiniteError ? value - error : value;
      const high = hasFiniteError ? value + error : value;

      min = Math.min(min, low);
      max = Math.max(max, high);
    });

    return Number.isFinite(min) && Number.isFinite(max) ? [min, max] : undefined;
  };

  const ScaleType = {
    Linear: 'linear',
    Log: 'log',
    SymLog: 'symlog',
  };

  const CurveType = {
    LineOnly: 'OnlyLine',
    GlyphsOnly: 'OnlyGlyphs',
    LineAndGlyphs: 'LineAndGlyphs',
  };

  const Interpolation = {
    Linear: 'Linear',
    Constant: 'Constant',
  };

  return {
    CurveType,
    DomainWidget: ({
      onCustomDomainChange,
    }: {
      onCustomDomainChange: (domain: [number | null, number | null]) => void;
    }) => (
      <div>
        <button type="button" onClick={() => onCustomDomainChange([2.5, null])}>
          Set y min
        </button>
        <button type="button" onClick={() => onCustomDomainChange([null, null])}>
          Reset y range
        </button>
      </div>
    ),
    getDomain: mockBuildDomain,
    Interpolation,
    LineVis: (props: MockLineVisProps) => {
      mockLineVis(props);
      return <div data-testid="line-vis" />;
    },
    Menu: ({ label, children }: { label: string; children: import('react').ReactNode }) => (
      <div>
        <span>{label}</span>
        {children}
      </div>
    ),
    RadioGroup: ({
      label,
      options,
      optionsLabels,
      value,
      onChange,
    }: {
      label?: string;
      options: string[];
      optionsLabels?: Record<string, string>;
      value: string;
      onChange: (nextValue: string) => void;
    }) => (
      <div>
        {label && <span>{label}</span>}
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={option === value} onClick={() => onChange(option)}>
            {optionsLabels?.[option] ?? option}
          </button>
        ))}
      </div>
    ),
    ScaleSelector: ({
      label,
      value,
      options,
      onScaleChange,
    }: {
      label: string;
      value: string;
      options: string[];
      onScaleChange: (nextValue: string) => void;
    }) => (
      <button type="button" onClick={() => onScaleChange(options[1])}>
        {label}:{value}
      </button>
    ),
    ScaleType,
    Separator: () => <span data-testid="separator" />,
    ToggleBtn: ({ label, value, onToggle }: { label: string; value?: boolean; onToggle: () => void }) => (
      <button type="button" aria-pressed={value} onClick={onToggle}>
        {label}
      </button>
    ),
    Toolbar: ({ children }: { children: import('react').ReactNode }) => <div>{children}</div>,
    useSafeDomain: (domain: [number, number]) => [domain],
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const linePlotData: LinePlotData[] = [
  {
    filename: 'primary-file',
    data: [1, 2, 4],
    errors: [0.1, 0.2, 0.3],
  },
  {
    filename: 'secondary-file',
    data: [1.5, 3],
    errors: [0.05, 0.15],
  },
];

let mountedContainer: HTMLDivElement | null = null;
let mountedRoot: Root | null = null;

function renderPlotViewer(showErrors = false, onShowErrorsChange = vi.fn()): HTMLDivElement {
  mountedContainer = document.createElement('div');
  document.body.appendChild(mountedContainer);
  mountedRoot = createRoot(mountedContainer);

  act(() => {
    mountedRoot!.render(
      <ThemeProvider theme={createTheme()}>
        <PlotViewer linePlotData={linePlotData} showErrors={showErrors} onShowErrorsChange={onShowErrorsChange} />
      </ThemeProvider>
    );
  });

  return mountedContainer;
}

function getLastLineVisProps(): MockLineVisProps {
  return mockLineVis.mock.calls[mockLineVis.mock.calls.length - 1][0] as MockLineVisProps;
}

function getButton(container: HTMLElement, matcher: string | RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => {
    const label = candidate.textContent || '';
    return typeof matcher === 'string' ? label === matcher : matcher.test(label);
  });

  if (!button) {
    throw new Error(`Button not found: ${matcher.toString()}`);
  }

  return button;
}

function clickButton(container: HTMLElement, matcher: string | RegExp): void {
  act(() => {
    getButton(container, matcher).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  mockLineVis.mockClear();
});

afterEach(() => {
  if (mountedRoot) {
    act(() => {
      mountedRoot!.unmount();
    });
  }

  mountedRoot = null;
  mountedContainer?.remove();
  mountedContainer = null;
});

test('renders the extended 1D toolbar and labels the x axis as Index', () => {
  const container = renderPlotViewer();

  expect(container.textContent).toContain('Aspect');
  expect(container.textContent).toContain('Curve type');
  expect(container.textContent).toContain('Interpolation');
  expect(getLastLineVisProps().abscissaParams).toEqual(
    expect.objectContaining({
      label: 'Index',
      scaleType: 'linear',
    })
  );
});

test('updates LineVis props when the y range and style controls change', () => {
  const onShowErrorsChange = vi.fn();

  const container = renderPlotViewer(false, onShowErrorsChange);

  expect(getLastLineVisProps().domain).toEqual([1, 4]);

  clickButton(container, 'Set y min');
  expect(getLastLineVisProps().domain).toEqual([2.5, 4]);

  clickButton(container, 'Line + Points');
  expect(getLastLineVisProps().curveType).toBe('LineAndGlyphs');

  clickButton(container, 'Constant');
  expect(getLastLineVisProps().interpolation).toBe('Constant');

  clickButton(container, /X scale:/i);
  expect(getLastLineVisProps().abscissaParams?.scaleType).toBe('log');

  clickButton(container, 'Error bars');
  expect(onShowErrorsChange).toHaveBeenCalledWith(true);

  clickButton(container, 'Reset y range');
  expect(getLastLineVisProps().domain).toEqual([1, 4]);
});
