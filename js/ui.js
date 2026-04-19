const BOOL_PROPS = new Set(["checked", "disabled", "selected", "hidden", "readOnly"]);

export function el(tag, attrs = {}, ...rest) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null) continue;
    if (k === "class")           node.className = v;
    else if (k === "style")      node.setAttribute("style", v);
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (BOOL_PROPS.has(k))  { if (v) node[k] = true; }
    else                         node.setAttribute(k, v);
  }
  for (const group of rest) {
    for (const c of [].concat(group)) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === "string" || typeof c === "number"
        ? document.createTextNode(String(c))
        : c);
    }
  }
  return node;
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function formatVND(n) {
  const v = Number(n) || 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0
  }).format(v);
}

export function uuid() { return crypto.randomUUID(); }

export function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickJSON() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      try { resolve(JSON.parse(text)); }
      catch { resolve(null); }
    };
    input.click();
  });
}

export function encodeTrip(trip) {
  const json = JSON.stringify(trip);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeTrip(str) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch { return null; }
}
