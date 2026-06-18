import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, ViteUserConfig } from "astro";
import {
  createIndex,
  type PagefindIndex,
  type PagefindServiceConfig,
} from "pagefind";
import {
  CLIENT_MODULE_PATTERN,
  PAGEFIND_HMR_EVENT,
  PAGEFIND_STATE,
  UI_CSS_PATTERN,
  UI_FILES,
} from "./consts.js";
import { getStateInstance } from "./state.js";
import type { PagefindConfig } from "./types.js";
import { vitePluginsPagefind } from "./vite-plugins.js";

export type { PagefindServiceConfig } from "pagefind";
export { PAGEFIND_HMR_EVENT } from "./consts.js";
export type { PagefindConfig } from "./types.js";

export default function pagefind(config?: PagefindConfig): AstroIntegration {
  const state = getStateInstance(config);
  let resolvedBase = "";

  return {
    name: "pagefind",
    hooks: {
      "astro:config:setup": async ({
        config,
        addMiddleware,
        updateConfig,
        command,
        logger,
      }) => {
        if (config.output === "server") {
          logger.warn(
            `Output type "server" is not compatible with @stanniel/astro-pagefind. It only works for static outputs.`,
          );
        }

        await state.init;
        state.setLogger(logger);

        const external: Partial<ViteUserConfig> =
          command === "dev"
            ? {}
            : {
                build: {
                  rollupOptions: {
                    external: [CLIENT_MODULE_PATTERN, UI_CSS_PATTERN],
                  },
                },
              };

        updateConfig({
          vite: {
            ...external,
            plugins: vitePluginsPagefind(command, state),
          },
        });

        const entrypoint = fileURLToPath(
          new URL("./indexing-middleware.js", import.meta.url),
        );
        addMiddleware({ entrypoint, order: "post" });
      },
      "astro:config:done": async ({ config, injectTypes }) => {
        resolvedBase = config.base;

        injectTypes({
          filename: "pagefind.d.ts",
          content: `/// <reference types="@stanniel/astro-pagefind/pagefind.d.ts" />`,
        });
      },
      "astro:server:setup": async ({ server, logger }) => {
        await state.init;
        state.setLogger(logger);

        const clientLocalsSymbol = Symbol.for("astro.locals");

        state.removeAllListeners();
        state.on("change", () => {
          server.hot.send(PAGEFIND_HMR_EVENT);

          // if client side pagefind.js ever stops being static from the Pagefind Node API
          // const clientModuleGraph = server.environments.client.moduleGraph;
          // const mod = clientModuleGraph.getModuleById(
          //   VIRTUAL_PAGEFIND_RESOLVED_MODULE_ID,
          // );
          // if (mod) {
          //   server.environments.client.reloadModule(mod);
          // }
        });

        server.middlewares.use(async (req, res, next) => {
          if (!req.originalUrl) return next();

          const locals: App.Locals | undefined = Reflect.get(
            req,
            clientLocalsSymbol,
          );
          if (locals) Reflect.set(locals, PAGEFIND_STATE, state);
          else
            Reflect.set(req, clientLocalsSymbol, { [PAGEFIND_STATE]: state });

          const pagefindRoute = path.posix.join(resolvedBase, "/pagefind/");
          if (!req.originalUrl.startsWith(pagefindRoute)) return next();

          const { pathname: url } = new URL(
            req.originalUrl,
            "http://localhost",
          );
          const fileName = url.replace(pagefindRoute, "");

          const file = await state.getFile(fileName);
          if (file) {
            res.writeHead(200, {
              "content-type": file.contentType || "application/octet-stream",
            });
            res.end(file.content);
            return;
          }

          return next();
        });
      },
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const logError = logger.error.bind(logger);

        const [index, indexErr] = await createIndexStep(config?.indexConfig);
        if (indexErr) return indexErr.forEach(logError);

        const [pageCount, dirErr] = await addDirectoryStep(index, outDir);
        if (dirErr) return dirErr.forEach(logError);

        logger.info(`Indexed ${pageCount} pages`);

        const writeDir = path.join(outDir, "pagefind");
        const [outputPath, writeErr] = await writeFilesStep(index, writeDir);
        if (writeErr) return writeErr.forEach(logError);

        if (config?.ui === false) {
          await removeUIFilesStep(outputPath);
        }

        logger.info(`Wrote index to ${outputPath}`);
      },
    },
  };
}

//

async function createIndexStep(config?: PagefindServiceConfig) {
  const { index, errors } = await createIndex(config);
  if (!index || errors.length > 0) {
    return [null, ["Failed to create index", ...errors]] as const;
  }
  return [index, null] as const;
}

async function addDirectoryStep(index: PagefindIndex, path: string) {
  const { page_count, errors } = await index.addDirectory({
    path,
  });
  if (errors.length > 0) {
    return [null, ["Failed to index files", ...errors]] as const;
  }
  return [page_count, null] as const;
}

async function writeFilesStep(index: PagefindIndex, outputPath: string) {
  const { outputPath: path, errors } = await index.writeFiles({
    outputPath,
  });
  if (errors.length > 0) {
    return [null, ["Failed to write index", ...errors]] as const;
  }
  return [path, null] as const;
}

function removeUIFilesStep(pagefindDir: string) {
  return Promise.all(
    UI_FILES.map((file) =>
      fs.rm(path.join(pagefindDir, file), { force: true }),
    ),
  );
}
