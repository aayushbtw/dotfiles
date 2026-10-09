// Audits every repo in stack.json against its targets.
// node status.ts [repo...] [--json] [--latest]
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

interface Stack {
  repos: Record<string, { path: string; kind: string }>;
  packages: Record<string, string>;
  pnpm: string;
  forbidden: Record<string, string>;
  files: Record<string, string>;
  viteConfig: string[];
  cloudflareConfig: string[];
  global: string[];
  scripts: Record<string, string>;
  exceptions: Record<string, Record<string, string>>;
}

interface Report {
  repo: string;
  path: string;
  git: { branch: string; dirty: number; lastCommit: string; unpushed: number | null };
  issues: string[];
  excepted: string[];
}

const root = import.meta.dirname;
const stack: Stack = JSON.parse(readFileSync(path.join(root, "stack.json"), "utf8"));
const args = process.argv.slice(2);
const only = args.filter((arg) => !arg.startsWith("--"));
const asJson = args.includes("--json");

function expand(p: string) {
  return p.replace(/^~/, homedir());
}

function git(cwd: string, ...gitArgs: string[]) {
  try {
    return execFileSync("git", gitArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function readJson(file: string) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

// Only the blocks status needs: `packages:` globs, the `catalog:` map, release-age exclusions.
function readWorkspace(dir: string) {
  const file = path.join(dir, "pnpm-workspace.yaml");
  const globs: string[] = [];
  const catalog: Record<string, string> = {};
  const ageExcludes: string[] = [];

  if (!existsSync(file)) {
    return { globs: ["."], catalog, ageExcludes };
  }

  let block = "";
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const top = /^([A-Za-z]+):/.exec(line);
    if (top) {
      block = top[1];
      continue;
    }
    const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, "");
    if (block === "packages" && line.trim().startsWith("- ")) {
      globs.push(unquote(line.trim().slice(2)));
    }
    if (block === "minimumReleaseAgeExclude" && line.trim().startsWith("- ")) {
      ageExcludes.push(unquote(line.trim().slice(2)));
    }
    const entry = /^\s+("?[^":]+"?):\s*(.+)$/.exec(line);
    if (block === "catalog" && entry) {
      catalog[unquote(entry[1])] = unquote(entry[2]);
    }
  }

  return { globs: globs.length > 0 ? globs : ["."], catalog, ageExcludes };
}

function workspaceDirs(dir: string, globs: string[]) {
  const dirs = new Set([dir]);
  for (const glob of globs) {
    if (glob.endsWith("/*")) {
      const parent = path.join(dir, glob.slice(0, -2));
      if (existsSync(parent)) {
        for (const child of readdirSync(parent)) {
          const candidate = path.join(parent, child);
          if (existsSync(path.join(candidate, "package.json"))) {
            dirs.add(candidate);
          }
        }
      }
    } else {
      dirs.add(path.join(dir, glob));
    }
  }
  return [...dirs];
}

// "^1.2.3", "npm:@scope/x@1.2.3", "1.2.3" all compare as "1.2.3".
function base(spec: string) {
  const npm = /^npm:.+@([^@]+)$/.exec(spec);
  return (npm ? npm[1] : spec).replace(/^[\^~>=<\s]+/, "");
}

function canonical(file: string) {
  const text = readFileSync(file, "utf8");
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text.trim();
  }
}

