import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Extend with globalIgnores() in a later phase once vendored/generated
  // directories exist (e.g. a native iOS shell) — none do yet.
]);

export default eslintConfig;
