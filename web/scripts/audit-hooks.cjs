// Audits for the "Rendered fewer hooks than expected" class of crash.
//
// A React component must call the same hooks in the same order on every render.
// The classic violation is a guard clause that `return`s BEFORE the first hook
// call, so the component calls N hooks on one render and N-1 on the next.
//
// Approach: slice each file into whole function bodies first (brace matching from
// a function header to its closing brace), then analyse each body on its own.
// Working per-body rather than per-file is what makes this reliable — a
// component's own `return` and a `return` belonging to a `.map()` callback
// nested inside it stop being confusable, because the callback is a different
// body entirely.
//
// Within one body the test is plain SOURCE ORDER: if a `return` appears before
// the LAST hook call, the component can render a different number of hooks
// depending on its data.
//
// ── WHY THIS CARRIES ITS OWN TEST ─────────────────────────────────────────────
// A hook-order checker that silently stops detecting anything is worse than
// useless: it reports "clean" forever. This one was written three times against
// that exact failure — once because a body ended early on a type annotation,
// once because brace depth started at the wrong value, and once because the scan
// quit before recording the hook line. Each version reported zero findings, and
// each zero looked like good news.
//
// So the cases below are re-analysed on every run, and the process EXITS NON-ZERO
// if the detector misses any of them or flags either known-good component. The
// detector now has to earn its "clean" verdict.
const fs = require("fs");
const path = require("path");

const root = process.argv[2] || process.cwd();

const HOOKS = [
  "useState", "useEffect", "useLayoutEffect", "useMemo", "useCallback", "useRef",
  "useContext", "useReducer", "useId", "useSyncExternalStore", "useTransition",
  "useDeferredValue", "useImperativeHandle", "useDebugValue", "useActionState",
  "useOptimistic", "useInsertionEffect",
];
const HOOK_RE = new RegExp(
  `\\b(?:const|let|var)\\b[^=;]*=\\s*(?:${HOOKS.join("|")})\\s*[<(]|` +
    `^\\s*(?:${HOOKS.join("|")})\\s*\\(`,
);

// A function header: `function foo(`, `export default function (`, and
// `const Foo = (`. The third alternative also allows a type annotation between
// the name and the `=`, as in `const Foo: React.FC<Props> = ({ a }) => {`,
// which is a common way to declare a component and would otherwise be skipped.
const HEADER_RE =
  /(?:\bfunction\s+(\w+)\s*[(<])|(?:\bconst\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?\()/;

// ── KNOWN LIMITATION ──────────────────────────────────────────────────────────
// This detects the guard-clause shape only. A hook written INSIDE a branch —
//   if (isOpen) { const [x] = useState(); }
// — is equally fatal but is NOT reported. Telling the two apart needs a real
// parser: a regex for "is this line inside an if" cannot distinguish
// `if (a) { useState() }` from `useState(a ? b() : c())`, which differ by one
// character and are opposite bugs. An earlier version of this script tried, and
// flagged two `useState(x ? y() : z())` lines as conditional hooks. A check that
// cries wolf gets ignored, so it was removed rather than shipped. `eslint` with
// `react-hooks/rules-of-hooks` is the tool that covers the branch case; this
// script exists for the guard-clause case that lint's heuristics also miss when
// the return is far from the hook.

const findings = [];
const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git", "dist"]);

function stripNoise(line) {
  return line
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:'"`])\/\/.*$/, "$1")
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, "");
}

/**
 * Locate the `{` that opens a function body.
 *
 * Returns the line index and the character offset WITHIN that line, or null.
 * The offset matters: a header like
 *   export function F({ item }: { item: string | null }) {
 * contains a balanced `{ ... }` in its type annotation, so brace counting that
 * starts at the beginning of the line would open and close on the annotation and
 * wrongly conclude the body ended immediately. The body brace is the LAST `{` on
 * the header, so counting starts there.
 */
function findBodyBrace(lines, from) {
  for (let i = from; i < Math.min(lines.length, from + 12); i++) {
    const line = stripNoise(lines[i]);
    const brace = line.lastIndexOf("{");
    if (brace !== -1) return { line: i, char: brace };
  }
  return null;
}

/**
 * Walk braces forward from an opening brace to its matching close, returning
 * the line index of that close. Counting starts at the opening brace's own
 * character offset so a type annotation earlier on the same line is ignored.
 */
function matchToEnd(lines, open) {
  // Start at depth 1: the brace at `open.char` has already been located and IS
  // the body's opening brace. Starting at 0 would let the first `}` close a
  // scope that was never opened, ending the body early and hiding the hooks
  // that live after the guard clause.
  let depth = 1;
  for (let j = open.line; j < lines.length; j++) {
    const line = stripNoise(lines[j]);
    const from = j === open.line ? open.char + 1 : 0;
    for (let k = from; k < line.length; k++) {
      const ch = line[k];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return j;
      }
    }
  }
  return lines.length - 1;
}

