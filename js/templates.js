import { listUserTemplates } from "./store.js";

let cache = null;

export async function loadBundledTemplates() {
  if (cache) return cache;
  const idx = await fetch("templates/index.json").then(r => r.json());
  const full = await Promise.all(
    idx.map(async entry => ({
      ...entry,
      trip: await fetch(`templates/${entry.file}`).then(r => r.json())
    }))
  );
  cache = full;
  return full;
}

export async function findTemplates({ destination, transport }) {
  const bundled = await loadBundledTemplates();
  const user    = listUserTemplates().map(t => ({
    id: t.id, destination: t.destination, transport: t.transport,
    days: t.days, tripType: t.tripType, trip: t, source: "user"
  }));
  const all = [...bundled.map(b => ({ ...b, source: "bundled" })), ...user];
  return all.filter(t =>
    (!destination || t.destination.toLowerCase() === destination.toLowerCase()) &&
    (!transport   || t.transport === transport)
  );
}

export async function loadSuppliers() {
  return fetch("templates/suppliers.json").then(r => r.json());
}
