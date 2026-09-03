import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // ios/App/App/public is a `cap sync`-regenerated copy of the built out/
  // static export (already-bundled/minified JS + a copy of source .ts files
  // for source maps) — not source this repo owns, never meant to be linted.
  globalIgnores(["ios/"]),
]);

export default eslintConfig;