function audit(name: string, repoPath: string): Report {
  const dir = expand(repoPath);
  const exceptions = stack.exceptions[name] ?? {};
  const issues: string[] = [];
  const excepted: string[] = [];

  function flag(key: string, message: string) {
    const reason = exceptions[key];
    if (reason) {
      excepted.push(`${message} (excepted: ${reason})`);
    } else {
      issues.push(message);
    }
  }

  const branch = git(dir, "branch", "--show-current") ?? "?";
  const dirty = (git(dir, "status", "--porcelain") ?? "").split("\n").filter(Boolean).length;
  const lastCommit = git(dir, "log", "-1", "--format=%cs %s") ?? "?";
  const unpushedRaw = git(dir, "rev-list", "--count", "@{upstream}..HEAD");
  const report: Report = {
    repo: name,
    path: repoPath,
    git: { branch, dirty, lastCommit, unpushed: unpushedRaw === null ? null : Number(unpushedRaw) },
    issues,
    excepted,
  };

  if (!existsSync(dir)) {
    issues.push("missing on disk");
    return report;
  }

  const { globs, catalog, ageExcludes } = readWorkspace(dir);

  // A pinned exclusion outlives the version it was for once the lockfile moves on.
  const lockfile = path.join(dir, "pnpm-lock.yaml");
  const lock = existsSync(lockfile) ? readFileSync(lockfile, "utf8") : "";
  for (const exclude of ageExcludes) {
    const at = exclude.lastIndexOf("@");
    if (at > 0 && !lock.includes(`\n  ${exclude}:`) && !lock.includes(`\n  '${exclude}'`) && !lock.includes(`\n  ${exclude}(`)) {
      flag(`age:${exclude}`, `pnpm-workspace.yaml: stale minimumReleaseAgeExclude ${exclude} (not in lockfile)`);
    }
  }

  for (const [pkg, target] of Object.entries(stack.packages)) {
    if (catalog[pkg] && base(catalog[pkg]) !== base(target)) {
      flag(pkg, `catalog ${pkg} ${catalog[pkg]} -> ${target}`);
    }
  }

  for (const pkgDir of workspaceDirs(dir, globs)) {
    const manifest = readJson(path.join(pkgDir, "package.json"));
    if (!manifest) {
      continue;
    }
    const where = path.relative(dir, pkgDir) || ".";
    const deps: Record<string, string> = {
      ...manifest.peerDependencies,
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };
    const ownDeps: Record<string, string> = { ...manifest.dependencies, ...manifest.devDependencies };

    for (const [pkg, spec] of Object.entries(ownDeps)) {
      const target = stack.packages[pkg];
      if (target && !spec.startsWith("catalog:") && !spec.startsWith("workspace:") && base(spec) !== base(target)) {
        flag(pkg, `${where}: ${pkg} ${spec} -> ${target}`);
      }
      if (stack.forbidden[pkg]) {
        flag(`forbidden:${pkg}`, `${where}: uses ${pkg} (${stack.forbidden[pkg]})`);
      }
    }

    if (where === ".") {
      if (!deps.ultracite) {
        flag("ultracite", "root: ultracite not installed");
      }
      if (!deps["vite-plus"]) {
        flag("vite-plus", "root: vite-plus not installed");
      }
      const pm = manifest.devEngines?.packageManager;
      if (pm?.name !== "pnpm" || pm.version !== stack.pnpm) {
        flag("pnpm", `root: devEngines.packageManager should be pnpm ${stack.pnpm} (has ${pm ? `${pm.name} ${pm.version}` : manifest.packageManager ?? "none"})`);
      }
      for (const [script, command] of Object.entries(stack.scripts)) {
        if (!(manifest.scripts?.[script] ?? "").startsWith(command)) {
          flag(`script:${script}`, `root: script "${script}" should start with "${command}" (has ${JSON.stringify(manifest.scripts?.[script] ?? null)})`);
        }
      }
    }

    const cfConfig = path.join(pkgDir, "cloudflare.config.ts");
    if (existsSync(cfConfig)) {
      const text = readFileSync(cfConfig, "utf8");
      for (const needle of stack.cloudflareConfig) {
        if (!text.includes(needle)) {
          flag(`cf:${needle}`, `${where}/cloudflare.config.ts: missing ${needle}`);
        }
      }
    }

    for (const file of ["wrangler.jsonc", "wrangler.json", "wrangler.toml", "biome.json", "biome.jsonc", ".eslintrc", "eslint.config.js", ".prettierrc"]) {
      if (existsSync(path.join(pkgDir, file))) {
        flag(`file:${file}`, `${where}: has ${file}`);
      }
    }
  }

  for (const [target, source] of Object.entries(stack.files)) {
    const file = path.join(dir, target);
    if (!existsSync(file)) {
      flag(`files:${target}`, `${target} missing (copy ${source})`);
    } else if (canonical(file) !== canonical(path.join(root, source))) {
      flag(`files:${target}`, `${target} differs from ${source}`);
    }
  }

  const viteConfig = path.join(dir, "vite.config.ts");
  const config = existsSync(viteConfig) ? readFileSync(viteConfig, "utf8") : "";
  for (const needle of stack.viteConfig) {
    if (!config.includes(needle)) {
      flag(needle, `vite.config.ts: missing ${needle}`);
    }
  }

  return report;
}

