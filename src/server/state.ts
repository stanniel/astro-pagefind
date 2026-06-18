import EventEmitter from "node:events";
import path from "node:path";
import { setTimeout } from "node:timers";
import { isDeepStrictEqual } from "node:util";
import type { AstroIntegrationLogger } from "astro";
import type { HTMLFile, IndexFile } from "pagefind";
import {
  type PagefindIndex,
  type PagefindServiceConfig,
  createIndex as pagefindCreateIndex,
} from "pagefind";
import { CONTENT_TYPES, UI_FILES } from "./consts.js";
import type { PagefindConfig } from "./types.js";

// state

type StateEventMap = { change: [] };

const _emitter = new EventEmitter<StateEventMap>();
let _config: PagefindConfig = {};
let _index: PagefindIndex | null = null;
let _files = new Map<string, PagefindFile>();
const _cache = new Map<string, string>();
// Tried to be too clever with the promise chain for managing async work
// TODO: rethink the whole setup
// maybe make a state machine with a status state: idle | creating | writing | flushing
let _workActive = Promise.resolve();
let _timer: NodeJS.Timeout | null = null;
let _logger: AstroIntegrationLogger | Console = console;
let _generation = 0;

export function getStateInstance(
  config?: PagefindConfig,
): PagefindStateInstance {
  let init = Promise.resolve();
  if (!_index || !isDeepStrictEqual(config, _config)) {
    init = _createIndex(config?.indexConfig).then((index) => {
      if (!index) return _logger.error("Failed to createIndex");
      _index = index;
      return _getFiles(index).then(_setFiles);
    });

    _workActive = _workActive.then(() => init);
  }

  if (config) _config = config;

  return {
    init: init,
    on: _emitter.on.bind(_emitter),
    removeAllListeners: _emitter.removeAllListeners.bind(_emitter),
    addHtmlFile,
    getFile,
    setLogger,
  };
}

type StateEmitter = typeof _emitter;

export interface PagefindStateInstance {
  init: Promise<void>;
  on: StateEmitter["on"];
  removeAllListeners: StateEmitter["removeAllListeners"];
  addHtmlFile(htmlFile: HTMLFile): Promise<void>;
  getFile(fileName: string): Promise<PagefindFile | undefined>;
  setLogger(logger: AstroIntegrationLogger): void;
}

// public methods

function setLogger(logger: AstroIntegrationLogger) {
  _logger = logger;
}

function addHtmlFile(htmlFile: {
  content: string;
  url: string;
}): Promise<void> {
  const { content, url } = htmlFile;

  const existingHtml = _cache.get(url);
  if (existingHtml === content) return _workActive;

  _cache.set(url, content);

  const isUpdate = existingHtml !== undefined;
  if (!isUpdate) {
    _workActive = _workActive.then(() => _add(htmlFile));
    return _workActive;
  }

  if (_timer) {
    _timer.refresh();
  } else {
    const rebuildPromise = new Promise<void>((resolve) => {
      _timer = setTimeout(async () => {
        _timer = null;
        await _rebuild();
        resolve();
      }, 150);
    });

    _workActive = _workActive.then(() => rebuildPromise);
  }

  return _workActive;
}

async function getFile(fileName: string): Promise<PagefindFile | undefined> {
  await _workActive;
  const file = _files.get(fileName);
  return file;
}

// private helpers

type PagefindFile = { contentType: string; content: Uint8Array };

function _emitChangeEvent() {
  _emitter.emit("change");
}

async function _add(htmlFile: HTMLFile) {
  const gen = _generation;
  if (!_index) return;

  const { errors } = await _index.addHTMLFile(htmlFile);
  if (errors.length > 0) {
    _logger.error("pagefind state: failed to add html file");
    return;
  }

  if (gen !== _generation) return;
  const files = await _getFiles(_index);
  if (gen !== _generation) return;

  _setFiles(files);
  _emitChangeEvent();
}

async function _rebuild() {
  const gen = ++_generation;
  const index = await _createIndex(_config.indexConfig);
  if (!index) return;
  if (gen !== _generation) return;

  await Promise.all(
    _cache
      .entries()
      .map(([url, content]) => index.addHTMLFile({ url, content }))
      .toArray(),
  );
  if (gen !== _generation) return;

  _index?.deleteIndex();
  _index = index;
  const files = await _getFiles(index);
  if (gen !== _generation) return;

  _setFiles(files);
  _emitChangeEvent();
}

function _setFiles(files: IndexFile[]) {
  const filteredFiles =
    _config.ui !== false
      ? files
      : files.filter((f) => !UI_FILES.includes(f.path));

  _files = new Map<string, PagefindFile>(
    filteredFiles.map(({ path: filePath, content }) => {
      let contentType =
        (CONTENT_TYPES as Record<string, string>)[path.extname(filePath)] ?? "";
      if (filePath.startsWith("wasm.")) contentType = CONTENT_TYPES[".wasm"];
      return [
        filePath,
        {
          content,
          contentType,
        },
      ];
    }),
  );
}

async function _createIndex(config?: PagefindServiceConfig) {
  const { index, errors } = await pagefindCreateIndex(config);
  if (!index) {
    _logger.error("Failed to create index");
    errors.forEach(_logger.error.bind(_logger));

    return null;
  }
  return index;
}

async function _getFiles(index: PagefindIndex) {
  const { files, errors } = await index.getFiles();
  if (errors.length > 0) {
    _logger.error("Failed to get files");
    errors.forEach(_logger.error.bind(_logger));
    return [];
  }
  return files;
}
