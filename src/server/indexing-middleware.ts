import type { MiddlewareHandler } from "astro";
import { PAGEFIND_STATE } from "./consts.js";

export const onRequest: MiddlewareHandler = async (
  { url, locals, isPrerendered },
  next,
) => {
  const response = await next();
  if (!isPrerendered) return response;

  const state = locals[PAGEFIND_STATE];
  const isHtml = response.headers.get("Content-Type")?.includes("text/html");

  if (state && isHtml && response.status === 200) {
    // fire and forget
    response
      .clone()
      .text()
      .then((content) => {
        if (!content) return;
        return state.addHtmlFile({ url: url.pathname, content });
      })
      .catch(() => {
        // .text() shouldn't fail, but fail silently just in case
      });
  }

  return response;
};
