import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next. Rooted with a leading `**/` so
    // nested occurrences (e.g. inside a git worktree under
    // .claude/worktrees/) are excluded too, not just a top-level directory
    // next to this config file — an unrooted ".next/**" previously let
    // `npm run lint` crawl into a worktree's compiled build output and
    // crash with an out-of-memory error.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
    // Worktrees are checked-out copies of source elsewhere in history --
    // linting them duplicates every finding from whatever branch/commit
    // they happen to be sitting on and pollutes the real baseline.
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
