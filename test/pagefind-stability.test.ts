import { createIndex, type PagefindServiceConfig } from "pagefind";
import { describe, expect, test } from "vitest";
import { expectDefined, html } from "./test-utils.js";

describe("pagefind API stability", () => {
  test("pagefind.js is identical across two index creations", async () => {
    const [{ index: a }, { index: b }] = await Promise.all([
      createIndex(),
      createIndex({ keepIndexUrl: true, forceLanguage: "sr" }),
    ]);

    expectDefined(a);
    expectDefined(b);

    await b.addHTMLFile({
      content: html`<h1>Example Heading<h1><p>This is an example paragraph.</p>`,
      sourcePath: "index.html",
    });

    const [{ files: filesA }, { files: filesB }] = await Promise.all([
      a.getFiles(),
      b.getFiles(),
    ]);

    const jsA = filesA.find((f) => f.path === "pagefind.js");
    const jsB = filesB.find((f) => f.path === "pagefind.js");

    expectDefined(jsA);
    expectDefined(jsB);
    expect(Buffer.from(jsA.content).equals(Buffer.from(jsB.content))).toBe(
      true,
    );

    await Promise.all([a.deleteIndex(), b.deleteIndex()]);
  });

  test("PagefindServiceConfig has no unknown fields", () => {
    // If pagefind adds/removes/updates fields/types, tsc will error here
    const config: Required<PagefindServiceConfig> = {
      excludeSelectors: [""],
      forceLanguage: "",
      includeCharacters: "",
      logfile: "",
      rootSelector: "",
      keepIndexUrl: true,
      verbose: true,
      writePlayground: true,
    };

    expectDefined(config);
  });
});