function analyseBody(lines, startLine, endLine, name, file) {
  let firstHookLine = null;
  let lastHookLine = null;
  let bailOutLine = null;

  for (let i = startLine; i <= endLine; i++) {
    const raw = lines[i];
    const line = stripNoise(raw);

    // Skip over any nested function defined inside this body — a `const F = ()`
    // helper, a `.then(...)` callback, a `useEffect(() => ...)` body, a
    // `.map(...)` arrow. Their `return` statements belong to a different
    // function and cannot skip OUR hooks.
    //
    // Arrows matter as much as declarations here: `useEffect(() => { if (x)
    // return; })` is one of the most common places a stray `return` hides, and
    // it is not a component bail-out.
    const opensNested = HEADER_RE.test(line) || /=>\s*\{/.test(line);
    if (i > startLine && opensNested) {
      const nested = findBodyBrace(lines, i);
      if (nested) {
        i = matchToEnd(lines, nested);
        continue;
      }
    }

    if (HOOK_RE.test(line)) {
      if (firstHookLine === null) firstHookLine = i + 1;
      lastHookLine = i + 1;
    }

    // Keep scanning after the first bail-out: we still need lastHookLine to
    // decide whether the bail-out actually precedes a hook. Stopping here is
    // what made an early version of this script report nothing at all.
    if (bailOutLine === null && /\breturn\b/.test(line)) bailOutLine = i + 1;
  }

  // The test is against the LAST hook, not the first.
  //
  // A component that calls some hooks, then bails out, then calls more is the
  // common shape of this crash and the easiest one to write by accident:
  //
  //   const [a] = useState();      // runs
  //   if (!item) return null;      // bails here
  //   const [b] = useState();      // SKIPPED on the early-return path
  //
  // Comparing against the first hook would call that fine, because the guard
  // comes after it. It still renders a different number of hooks on the two
  // paths, which is the whole bug.
  if (bailOutLine !== null && lastHookLine !== null && bailOutLine < lastHookLine) {
    findings.push({
      file: path.relative(root, file).replace(/\\/g, "/"),
      component: name,
      kind: "bail-out-before-hook",
      bailOutLine,
      firstHookLine,
      lastHookLine,
    });
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx$/.test(entry.name)) auditFile(full);
  }
}

function auditFile(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const m = stripNoise(lines[i]).match(HEADER_RE);
    if (!m) continue;

    const name = m[1] || m[2] || "<anonymous>";
    const open = findBodyBrace(lines, i);
    if (!open) continue;

    // Brace-match to the end of this body. Nested functions are skipped here
    // and picked up on their own when the outer loop reaches their headers.
    const end = matchToEnd(lines, open);

    analyseBody(lines, open.line + 1, end, name, file);
    // Do not skip past the body: the loop must still visit nested headers so
    // they are audited too.
  }
}

