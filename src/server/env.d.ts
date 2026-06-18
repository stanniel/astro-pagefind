/// <reference types="astro/client" />

import { PAGEFIND_STATE } from "./consts.js";
import type { PagefindStateInstance } from "./state.js";

declare global {
  namespace App {
    interface Locals {
      [PAGEFIND_STATE]?: PagefindStateInstance;
    }
  }
}
