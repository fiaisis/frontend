import type { ScriptMarkerData, ScriptModel, ScriptMonaco } from './monaco';
import type { Diagnostic } from './scriptDiagnostics';

/**
 * The bridge between a diagnostic and a squiggle.
 *
 * Positions arrive in the units Monaco counts — 1-based lines, 1-based UTF-16 columns, exclusive end — so
 * this is a field copy with no arithmetic. That is deliberate: every conversion happened in the analysis
 * service, under test, because a column off by one puts the squiggle under the wrong word and the user
 * stops trusting the feature. If a position ever needs adjusting, it is the service that is wrong.
 *
 * `monaco` is passed in rather than imported. A value import of `monaco-editor` bundles a second copy of
 * Monaco into the plugin and hands `setModelMarkers` a different instance from the one showing the model,
 * so markers would silently never appear; see `src/lib/monaco.ts`.
 */

/**
 * The owner tag markers are filed under, which is how Monaco keeps our squiggles apart from any other
 * provider's. It has to be the same string everywhere: clearing with a different owner clears nothing and
 * leaves stale markers on screen looking like verdicts.
 */
export const MARKER_OWNER = 'fia-script-validation';

/**
 * The Monaco marker kinds we can be asked for.
 *
 * The contract has two severities because the service has two honest answers: `error` means the runner
 * will refuse this script, `warning` means a name is not one the framework binds. Both need a squiggle
 * that reads as "look here", and neither is a hint.
 */
export const toMarkerSeverity = (monaco: ScriptMonaco, severity: Diagnostic['severity']): number =>
  severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning;

export const toMarkers = (monaco: ScriptMonaco, diagnostics: Diagnostic[]): ScriptMarkerData[] =>
  diagnostics.map((diagnostic) => ({
    severity: toMarkerSeverity(monaco, diagnostic.severity),
    message: diagnostic.message,
    // Shown in the hover after the message, so a user can tell "the runner will not accept this" from
    // "that name is not part of Mantid" rather than seeing one undifferentiated squiggle.
    source: diagnostic.source,
    startLineNumber: diagnostic.start_line,
    startColumn: diagnostic.start_column,
    endLineNumber: diagnostic.end_line,
    endColumn: diagnostic.end_column,
  }));

/**
 * Show `diagnostics` on `model`, replacing only our own previous markers.
 *
 * An empty list is a real answer here — it is how "nothing wrong found" is drawn — but a null model is
 * not, which happens while the editor is still mounting and again after it has unmounted.
 */
export const setScriptMarkers = (monaco: ScriptMonaco, model: ScriptModel, diagnostics: Diagnostic[]): void => {
  if (model === null) {
    return;
  }
  monaco.editor.setModelMarkers(model, MARKER_OWNER, toMarkers(monaco, diagnostics));
};

/**
 * Take our markers off `model`, for when the editor goes away.
 *
 * Without this, markers outlive the model they were filed against in the session's marker service, and a
 * later editor showing the same script shows squiggles from a validation run that finished minutes ago.
 */
export const clearScriptMarkers = (monaco: ScriptMonaco, model: ScriptModel): void => {
  setScriptMarkers(monaco, model, []);
};
