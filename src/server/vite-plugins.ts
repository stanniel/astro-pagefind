import { fileURLToPath } from "node:url";
import type { AstroIntegration, ViteUserConfig } from "astro";
import {
  CLIENT_MODULE_PATTERN,
  VIRTUAL_PAGEFIND_MODULE_ID,
  VIRTUAL_PAGEFIND_RESOLVED_MODULE_ID,
} from "./consts.js";
import type { PagefindStateInstance } from "./state.js";

export function vitePluginsPagefind(
  command: Command,
  state: PagefindStateInstance,
): Plugins {
  return [
    {
      name: "vite-plugin-pagefind",
      applyToEnvironment(environment) {
        return environment.name === "client";
      },
      resolveId: {
        filter: {
          id: new RegExp(`^${VIRTUAL_PAGEFIND_MODULE_ID}$`),
        },
        handler() {
          if (command !== "dev") {
            throw new Error(
              "virtual:pagefind cannot be used outside of dev mode",
            );
          }
          return VIRTUAL_PAGEFIND_RESOLVED_MODULE_ID;
        },
      },
      load: {
        filter: {
          id: new RegExp(`^${VIRTUAL_PAGEFIND_RESOLVED_MODULE_ID}$`),
        },
        async handler() {
          const file = await state.getFile("pagefind.js");
          if (!file) return;

          return {
            code: Buffer.from(file.content).toString("utf8"),
            map: null,
          };
        },
      },
      transform(code, id) {
        if (id !== VIRTUAL_PAGEFIND_RESOLVED_MODULE_ID) return;
        return { code, map: null };
      },
    },
    {
      name: "vite-plugin-pagefind-client",
      applyToEnvironment(environment) {
        return environment.name === "client";
      },
      resolveId: {
        filter: { id: CLIENT_MODULE_PATTERN },
        async handler(source, importer, _options) {
          if (command !== "dev") return { id: source, external: true };

          const file = fileURLToPath(
            new URL("../client/index.js", import.meta.url),
          );
          const resolved = await this.resolve(file, importer, {
            skipSelf: true,
          });

          return resolved ?? { id: file };
        },
      },
    },
    // maybe todo: pagefind ui import support (would require a dummy index in build)
    // {
    //   name: "vite-plugin-pagefind-ui-css",
    //   applyToEnvironment(environment) {
    //     return environment.name === "client" || environment.name === "ssr";
    //   },
    //   resolveId: {
    //     filter: { id: UI_CSS_PATTERN },
    //     async handler(source, _importer, _options) {
    //       return `\0${source}`;
    //     },
    //   },
    //   load: {
    //     filter: { id: UI_CSS_RESOLVED_PATTERN },
    //     async handler(id) {
    //       const lastSlashIndex = id.lastIndexOf("/");
    //       const fileName = id.slice(lastSlashIndex + 1);
    //       const file = await state.getFile(fileName);

    //       if (!file) return null;

    //       return Buffer.from(file.content).toString("utf8");
    //     },
    //   },
    // },
    // {
    //   name: "vite-plugin-pagefind-ui-js",
    //   applyToEnvironment(environment) {
    //     return environment.name === "client";
    //   },
    //   resolveId: {
    //     filter: { id: UI_JS_PATTERN },
    //     async handler(source, _importer, _options) {
    //       return { id: source, external: true };
    //     },
    //   },
    // },
  ];
}

//

type Plugins = NonNullable<ViteUserConfig["plugins"]>;
type Command = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0]["command"];
