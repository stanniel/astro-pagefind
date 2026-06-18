export const VIRTUAL_PAGEFIND_MODULE_ID = "virtual:pagefind";
export const VIRTUAL_PAGEFIND_RESOLVED_MODULE_ID = `\0${VIRTUAL_PAGEFIND_MODULE_ID}`;
export const CLIENT_MODULE_PATTERN = /^.*pagefind\.js$/;
export const UI_JS_PATTERN = /^.*pagefind(?:-component|-modular){0,1}-ui\.js/;
export const UI_CSS_PATTERN =
  /^.*pagefind(?:-component|-modular){0,1}-ui\.css$/;
export const UI_CSS_RESOLVED_PATTERN =
  /^\0.*pagefind(?:-component|-modular){0,1}-ui\.css$/;

export const CONTENT_TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".pf_index": "application/octet-stream",
  ".pf_fragment": "application/octet-stream",
  ".pf_meta": "application/octet-stream",
  ".pf_filter": "application/octet-stream",
};

export const PAGEFIND_STATE = Symbol.for("internal.pagefind.state");

export const UI_FILES = [
  "pagefind-component-ui.css",
  "pagefind-component-ui.js",
  "pagefind-modular-ui.css",
  "pagefind-modular-ui.js",
  "pagefind-ui.css",
  "pagefind-ui.js",
];

export const PAGEFIND_HMR_EVENT = "astro-pagefind:update";
