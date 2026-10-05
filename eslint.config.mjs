// One flat config for both workspaces, run from the repo root.

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "app/**", "gradle/**", "tools/**"] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ["backend/**/*.ts"],
    languageOptions: { globals: globals.node },
  },

  {
    files: ["frontend/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