async function latest() {
  const behind: string[] = [];
  await Promise.all(
    Object.entries(stack.packages).map(async ([pkg, target]) => {
      const name = target.startsWith("npm:") ? target.slice(4, target.lastIndexOf("@")) : pkg;
      const res = await fetch(`https://registry.npmjs.org/${name}`, { headers: { accept: "application/vnd.npm.install-v1+json" } });
      if (!res.ok) {
        return;
      }
      const tags: Record<string, string> = (await res.json())["dist-tags"];
      const tag = Object.entries(tags).find(([, version]) => version === base(target))?.[0];
      if (tags.latest !== base(target) && tag !== "beta") {
        behind.push(`${name}: target ${base(target)}, npm latest ${tags.latest}`);
      }
    })
  );
  return behind.sort();
}

const names = only.length > 0 ? only : Object.keys(stack.repos);
const reports = names.map((name) => {
  const repo = stack.repos[name];
  if (!repo) {
    throw new Error(`Unknown repo "${name}". Known: ${Object.keys(stack.repos).join(", ")}`);
  }
  return audit(name, repo.path);
});
const upstream = args.includes("--latest") ? await latest() : null;

// Global tools installed through vp (`vp add -g`, `vp upgrade`), checked against the same targets.
function globals() {
  const issues: string[] = [];
  const home = path.join(homedir(), ".local/share/vite-plus");
  for (const pkg of stack.global) {
    const target = base(stack.packages[pkg]);
    const installed =
      pkg === "vite-plus"
        ? /\bv(\d\S*)/.exec(execFileSync("vp", ["--version"], { encoding: "utf8" }))?.[1]
        : readJson(path.join(home, "packages", `${pkg}.json`))?.version;
    if (installed !== target) {
      const fix = pkg === "vite-plus" ? "vp upgrade" : `vp add -g ${pkg}@${target}`;
      issues.push(`${pkg} ${installed ?? "not installed"} -> ${target} (${fix})`);
    }
  }
  return issues;
}
const globalIssues = globals();

if (asJson) {
  console.log(JSON.stringify({ globals: globalIssues, reports, upstream }, null, 2));
} else {
  console.log(`## global [${globalIssues.length === 0 ? "in sync" : `${globalIssues.length} drift`}]`);
  for (const issue of globalIssues) {
    console.log(`- ${issue}`);
  }
  console.log();
  for (const r of reports) {
    const unpushed = r.git.unpushed === null ? "no upstream" : `${r.git.unpushed} unpushed`;
    console.log(`## ${r.repo} [${r.issues.length === 0 ? "in sync" : `${r.issues.length} drift`}] ${r.path}`);
    console.log(`git: ${r.git.branch}, ${r.git.dirty} dirty, ${unpushed}, last: ${r.git.lastCommit}`);
    for (const issue of r.issues) {
      console.log(`- ${issue}`);
    }
    for (const note of r.excepted) {
      console.log(`~ ${note}`);
    }
    console.log();
  }
  if (upstream) {
    console.log(`## npm (targets behind latest)`);
    console.log(upstream.length === 0 ? "none" : upstream.map((line) => `- ${line}`).join("\n"));
  }
}

process.exitCode = globalIssues.length > 0 || reports.some((r) => r.issues.length > 0) ? 1 : 0;