/** Analyse in-memory source rather than a file on disk. */
function auditSource(name, source) {
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = stripNoise(lines[i]).match(HEADER_RE);
    if (!m) continue;
    const open = findBodyBrace(lines, i);
    if (!open) continue;
    analyseBody(lines, open.line + 1, matchToEnd(lines, open), m[1] || m[2], name);
  }
}

// ── SELF-TEST ────────────────────────────────────────────────────────────────
// Every case below is a real shape taken from this codebase.
//   BadOne  — guard clause, the plain violation.
//   BadTwo  — guard nested inside another branch.
//   BadThree— the mid-guard variant a "is the return before the FIRST hook"
//             check wrongly passes, because one hook does precede the guard.
//   ChatPage— a trimmed copy of the real app/chat/page.tsx. Its only `return`
//             lives inside a `.then()` callback, so it must NOT be flagged; this
//             is the case that proves nested callbacks are excluded.
//   GoodOne — hooks first, then the guard. Legal.
//   NoHooks — a guard with no hooks at all. Legal.
const SELFTEST = `
export function BadOne({ item }: { item: string | null }) {
  if (!item) return null;
  const [open, setOpen] = useState(false);
  return <div onClick={() => setOpen(!open)}>{item}</div>;
}

export function BadTwo({ a, b }: { a: boolean; b: string | null }) {
  if (a) {
    if (!b) {
      return null;
    }
  }
  const [n, setN] = useState(0);
  const [m, setM] = useState("");
  return <div onClick={() => { setN(n + 1); setM(m); }}>{b}</div>;
}

export function BadThree({ item }: { item: string | null }) {
  const [a, setA] = useState(0);
  if (!item) return null;
  const [b, setB] = useState("");
  return <div onClick={() => { setA(a + 1); setB(item); }}>{item}</div>;
}

export function ChatPage() {
  const router = useRouter();
  const [body, setBody] = useState("");
  useEffect(() => {
    load().then((d) => {
      if (!d) {
        router.push("/");
        return;
      }
      setBody(d);
    });
  }, [router]);
  return <div>{body}</div>;
}

export function GoodOne({ item }: { item: string | null }) {
  const [open, setOpen] = useState(false);
  if (!item) return null;
  return <div onClick={() => setOpen(!open)}>{item}</div>;
}

export function NoHooks({ item }: { item: string | null }) {
  if (!item) return null;
  return <div>{item}</div>;
}
`;

const MUST_FLAG = ["BadOne", "BadTwo", "BadThree"];
const MUST_NOT_FLAG = ["ChatPage", "GoodOne", "NoHooks"];

function runSelfTest() {
  auditSource("__selftest__.tsx", SELFTEST);
  // analyseBody writes into the shared `findings`; drain it so the self-test
  // cannot contaminate the real scan.
  const flagged = findings.map((f) => f.component);
  findings.length = 0;

  const problems = [];
  for (const name of MUST_FLAG) {
    if (!flagged.includes(name)) problems.push(`MISSED known-bad component: ${name}`);
  }
  for (const name of MUST_NOT_FLAG) {
    if (flagged.includes(name)) problems.push(`FALSE POSITIVE on known-good component: ${name}`);
  }
  return problems;
}

const selfTestProblems = runSelfTest();

// ── REAL SCAN ────────────────────────────────────────────────────────────────
walk(root);

if (selfTestProblems.length) {
  console.error("SELF-TEST FAILED — this detector is not trustworthy:\n");
  for (const p of selfTestProblems) console.error("  x " + p);
  console.error("");
  process.exit(1);
}

if (findings.length) {
  console.log(JSON.stringify(findings, null, 1));
  console.log(
    `\n${findings.length} component(s) bail out before their last hook call. ` +
    `Move every hook above the first \`return\`, or extract the guarded part into ` +
    `its own component.`,
  );
  process.exit(1);
}

console.log(`Self-test passed. No early returns before hooks under ${root}`);



