# Stack

Machine-checked truth lives in `stack.json` (targets, forbidden deps, canonical files, required vite.config strings, exceptions). `node status.ts` audits against it. This file holds what the script can't check: reference config, the migration log, and gotchas.

## Change protocol

1. Change the target in `stack.json` (or a file in `files/`), never just one repo.
2. Add a migration row below with the steps that worked in the first repo.
3. Apply to each repo directly on main (no branches); gate on `vpr check` + `vpr build` (+ `vpr test` where it exists).
4. `node status.ts` must show the repo `in sync`; mark it in the log.
5. A deliberate deviation goes in `stack.json` `exceptions` with a reason, never silently.

## Reference lint block (vite.config.ts)

Repo-specific rules go after these. Keep the shared ones identical across repos.

```ts
import ultraciteFmt from "ultracite/oxfmt";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

fmt: { ...ultraciteFmt, ignorePatterns: [...(ultraciteFmt.ignorePatterns ?? []), "**/routeTree.gen.ts"] },
lint: {
  extends: [core, react, tanstack, antiSlop],
  ignorePatterns: [...(core.ignorePatterns ?? [])],
  jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
  options: { typeAware: true, typeCheck: true },
  rules: {
    // Hoisting lets a route's `component:` sit above the component it names.
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "no-use-before-define": ["error", { functions: false }],
    "react/function-component-definition": ["error", { namedComponents: "function-declaration" }],
    // Base UI's checkbox is a span with a hidden input, so the label wraps it rather than pointing at it.
    "jsx-a11y/label-has-associated-control": ["error", { controlComponents: ["Checkbox", "Switch"], depth: 3 }],
    // `throw redirect(...)` and `throw notFound()` are how TanStack Router exits a loader.
    "typescript/only-throw-error": ["error", { allow: [{ from: "package", name: ["NotFoundError", "Redirect"], package: "@tanstack/router-core" }] }],
    "vite-plus/prefer-vite-plus-imports": "error",
  },
},
```

`pnpm-workspace.yaml`: `catalog` holds `vite` (`npm:@voidzero-dev/vite-plus-core@<v>`) and `vite-plus`; `overrides: vite@*: "catalog:"`; `peerDependencyRules` allow any `vite`.

## Migration log

| # | Change | portfolio | tomekit | constella | type | netigen-v2 |
|---|---|---|---|---|---|---|
| 001 | portfolio: hand-rolled fmt + vendored anti-slop → ultracite presets | committed | — | — | — | — |
| 002 | vite-plus 1.1.0, ultracite 7.12.4, shared lint rules, canonical .vscode | done | done | done | paused | PR #208 (vite-plus/ultracite held, see exceptions) |
| 003 | tomekit/apps/docs deps: highlight/markdown 1.0, CF plugin 2.0 beta, cf beta.12 | — | done | — | — | — |
| 004 | type: vite → vite-plus, Biome → ultracite on oxc, TS 7, wrangler → cf (`cf migrate`) | — | — | — | paused | — |
| 005 | type: Tailwind → StyleX (separate; rewrites every component) | — | — | — | paused | — |
| 006 | cloudflare.config.ts: compat date 2026-09-16, logs-scoped observability + traces off, previewUrls/workersDev false | done | done | done | paused | — |
| 007 | `func-style` → `allowArrowFunctions: true` (StyleX helpers must be arrows; constella dropped 9 `eslint-disable func-style` pairs). Keep the line: deleting it restores ultracite's `"expression"`, which bans `function Button()` | done | done | done | paused | PR #208 (355 arrow components autofixed via `vp lint --fix-suggestions`) |

`done` = pushed to main (2026-10-08). `paused` = type is out of `stack.json` until the user picks it back up; re-add it to `repos` to resume.

Open items:
- tomekit (user will fix): `packages/tomekit/test/vite.test.ts` file-watcher tests flaky, 1–4 random failures per run, alone or in `vpr test`.
  - Seen failing: "serves tomekit/content to the browser bundle again after content changes", "rewrites types after a change, before anything imports the content", "reruns a loader when a file it watches changes", "reloads for a new file and reruns only what changed", "shows broken files in the error overlay", "reloads the browser when content changes, even though only server code imports it", "ignores changes to files outside the collection".
  - Pre-existing: reproduced on 445e3ab (before the sync, vite-plus 1.0.0, vitest 5.0.1). Not caused by vite-plus 1.1.0 / vitest 5.0.3.
  - Repro: `cd packages/tomekit && for i in 1 2 3; do vp test run test/vite.test.ts | rg "Tests "; done`
  - Likely cause: timing between fs writes and the watcher/HMR assertions (all failing tests mutate files and wait for a reload).
- portfolio dropped 3 vendored rules ultracite doesn't ship: `no-array-filter-map`, `no-reduce-accumulator-copy`, `require-readable-spacing`.
- vite-plus 1.1.0 was <24h old: pnpm wrote `minimumReleaseAgeExclude` entries (kept by user choice). Pinned ones the lockfile has moved past show up in status.ts as stale; delete them then.

## Gotchas

- Read the vite-plus release notes before bumping it: it pins Vite/Vitest/Oxlint/Oxfmt. Match catalog `vitest`/`@vitest/*` to its bundled Vitest, and run `vp fmt` after (new oxfmt reformats). 1.1.0 bundles Vite 8.3.3, Vitest 5.0.3, Oxlint 1.87.0, Oxfmt 0.72.0.

- netigen-v2: `@effect/tsgo` patches oxlint in `prepare`. It refuses an oxlint it doesn't know (0.48.1: ≤1.86), and lint then fails with `Unknown plugin: 'effecttsgo'`. Check its support before bumping vite-plus or ultracite there; rerun `vpr prepare` after any install.
- `react/function-component-definition` rewrites are suggestion fixes: `vpr fix` skips them; use `vp lint --fix-suggestions`.
- `cf@1.0.0-beta.13` needs a workerd build not on npm yet (as of 2026-10-08); stay on beta.12 until `vp add` resolves it.
- `@cloudflare/vite-plugin` 2.0 beta: `experimental.newConfig` is gone (the cloudflare.config.ts behavior is default). Drop the flag.
- ultracite core autofix adds `async` to promise-returning arrows, then `require-await` fires. Write `async () => await fn()`.
- ultracite autofix rewrites `getElementById(id)` → `querySelector(`#${id}`)`, which returns `Element` and breaks on ids starting with a digit. Use `querySelector(`#${CSS.escape(id)}`)` + `instanceof HTMLElement`.
- `unicorn/prefer-number-coercion` is wrong for CSS lengths: disable inline with `-- \`Number("4px")\` is NaN`.
- React Compiler can't lower `??=` or `import()` inside a component/hook; move them to a module-level function.
- `cf/config` re-exports `@cloudflare/config/public`, which isn't installed, so `defineConfig` is untyped and typecheck won't catch bad keys. The resolved config is in `.cloudflare/output/v0/workers/default/worker.config.json` after a build; check it there.
- Phosphor bare icon names are deprecated; import `<Name>Icon` from the same path.
- `jsx-a11y/anchor-has-content` can't see children inside a `{...props}` spread; destructure `children` and render it.
- Inline disables use `// oxlint-disable-next-line <rule> -- <why>`.
- `vp lint` output: one `path:line:col: error rule(name): msg` per line. Count by rule with `rg -o '[a-z-]+\([a-z0-9/_-]+\):'`.
- tomekit `packages/tomekit/test/vite.test.ts` file-watcher tests are flaky (1–4 random failures per run), already on the pre-sync commit with vite-plus 1.0.0. Not a stack regression; don't chase it during a migration.
