import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import ScriptDiagnosticsStatus from './ScriptDiagnosticsStatus';

import type { Diagnostic } from '../../lib/scriptDiagnostics';
import type { ScriptDiagnostics } from '../../lib/useScriptDiagnostics';

const diagnostic: Diagnostic = {
  message: 'invalid syntax',
  severity: 'error',
  source: 'compile',
  start_line: 1,
  start_column: 6,
  end_line: 1,
  end_column: 7,
};

const state = (overrides: Partial<ScriptDiagnostics> = {}): ScriptDiagnostics => ({
  status: 'idle',
  diagnostics: [],
  parses: null,
  truncated: false,
  retryAfterSeconds: null,
  ...overrides,
});

describe('ScriptDiagnosticsStatus', () => {
  // Testing Library's automatic cleanup hooks up through Vitest globals, which this repo does not enable,
  // so without this every render in the file stays in the document and the queries below match earlier tests.
  afterEach(() => {
    cleanup();
  });

  test('says nothing before there is anything to say', () => {
    const { container } = render(<ScriptDiagnosticsStatus diagnostics={state()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('says when a check is in flight', () => {
    render(<ScriptDiagnosticsStatus diagnostics={state({ status: 'checking' })} />);
    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  test('says when the script is clean', () => {
    render(<ScriptDiagnosticsStatus diagnostics={state({ status: 'valid' })} />);
    expect(screen.getByText('No problems found')).toBeInTheDocument();
  });

  test('counts the problems it found', () => {
    render(
      <ScriptDiagnosticsStatus diagnostics={state({ status: 'problems', parses: true, diagnostics: [diagnostic] })} />
    );
    expect(screen.getByText('1 problem')).toBeInTheDocument();
  });

  test('uses the plural when there is more than one', () => {
    render(
      <ScriptDiagnosticsStatus
        diagnostics={state({ status: 'problems', parses: true, diagnostics: [diagnostic, diagnostic] })}
      />
    );
    expect(screen.getByText('2 problems')).toBeInTheDocument();
  });

  test('says the script will not run, rather than counting, when it does not parse', () => {
    // Before pressing a button that submits the job, the distinction that matters is that the runner stops
    // before it starts — not how many complaints there were.
    render(
      <ScriptDiagnosticsStatus
        diagnostics={state({ status: 'problems', parses: false, diagnostics: [diagnostic, diagnostic] })}
      />
    );
    expect(screen.getByText('Will not run')).toBeInTheDocument();
    expect(screen.queryByText('2 problems')).not.toBeInTheDocument();
  });

  test('says the checker is still starting, rather than nothing', () => {
    // Silence here would read as "no problems found" while the service is cold.
    render(<ScriptDiagnosticsStatus diagnostics={state({ status: 'warming_up' })} />);
    expect(screen.getByText('Checker starting')).toBeInTheDocument();
  });

  test('says checks are paused after being told to back off', () => {
    render(<ScriptDiagnosticsStatus diagnostics={state({ status: 'rate_limited', retryAfterSeconds: 3 })} />);
    expect(screen.getByText('Pausing checks')).toBeInTheDocument();
  });

  test('says a script too large to check is not being checked', () => {
    render(<ScriptDiagnosticsStatus diagnostics={state({ status: 'too_large' })} />);
    expect(screen.getByText('Script too large to check')).toBeInTheDocument();
  });

  test('says the checker is unavailable rather than implying the script is clean', () => {
    for (const status of ['timeout', 'unavailable', 'malformed'] as const) {
      render(<ScriptDiagnosticsStatus diagnostics={state({ status })} />);
      expect(screen.getByText('Checker unavailable')).toBeInTheDocument();
      cleanup();
    }
  });

  test('announces the verdict, which is the only way to learn it without sight of the squiggles', () => {
    render(<ScriptDiagnosticsStatus diagnostics={state({ status: 'valid' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('No problems found');
  });
});
