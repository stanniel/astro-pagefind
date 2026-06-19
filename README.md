# Astro-Pagefind

[![CI](https://github.com/stanniel/astro-pagefind/actions/workflows/ci.yml/badge.svg)](https://github.com/stanniel/astro-pagefind/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@stanniel/astro-pagefind)](https://www.npmjs.com/package/@stanniel/astro-pagefind)

[Astro](https://astro.build) integration for [Pagefind](https://pagefind.app).

## Prerequisites
- Astro 6
- Static build outputs only

Pagefind indexes static HTML output. Only prerendered routes will be included in the search index.

## Features

- Build pagefind index on static build
- Serve in-memory search index in `astro dev` mode
- Full TypeScript support for pagefind client API
- Opt-in to remove emitted pagefind-ui files

## Usage

Install:

```sh
    npm i @stanniel/astro-pagefind
```

### Astro config

```ts
// astro.config.ts

import { defineConfig } from "astro/config";
import pagefind, { type PagefindConfig } from "@stanniel/astro-pagefind";

const optionalPagefindConfig: PagefindConfig = {
  ui: false, // omit key to keep ui files
  indexConfig: {
    // optional pagefind specific configuration
  },
};

export default defineConfig({
  integrations: [pagefind(optionalPagefindConfig)],
});
```

**Running `astro sync` or `astro dev` is required for the integration to emit type information.**

### Client side pagefind Search API

Client code is fully compatible with [pagefind docs](https://pagefind.app/docs/api/): 

```ts
// if you have a base path, you'll need to prepend it to the import url
const pagefind = await import("/pagefind/pagefind.js");

pagefind.init();

const search = await pagefind.search("static");
```

Note: The import can be static, but it's advised to use a dynamic import to defer loading pagefind code until it's actually needed.

### Pagefind UI

Currently the only supported way to use the emitted pagefind ui files is to statically load your stylesheet and script in `<head>`:

```html
<!-- include in <head> -->
<link href="/pagefind/pagefind-component-ui.css" rel="stylesheet" />
<script src="/pagefind/pagefind-component-ui.js" type="module"></script>
```

```astro
---
// Search.astro
---

<pagefind-modal-trigger></pagefind-modal-trigger>
<pagefind-modal></pagefind-modal>
```

Importing these files isn't currently supported as they do not exist at static build time. As imports are more suited to code subject to hot module reloading, it didn't seem worth adding more steps to the build and more vite plugins to make that happen.

#### Notes about Pagefind UI

By default, the pagefind Node API that this package uses emits pagefind ui files:

- pagefind-component-ui.css
- pagefind-component-ui.js
- pagefind-modular-ui.css
- pagefind-modular-ui.js
- pagefind-ui.css
- pagefind-ui.js

Passing `ui: false` into the integration config will omit these from the output.

Some of these files offer legacy UI options. Refer to the pagefind docs for more info.

Additional options and information can be found at [pagefind docs](https://pagefind.app/docs/search-ui/).

## Examples

Examples are located in the `/examples` directory. Running the examples requires `pnpm`.

After cloning the repository, run `pnpm i`.

Run `pnpm run --filter=example-search-api dev` for the "search api with astro transitions" version.

Or `pnpm run --filter=example-component-ui dev` for the "pagefind ui" version.

You can replace the last `dev` part with `build` and `preview` to see the production build versions.
