/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly REACT_APP_FIA_DATA_VIEWER_URL?: string;
  readonly REACT_APP_PLUGIN_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
