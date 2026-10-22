// Static tag-balance check for every htm template literal in the panel module.
//
// Each template's literal markup (with `${...}` holes blanked out, but keeping
// the chunks that surround them) must be balanced on its own. Nested templates
// inside holes are checked as their own templates by the outer scan.
import fs from "node:fs";

const src = fs.readFileSync(process.argv[2] ?? "founder-workspace.module.js", "utf8");

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "param", "source", "track", "wbr",
]);

function skipString(start) {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === quote) return i + 1;
    i += 1;
  }
  return src.length;
}

/** Returns [literalChunks, indexJustPastClosingBacktick]. */
function scanTemplate(start) {
  const chunks = [];
  let buf = "";
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") { buf += src[i + 1] ?? ""; i += 2; continue; }
    if (ch === "`") { chunks.push(buf); return [chunks, i + 1]; }
    if (ch === "$" && src[i + 1] === "{") {
      chunks.push(buf);
      buf = "";
      i = skipHole(i + 1);
      continue;
    }
    buf += ch;
    i += 1;
  }
  chunks.push(buf);
  return [chunks, src.length];
}

/** `start` is the index of `{`; returns the index just past the matching `}`. */
function skipHole(start) {
  let depth = 1;
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"') { i = skipString(i); continue; }
    if (ch === "`") { i = scanTemplate(i)[1]; continue; }
    if (ch === "\\") { i += 2; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return i + 1; }
    i += 1;
  }
  return src.length;
}

function lineOf(index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (src[i] === "\n") line += 1;
  return line;
}

let problems = 0;
let checked = 0;

for (let i = 0; i < src.length - 5; i += 1) {
  if (src[i] !== "`") continue;
  if (!/html\s*$/.test(src.slice(Math.max(0, i - 6), i))) continue;

  const [chunks, end] = scanTemplate(i);
  checked += 1;

  const markup = chunks.join("");
  const line = lineOf(i);
  const stack = [];
  const tag = /<(\/?)([A-Za-z][\w.]*)((?:"[^"]*"|'[^']*'|[^>"'/])*)(\/?)>/g;

  let m;
  while ((m = tag.exec(markup))) {
    const [, closing, name, , selfClose] = m;
    if (selfClose || VOID.has(name)) continue;
    if (closing) {
      if (!stack.length) {
        console.log(`line ${line}: unmatched closing </${name}>`);
        problems += 1;
      } else {
        const open = stack.pop();
        if (open !== name) {
          console.log(`line ${line}: <${open}> closed by </${name}>`);
          problems += 1;
        }
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length) {
    console.log(`line ${line}: unclosed <${stack.join(">, <")}>`);
    problems += 1;
  }

  i = end - 1;
}

console.log(`\nchecked ${checked} template(s), ${problems} problem(s)`);
if (problems) process.exitCode = 1;
