// Mirrors the founder workspace's ESM dependencies from esm.sh into
// public/vendor so the embedded panel has no runtime CDN dependency.
//
// esm.sh rewrites package imports into absolute paths on its own host; this
// walks that graph and rewrites each one to a local file instead.
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public", "vendor");
fs.mkdirSync(OUT_DIR, { recursive: true });

/** Bare specifiers the browser resolves through the workspace's import map. */
const KEEP_BARE = new Set(["react", "react-dom", "react/jsx-runtime", "react-dom/client"]);

/** Entry points, keyed by the local filename they end up as. */
const ENTRIES = [
  ["react.mjs", "https://esm.sh/react@18.3.1/X-ZXJlYWN0/es2022/react.bundle.mjs"],
  ["react-jsx-runtime.mjs", "https://esm.sh/react@18.3.1/X-ZXJlYWN0/es2022/jsx-runtime.bundle.mjs"],
  ["react-dom-client.mjs", "https://esm.sh/react-dom@18.3.1/X-ZXJlYWN0/es2022/client.bundle.mjs"],
  ["framer-motion.mjs", "https://esm.sh/framer-motion@11.11.17/X-ZXJlYWN0LHJlYWN0LWRvbQ/es2022/framer-motion.bundle.mjs"],
  ["htm.mjs", "https://esm.sh/htm@3.1.1/es2022/htm.bundle.mjs"],
];

const localNameFor = (url) => {
  const parsed = new URL(url, "https://esm.sh");
  const raw = parsed.pathname.replace(/^\//, "").replace(/[^a-zA-Z0-9]+/g, "-");
  return `${raw.replace(/^-+|-+$/g, "") || "module"}.mjs`;
};

const queue = ENTRIES.map(([file, url]) => ({ file, url }));
const seen = new Map();

while (queue.length) {
  const { file, url } = queue.shift();
  if (seen.has(url)) continue;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; nashemann-vendor/1.0)" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);

  const source = await response.text();
  seen.set(url, file);

  // esm.sh emits `from "x"`, `import "x"` (side-effect) and `import*as y from
  // "x"`. Rewrite the specifier in place while keeping the original keyword —
  // turning `import "x"` into `from "x"` would be a syntax error. The lookbehind
  // keeps `.from("...")` call arguments (and identifiers) untouched, and
  // `import.meta` / `import type` are excluded because they never reach a quote.
  const rewritten = source.replace(
    /(?<![\w$.])(import|from)\s*"([^"]+)"/g,
    (match, keyword, specifier) => {
      if (KEEP_BARE.has(specifier)) return match;
      if (specifier.startsWith("./") || specifier.startsWith("/")) {
        const resolved = new URL(specifier, url).toString();
        const local = seen.get(resolved) ?? localNameFor(resolved);
        if (!seen.has(resolved)) queue.push({ file: local, url: resolved });
        return `${keyword} "./${local}"`;
      }
      return match;
    },
  );

  fs.writeFileSync(path.join(OUT_DIR, file), rewritten);
  const bare = [...rewritten.matchAll(/(?<![\w$.])(from|import)\s*"([^"]+)"/g)]
    .map((m) => m[2])
    .filter((s) => !s.startsWith("."));
  console.log(
    `${file.padEnd(28)} ${(rewritten.length / 1024).toFixed(1).padStart(6)} KB  -> ${[...new Set(bare)].join(", ") || "no bare imports"}`,
  );
}

console.log(`\n${seen.size} module(s) mirrored into public/vendor`);
