// Splices the rewritten module into public/founder-workspace.html.
// Guards every replacement with an assertion so a stale source fails loudly.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlPath = path.join(root, "public", "founder-workspace.html");
const modulePath = path.join(root, "founder-workspace.module.js");

const html = fs.readFileSync(htmlPath, "utf8");
const module = fs.readFileSync(modulePath, "utf8");

function replaceOnce(source, search, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`marker not found: ${label}`);
  if (source.indexOf(search, first + 1) >= 0) throw new Error(`marker not unique: ${label}`);
  return source;
}

const IMPORTMAP = `<script type="importmap">
{
  "imports": {
    "react": "/vendor/react.mjs",
    "react/jsx-runtime": "/vendor/react-jsx-runtime.mjs",
    "react-dom/client": "/vendor/react-dom-client.mjs",
    "framer-motion": "/vendor/framer-motion.mjs",
    "htm": "/vendor/htm.mjs"
  }
}
</script>`;

replaceOnce(html, `<script type="importmap">`, "importmap open");
replaceOnce(html, `<script type="module">`, "module script");

// Everything from the importmap onward is rebuilt.
const head = html.slice(0, html.indexOf(`<script type="importmap">`));

const body = `${IMPORTMAP}
<base target="_blank">
</head>
<body>
<div id="root"></div>
<div id="fallback">
  <h2>Nashemann Founder Workspace</h2>
  <p>This panel did not start. The owner workspace needs JavaScript enabled and a signed-in founder session<br/>on the Nashemann admin host. Sign in and refresh.</p>
</div>
<noscript><div style="position:fixed;inset:0;background:#06060b;color:#e8e8f0;display:grid;place-items:center;font-family:sans-serif">Enable JavaScript to run the panel.</div></noscript>

<script>
setTimeout(function(){ if(!window.__appMounted){ document.getElementById('fallback').style.display='flex'; } }, 9000);
</script>

<script type="module">
${module}</script>
</body>
</html>
`;

const next = head + body;

// Sanity checks before writing.
const mustExist = [
  "nasheBootstrap",
  "useStoredState",
  "FeatureGovernance",
  "DecisionsPage",
  "EmptyState",
  "/vendor/react.mjs",
];
for (const needle of mustExist) {
  if (!next.includes(needle)) throw new Error(`output missing: ${needle}`);
}
const mustBeGone = ["const KPIS =", "FounderLogin", "ownerRole", "esm.sh", "not live marketplace data"];
for (const needle of mustBeGone) {
  if (next.includes(needle)) throw new Error(`output still contains: ${needle}`);
}

fs.writeFileSync(htmlPath, next, "utf8");
console.log(`founder-workspace.html rewritten -> ${(next.length / 1024).toFixed(1)} KB`);
