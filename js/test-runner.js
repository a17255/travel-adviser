const results = [];
let currentSuite = null;

export function describe(name, fn) {
  currentSuite = name;
  fn();
  currentSuite = null;
}

export function it(name, fn) {
  const suite = currentSuite || "(no suite)";
  try {
    fn();
    results.push({ suite, name, pass: true });
  } catch (err) {
    results.push({ suite, name, pass: false, err: err.message });
  }
}

export function assertEqual(actual, expected, msg = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e} got ${a}`);
}

export function assertClose(actual, expected, eps = 1e-6) {
  if (Math.abs(actual - expected) > eps)
    throw new Error(`expected ~${expected} got ${actual}`);
}

export function render(target) {
  const pass = results.filter(r => r.pass).length;
  const fail = results.length - pass;
  target.innerHTML =
    `<h1>${pass}/${results.length} passing</h1>` +
    results.map(r =>
      `<div style="color:${r.pass ? 'green' : 'red'}">` +
      `${r.pass ? '✔' : '✘'} ${r.suite} — ${r.name}` +
      (r.err ? ` <code>${r.err}</code>` : '') +
      `</div>`).join('');
  return { pass, fail };
}
