import { Alert, Box, InputBase, Snackbar, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { findColourBarBound, getBoundText, otherBound, parseBoundText, withCustomBound } from './colourBarBounds';
import { useHeatmapConfig } from '../../h5web/packages/app/src/vis-packs/core/heatmap/config';
import { clampBound, SCALES_VALID_MINS } from '../../h5web/packages/lib/src/vis/utils';
import { getJobTableChromeColors } from '../jobs/constants';

import type { ColourBarBound, ColourBarBoundHit } from './colourBarBounds';

const LIMIT_LABELS: Record<ColourBarBound, string> = { min: 'lower limit', max: 'upper limit' };
const ACCESSIBILITY_LABELS: Record<ColourBarBound, string> = {
  min: 'Lower colour-scale limit',
  max: 'Upper colour-scale limit',
};
const LIMIT_HINT = 'Double-click to edit the colour-scale limit';
const EDITOR_HINT = 'Enter to apply, Esc to cancel, "auto" to hand the limit back to the data';

/** A limit can be handed back to automatic scaling, as with the toolbar widget's autoscale toggles. */
const AUTO_INPUT = /^auto(matic)?$/i;

const MIN_EDITOR_WIDTH = 112;
const MIN_EDITOR_HEIGHT = 24;
const EDITOR_MARGIN = 8;

interface EditingBound extends ColourBarBoundHit {
  /** What H5Web displayed when the editor opened; cancelling restores it untouched. */
  text: string;
  fontSize: string;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/**
 * Overlay geometry: the editor covers the limit label it was opened from, centred on it so it stays
 * anchored to the number being replaced, and pulled back into the viewport at the screen edges.
 */
const editorGeometry = (rect: DOMRect): { width: number; height: number; left: number; top: number } => {
  const width = Math.max(Math.round(rect.width) + 56, MIN_EDITOR_WIDTH);
  const height = Math.max(Math.round(rect.height) + 6, MIN_EDITOR_HEIGHT);

  return {
    width,
    height,
    left: clamp(
      rect.left + rect.width / 2 - width / 2,
      EDITOR_MARGIN,
      Math.max(EDITOR_MARGIN, window.innerWidth - width - EDITOR_MARGIN)
    ),
    top: Math.round(rect.top + rect.height / 2 - height / 2),
  };
};

/**
 * Makes the limits H5Web prints at either end of a heatmap's colour bar editable in place: double-click
 * the number above the bar to set the upper limit, the one below it to set the lower limit.
 *
 * A typed limit is written to H5Web's own persisted heatmap `customDomain` — the same store the
 * toolbar's domain widget reads and writes — so both controls always agree and the limit survives a
 * file change or a reload, exactly as a limit set from the toolbar does. Typing `auto` (or clearing
 * the field) hands that limit back to automatic scaling. An input H5Web would reject (not a number,
 * outside the current scale, or the wrong way round) pops up an error and changes nothing.
 *
 * The labels belong to H5Web, so the editor is rendered as a portal rather than as a child of them,
 * and is positioned over the label instead of replacing it. It is mounted around the visualization in
 * `DatasetVisualizer`, which covers the 2D viewer of both the experiment viewer and the live data
 * viewer, and switches itself off when H5Web's colour-bar markup cannot be found.
 */
const EditableColourBarBounds: React.FC<React.PropsWithChildren> = ({ children }): JSX.Element => {
  const theme = useTheme();
  const chrome = getJobTableChromeColors(theme.palette.mode);
  const { customDomain, scaleType, setCustomDomain } = useHeatmapConfig();
  const [editing, setEditing] = useState<EditingBound | undefined>(undefined);
  const [rect, setRect] = useState<DOMRect | undefined>(undefined);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const close = useCallback((): void => {
    setEditing(undefined);
    setRect(undefined);
    setValue('');
  }, []);

  /** Close the editor with nothing changed, and say why. */
  const reject = useCallback(
    (message: string): void => {
      close();
      setError(message);
    },
    [close]
  );

  const open = (hit: ColourBarBoundHit): void => {
    const text = hit.element.textContent ?? '';
    const { fontSize } = window.getComputedStyle(hit.element);

    setEditing({ ...hit, text, fontSize });
    setRect(hit.element.getBoundingClientRect());
    setValue(text.trim());
    setError(null);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const hit = findColourBarBound(event.target);
    if (!hit) {
      return;
    }

    event.preventDefault();
    event.target.ownerDocument.defaultView?.getSelection()?.removeAllRanges();
    open(hit);
  };

  // The labels are H5Web's own elements, so their hint is attached on hover rather than rendered.
  const handlePointerOver = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target instanceof HTMLElement) {
      findColourBarBound(event.target)?.element.setAttribute('title', LIMIT_HINT);
    }
  };

  useEffect((): (() => void) | undefined => {
    if (!editing) {
      return undefined;
    }

    const { element } = editing;
    const measure = (): void => {
      if (!element.isConnected) {
        // The visualization (and with it the label) went away — e.g. a refresh replaced the data.
        close();
        return;
      }

      setRect(element.getBoundingClientRect());
    };

    inputRef.current?.focus();
    inputRef.current?.select();

    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [editing, close]);

  const submit = (): void => {
    if (!editing) {
      return;
    }

    const { bar, bound, text } = editing;
    const label = LIMIT_LABELS[bound];
    const input = value.trim();

    if (input === text.trim()) {
      // H5Web shows limits to three significant figures, so an unchanged input must not be committed:
      // it would otherwise replace the real limit with the rounded number on screen.
      close();
      return;
    }

    if (input === '' || AUTO_INPUT.test(input)) {
      setCustomDomain(withCustomBound(customDomain, bound, null));
      close();
      return;
    }

    const parsed = parseBoundText(input);
    if (parsed === undefined) {
      reject(`Enter a number for the ${label}, or "auto" to hand it back to the data.`);
      return;
    }

    if (parsed < SCALES_VALID_MINS[scaleType]) {
      const minimum = SCALES_VALID_MINS[scaleType] > 0 ? 'greater than 0' : '0 or greater';
      reject(`On a ${scaleType} scale, the ${label} must be ${minimum}.`);
      return;
    }

    const otherText = getBoundText(bar, otherBound(bound))?.trim();
    const other = parseBoundText(otherText ?? '');
    const isOrdered = bound === 'min' ? parsed < (other ?? -Infinity) : parsed > (other ?? Infinity);
    if (!isOrdered) {
      const comparison = bound === 'min' ? 'less than' : 'greater than';
      const otherLabel = LIMIT_LABELS[otherBound(bound)];
      const shown = otherText ? ` (${otherText})` : '';
      reject(`The ${label} must be ${comparison} the ${otherLabel}${shown}.`);
      return;
    }

    setCustomDomain(withCustomBound(customDomain, bound, clampBound(parsed)));
    close();
  };

  const hideError = (): void => setError(null);
  const geometry = rect ? editorGeometry(rect) : undefined;

  return (
    <Box sx={{ display: 'contents' }} onDoubleClick={handleDoubleClick} onPointerOver={handlePointerOver}>
      {children}

      {editing && rect && geometry
        ? createPortal(
            <Box
              component="form"
              sx={{
                position: 'fixed',
                left: geometry.left,
                top: geometry.top,
                width: geometry.width,
                height: geometry.height,
                boxSizing: 'border-box',
                zIndex: theme.zIndex.modal,
                border: `1px solid ${chrome.accent}`,
                backgroundColor: chrome.surface,
                boxShadow: `0 2px 8px ${alpha('#000000', 0.35)}`,
              }}
              onSubmit={(event: React.FormEvent<HTMLDivElement>) => {
                event.preventDefault();
                submit();
              }}
              onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter') {
                  // Apply explicitly rather than relying on the form's implicit submission.
                  event.preventDefault();
                  submit();
                }

                if (event.key === 'Escape') {
                  // Keep H5Web's own Escape handlers (reset zoom, domain widget) out of it.
                  event.stopPropagation();
                  close();
                }
              }}
            >
              <InputBase
                inputRef={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onBlur={close}
                fullWidth
                sx={{
                  height: '100%',
                  px: 0.5,
                  boxSizing: 'border-box',
                  color: chrome.text,
                  fontSize: editing.fontSize || undefined,
                  '& input': { padding: 0, fontSize: 'inherit', textAlign: 'right' },
                }}
                inputProps={{
                  'aria-label': ACCESSIBILITY_LABELS[editing.bound],
                  title: EDITOR_HINT,
                  spellCheck: false,
                  autoComplete: 'off',
                }}
              />
            </Box>,
            document.body
          )
        : null}

      <Snackbar
        open={error !== null}
        autoHideDuration={6000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            hideError();
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {error ? (
          <Alert
            onClose={hideError}
            severity="error"
            sx={{ width: '100%', borderRadius: 0, border: '1px solid', borderColor: 'currentColor', boxShadow: 'none' }}
          >
            {error}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default EditableColourBarBounds;
