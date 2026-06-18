import { describe, expect, test, vi } from "vitest";
import { getStateInstance } from "../src/server/state.js";
import { expectDefined, expectUndefined, html } from "./test-utils.js";

const SAMPLE_HTML = html`<p>An example paragraph.</p>`;
const UPDATED_HTML = html`<p>An updated example paragraph.</p>`;

describe("state", async () => {
  const state = getStateInstance();
  await state.init;

  test("provides js file with correct content type", async () => {
    const file = await state.getFile("pagefind.js");
    expectDefined(file);
    expect(file.contentType).toBe("text/javascript; charset=utf-8");
  });

  test("provides wasm file with correct content type", async () => {
    const file = await state.getFile("wasm.unknown.pagefind");
    expectDefined(file);
    expect(file.contentType).toBe("application/wasm");
  });

  test("new file triggers change event", async () => {
    const onChange = vi.fn();
    state.on("change", onChange);

    await state.addHtmlFile({ url: "/test", content: SAMPLE_HTML });

    expect(onChange).toHaveBeenCalledOnce();
    state.removeAllListeners();
  });

  test("identical file does not trigger change event", async () => {
    const onChange = vi.fn();
    state.on("change", onChange);

    await state.addHtmlFile({ url: "/test", content: SAMPLE_HTML });

    expect(onChange).not.toHaveBeenCalled();
    state.removeAllListeners();
  });

  test("updated file triggers change event", async () => {
    const onChange = vi.fn();
    state.on("change", onChange);

    await state.addHtmlFile({ url: "/test", content: UPDATED_HTML });

    expect(onChange).toHaveBeenCalledOnce();
    state.removeAllListeners();
  });

  test("multiple rapid updates coalesce into one rebuild", async () => {
    const onChange = vi.fn();
    state.on("change", onChange);

    state.addHtmlFile({ url: "/test", content: SAMPLE_HTML });
    state.addHtmlFile({ url: "/test", content: UPDATED_HTML });
    await state.addHtmlFile({ url: "/test", content: SAMPLE_HTML });

    expect(onChange).toHaveBeenCalledOnce();
    state.removeAllListeners();
  });

  describe("ui filter", () => {
    test("serves UI files by default", async () => {
      const file = await state.getFile("pagefind-component-ui.js");
      expectDefined(file);
    });

    test("omits UI files when ui: false", async () => {
      const state = getStateInstance({ ui: false });
      await state.init;
      const file = await state.getFile("pagefind-component-ui.js");
      expectUndefined(file);
    });
  });
});
