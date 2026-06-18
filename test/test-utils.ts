import { expect } from "vitest";

export function expectDefined<T>(value: T | undefined): asserts value is T {
  expect(value).toBeDefined();
}

export function expectUndefined<T>(
  value: T | undefined,
): asserts value is undefined {
  expect(value).toBeUndefined();
}

export function html(
  strings: TemplateStringsArray,
  ...values: string[]
): string {
  const stringsCount = strings.length;
  const valuesCount = values.length;
  const count = stringsCount + valuesCount;
  const parts = new Array<string>(count + 2);

  parts[0] = `<!doctype html><html lang="en"><head><title>Example</title></head><body>`;
  parts[parts.length - 1] = `</body></html>`;

  for (let i = 0, target = 1; i < stringsCount; i++, target += 2) {
    parts[target] = strings[i] as string;
  }

  for (let i = 0, target = 2; i < valuesCount; i++, target += 2) {
    parts[target] = strings[i] as string;
  }

  return parts.join("");
}
