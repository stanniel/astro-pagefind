import * as pagefind from "virtual:pagefind";
import { PAGEFIND_HMR_EVENT } from "../server/consts.js";

const _pf = pagefind;
let _opts: pagefind.PagefindIndexOptions = {};
let _initted = false;

/** Wait for the main instance to finish initializing (WASM load, etc.) */
export async function init() {
  await _pf.init();
  _initted = true;
}

/** Destroy the main instance and terminate its worker */
export async function destroy() {
  await _pf.destroy();
  _opts = {};
  _initted = false;
}

/** Search the main instance's index */
export const search: pagefind.PagefindSearchFn = (...args) => {
  _initted = true;
  return _pf.search(...args);
};

/** Debounced search — returns null if superseded by a newer call */
export const debouncedSearch: pagefind.PagefindDebounceSearchFn = (...args) => {
  _initted = true;
  return _pf.debouncedSearch(...args);
};

/** Retrieve all available filter values and counts */
export const filters: pagefind.PagefindFiltersFn = (...args) => {
  _initted = true;
  return _pf.filters(...args);
};

/** Merge an additional index into the main instance */
export const mergeIndex: pagefind.PagefindMergeIndexFn = (...args) => {
  _initted = true;
  return _pf.mergeIndex(...args);
};

/** Update options for the main instance */
export const options: pagefind.PagefindOptionsFn = (options) => {
  Object.assign(_opts, options);
  return _pf.options(options);
};

/** Preload index chunks for a search term without returning results */
export const preload: pagefind.PagefindPreloadFn = (...args) => {
  _initted = true;
  return _pf.preload(...args);
};

/**
 * Creates an independent Pagefind instance with its own configuration.
 * Use this when you need multiple search instances on the same page
 * with different options.
 * All instances share a single web worker and WASM module internally.
 */
export const createInstance: pagefind.PagefindCreateInstanceFn = (...args) =>
  _pf.createInstance(...args);

//

if (import.meta.hot) {
  // pagefind.js code is assumed static and re-initialized on index change
  import.meta.hot.on(PAGEFIND_HMR_EVENT, async () => {
    if (!_initted) return;

    await _pf.destroy();
    await _pf.options(_opts);
    await _pf.init();
  });

  // if client side pagefind.js ever stops being static from the Pagefind Node API
  // import.meta.hot.accept("virtual:pagefind", async (mod) => {
  //   if (!mod) return;

  //   const newPf = mod as unknown as typeof pagefind;

  //   if (_initted) {
  //     await _pf.destroy();
  //     await newPf.options(_opts);
  //     await newPf.init();
  //   }

  //   _pf = newPf;
  // });
}
