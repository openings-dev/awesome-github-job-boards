import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTheme, resolvedTheme, applyTheme } from "../assets/js/theme.mjs";

test("normalizes persisted theme choices", () => {
  assert.equal(normalizeTheme("light"), "light");
  assert.equal(normalizeTheme("dark"), "dark");
  assert.equal(normalizeTheme("system"), "system");
  assert.equal(normalizeTheme("unknown"), "system");
});

test("resolves system preference without changing explicit choices", () => {
  assert.equal(resolvedTheme("system", true), "dark");
  assert.equal(resolvedTheme("system", false), "light");
  assert.equal(resolvedTheme("light", true), "light");
});

test("applies one resolved class and records the user's choice", () => {
  const classes = new Set(["light"]);
  const attributes = new Map();
  const root = { classList: { remove: (...values) => values.forEach((value) => classes.delete(value)), add: (value) => classes.add(value) }, setAttribute: (key, value) => attributes.set(key, value) };
  assert.deepEqual(applyTheme(root, "system", true), { theme: "system", resolved: "dark" });
  assert.deepEqual([...classes], ["dark"]);
  assert.equal(attributes.get("data-theme"), "system");
});
