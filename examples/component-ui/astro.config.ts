import pagefind from "@stanniel/astro-pagefind";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [pagefind()],
});
