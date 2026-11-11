import type { ScriptMarkerData, ScriptModel, ScriptMonaco } from './monaco';
import type { Diagnostic } from './scriptDiagnostics';

/**
 * Puts the checker's findings on the model as squiggles.
 *
 * Positions arrive in Monaco's own units — 1-based lines, 1-based UTF-16 columns, exclusive end — so this is
 * a field copy with no arithmetic. Every conversion happened in the analysis service, under test, because a
 * column off by one puts the squiggle under the wrong word and users stop trusting the feature. If a
 * position ever looks wrong, that is where to fix it.
 *
 * `monaco` is passed in rather than imported; see `src/lib/monaco.ts`.
 */

/**
 * How Monaco keeps our squiggles apart from other providers'. It has to be the same string everywhere:
 * clearing with a different owner clears nothing and leaves stale markers looking like verdicts.
 */
export const MARKER_OWNER = 'fia-script-validation';

/** Two severities because the service has two honest answers: the runner will refuse this, or that name is not one the framework binds. */
export const toMarkerSeverity = (monaco: ScriptMonaco, severity: Diagnostic['severity']): number =>
  severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning;

export const toMarkers = (monaco: ScriptMonaco, diagnostics: Diagnostic[]): ScriptMarkerData[] =>
  diagnostics.map((diagnostic) => ({
    severity: toMarkerSeverity(monaco, diagnostic.severity),
    message: diagnostic.message,
    // Shown after the message in the hover, so "the runner will not accept this" reads differently from
    // "that name is not part of Mantid".
    source: diagnostic.source,
    startLineNumber: diagnostic.start_line,
    startColumn: diagnostic.start_column,
    endLineNumber: diagnostic.end_line,
    endColumn: diagnostic.end_column,
  }));

/**
 * Show `diagnostics` on `model`, replacing only our own previous markers. An empty list is a real answer —
 * it is how "nothing wrong found" is drawn — but a null model is not, which happens while the editor mounts
 * and after it unmounts.
 */
export const setScriptMarkers = (monaco: ScriptMonaco, model: ScriptModel, diagnostics: Diagnostic[]): void => {
  if (model === null) {
    return;
  }
  monaco.editor.setModelMarkers(model, MARKER_OWNER, toMarkers(monaco, diagnostics));
};

/** Markers outlive their model in the session's marker service, so a script opened again would otherwise show squiggles from a run that finished minutes ago. */
export const clearScriptMarkers = (monaco: ScriptMonaco, model: ScriptModel): void => {
  setScriptMarkers(monaco, model, []);
};
