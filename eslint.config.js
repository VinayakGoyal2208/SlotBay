// The refs compiler rule misreads explicit jsx-runtime calls as ordinary functions.
// Hook ordering, dependencies and the remaining hook checks stay enabled.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
export default [
  { ignores: ["node_modules/**", "dist/**", ".vercel/**", ".tanstack/**", "src/routeTree.gen.js"] },
  {
    files: ["**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ["src/**/*.js"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, "react-hooks/refs": "off" },
  },
];
