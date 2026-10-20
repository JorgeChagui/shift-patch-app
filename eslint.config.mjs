import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // OWASP-style checks (injection, unsafe regex, eval, timing-unsafe compares, ...).
  security.configs.recommended,
  {
    rules: {
      // Flags every `obj[key]`. Here keys are typed unions (Role, ShiftStatus, ...) or array
      // indices, so it is all noise; lookups keyed by free-form strings use Object.hasOwn.
      "security/detect-object-injection": "off",
    },
  },
  {
    // Dev scripts read paths and build regexes from constants in the same file.
    files: ["scripts/**"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-non-literal-regexp": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "src/generated/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
