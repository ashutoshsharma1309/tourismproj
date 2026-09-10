import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    /*
     * CommonJS scripts are CommonJS on purpose: `scripts/media/*.cjs` are
     * run by plain `node` outside the Next toolchain and `require` IS their
     * module system. The TypeScript preset's `no-require-imports` was
     * written for .ts files that should be using `import`; applying it to
     * a .cjs file fails lint for using the only import syntax it has.
     */
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
