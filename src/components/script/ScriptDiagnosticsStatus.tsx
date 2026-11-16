import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import Typography from '@mui/material/Typography';
import React from 'react';

import type { ScriptDiagnostics } from '../../lib/useScriptDiagnostics';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Theme } from '@mui/material/styles';

/**
 * The one line saying what the Python checker thinks, and whether it managed to think at all.
 *
 * Advisory by construction: it sits next to Save and "Rerun with changes" and disables neither, because the
 * checker cannot model facility code and a gate on its opinion would stop valid scripts running.
 * The "not thinking" states are shown rather than hidden — quietly degraded validation is worse than
 * visibly absent validation.
 */

type PresentationColour = 'success' | 'warning' | 'error' | 'muted';

type Presentation = {
  icon: SvgIconComponent;
  label: string;
  /** Longer wording for the tooltip and the accessible name. */
  detail: string;
  colour: PresentationColour;
};

// MUI's `action` palette is a set of states rather than a colour with a `main` to read, so the states that
// are not a verdict get ordinary secondary text.
const colourFor = (theme: Theme, colour: PresentationColour): string =>
  colour === 'muted' ? theme.palette.text.secondary : theme.palette[colour].main;

const pluralProblems = (count: number): string => `${count} problem${count === 1 ? '' : 's'}`;

const presentationFor = (diagnostics: ScriptDiagnostics): Presentation | null => {
  switch (diagnostics.status) {
    case 'checking':
      return {
        icon: SyncOutlinedIcon,
        label: 'Checking…',
        detail: 'Checking this script',
        colour: 'muted',
      };
    case 'valid':
      return {
        icon: CheckCircleOutlineIcon,
        label: 'No problems found',
        detail: 'No problems found in this script',
        colour: 'success',
      };
    case 'problems':
      // The distinction that matters before pressing Save: a syntax error stops the runner before it
      // starts; an undefined name only matters if the line is ever reached.
      return diagnostics.parses
        ? {
            icon: BugReportOutlinedIcon,
            label: pluralProblems(diagnostics.diagnostics.length),
            detail: `${pluralProblems(diagnostics.diagnostics.length)} found — hover the highlighted text`,
            colour: 'warning',
          }
        : {
            icon: ErrorOutlineIcon,
            label: 'Will not run',
            detail: 'This script has a syntax error, so the runner will reject it before it starts',
            colour: 'error',
          };
    case 'warming_up':
      return {
        icon: HourglassEmptyOutlinedIcon,
        label: 'Checker starting',
        detail: 'The script checker is still starting up — squiggles from the last check are still shown',
        colour: 'muted',
      };
    case 'rate_limited':
      return {
        icon: HourglassEmptyOutlinedIcon,
        label: 'Pausing checks',
        detail: 'Too many checks in a short time — resuming shortly, squiggles may be out of date',
        colour: 'muted',
      };
    case 'too_large':
      return {
        icon: ErrorOutlineIcon,
        label: 'Script too large to check',
        detail: 'This script is larger than the checker accepts, so it is not being checked',
        colour: 'muted',
      };
    case 'forbidden':
      return {
        icon: ErrorOutlineIcon,
        label: 'Cannot check this script',
        detail: 'You are not allowed to run the script checker',
        colour: 'muted',
      };
    case 'timeout':
    case 'unavailable':
    case 'malformed':
      return {
        icon: ErrorOutlineIcon,
        label: 'Checker unavailable',
        detail: 'The script checker is not answering, so the squiggles shown may be out of date',
        colour: 'muted',
      };
    case 'idle':
      return null;
  }
};

const ScriptDiagnosticsStatus: React.FC<{ diagnostics: ScriptDiagnostics }> = ({ diagnostics }) => {
  const presentation = presentationFor(diagnostics);

  if (presentation === null) {
    return null;
  }

  const Icon = presentation.icon;

  return (
    <Typography
      variant="caption"
      component="span"
      // Announced when the verdict changes, which is the only way a screen reader user learns a syntax
      // error turned up in what they just typed.
      role="status"
      aria-live="polite"
      title={presentation.detail}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        color: (theme: Theme) => colourFor(theme, presentation.colour),
        whiteSpace: 'nowrap',
      }}
    >
      <Icon fontSize="small" />
      {presentation.label}
    </Typography>
  );
};

export default ScriptDiagnosticsStatus;
