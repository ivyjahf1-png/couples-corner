const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, imports, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  }, ...extras });
  return exports;
}
const { buildHeroSlides } = load('lib/utils/hero-slides.ts', {});
const slides = buildHeroSlides([
  { id: 'one', title: 'First', mediaType: 'image', mediaUrl: '/a.jpg', mediaUrls: ['/a.jpg', '/b.mp4?token=x'], thumbnailUrl: '/poster.jpg' },
  { id: 'two', title: 'Second', mediaType: 'video', mediaUrl: '/c.webp#image', mediaUrls: [] },
]);
assert.equal(slides.length, 3);
assert.equal(slides[1].kind, 'video');
assert.equal(slides[2].kind, 'image');
assert.equal(slides[1].poster, '/poster.jpg');
assert.equal(buildHeroSlides([]).length, 0);

// Exercise the real component with deterministic hook/timer adapters, no new libraries.
let cursor = 0;
const state = [], effects = [], pending = [];
const timers = new Map();
let timerId = 0;
const react = {
  useState(initial) {
    const i = cursor++;
    if (!(i in state)) state[i] = initial;
    return [state[i], (next) => { state[i] = typeof next === 'function' ? next(state[i]) : next; }];
  },
  useRef(initial) { const i = cursor++; return state[i] ??= { current: initial }; },
  useCallback(fn) { cursor++; return fn; },
  useEffect(fn, deps) {
    const i = cursor++;
    const previous = effects[i];
    if (!previous || deps.some((dep, j) => dep !== previous.deps[j])) {
      previous?.cleanup?.();
      pending.push(() => { effects[i] = { deps, cleanup: fn() }; });
    }
  },
};
const jsx = (type, props, key) => ({ type, props, key });
const { HeroMediaCarousel } = load('components/content/HeroMediaCarousel.tsx', {
  react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'link' },
}, { window: {
  setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
  clearTimeout(id) { timers.delete(id); },
} });
function render() {
  cursor = 0;
  const tree = HeroMediaCarousel({ slides });
  while (pending.length) pending.shift()();
  return tree;
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}
let tree = render();
assert.equal(find(tree, (n) => n.type === 'img').props.src, '/a.jpg');
assert.equal([...timers.values()][0].delay, 5000);
[...timers.values()][0].fn();
tree = render();
const video = find(tree, (n) => n.type === 'video');
assert.equal(video.props.src, '/b.mp4?token=x');
assert.equal(video.props.muted, true);
assert.equal(video.props.loop, undefined);
assert.equal(timers.size, 0, 'Video must not have an advance timer');
video.props.onEnded();
tree = render();
assert.equal(find(tree, (n) => n.type === 'img').props.src, '/c.webp#image');
[...timers.values()][0].fn();
tree = render();
assert.equal(find(tree, (n) => n.type === 'img').props.src, '/a.jpg');
assert.equal(find(tree, (n) => n.type === 'button'), null, 'No carousel control overlays are rendered');
assert.equal([...timers.values()][0].delay, 5000, 'Rotation continues autonomously after wraparound');
for (const effect of effects) effect?.cleanup?.();
assert.equal(timers.size, 0, 'Unmount clears timers');
console.log('PASS: all files, mixed media, image duration, video onEnded, wraparound, autonomous-only, cleanup');
