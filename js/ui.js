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

function slimForShare(trip) {
  const clone = JSON.parse(JSON.stringify(trip));
  clone.fees = (clone.fees || []).map(f => {
    const { log, ...rest } = f;
    return rest;
  });
  return clone;
}

async function gzipToB64url(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  const arr = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function b64urlToText(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") +
              "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const stream = new Blob([arr]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

export async function encodeTrip(trip) {
  const json = JSON.stringify(slimForShare(trip));
  if ("CompressionStream" in window) {
    return "gz:" + await gzipToB64url(new TextEncoder().encode(json));
  }
  return "b64:" + btoa(unescape(encodeURIComponent(json)));
}

export async function decodeTrip(str) {
  try {
    if (str.startsWith("gz:"))  return JSON.parse(await b64urlToText(str.slice(3)));
    if (str.startsWith("b64:")) return JSON.parse(decodeURIComponent(escape(atob(str.slice(4)))));
    return JSON.parse(decodeURIComponent(escape(atob(str))));  // legacy plain base64
  } catch { return null; }
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

export function mapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildICS(trip) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Adviser//EN",
    "CALSCALE:GREGORIAN"
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const sanitize = s => String(s || "").replace(/[,;\\]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");

  (trip.itinerary || []).forEach((r, i) => {
    if (!r.date || !r.timeStart) return;
    const start = r.date.replace(/-/g, "") + "T" + r.timeStart.replace(":", "") + "00";
    const endDT = new Date(r.date + "T" + r.timeStart);
    endDT.setHours(endDT.getHours() + 1);
    const pad = n => String(n).padStart(2, "0");
    const end = `${endDT.getFullYear()}${pad(endDT.getMonth()+1)}${pad(endDT.getDate())}T${pad(endDT.getHours())}${pad(endDT.getMinutes())}00`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.id || i}@travel-adviser`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${sanitize(r.activity)}`,
      `LOCATION:${sanitize(r.where)}`,
      `DESCRIPTION:${sanitize("Generated by Travel Adviser")}`,
      "END:VEVENT"
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
