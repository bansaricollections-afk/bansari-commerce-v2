import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "**/.next/**",

    "node_modules/**",
    "**/node_modules/**",

    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",

    // Ignore nested Next.js project
    "bansari-commerce-os/**",

    "next-env.d.ts",
  ]),
]);