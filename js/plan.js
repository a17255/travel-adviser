import { loadCurrentTrip, saveCurrentTrip, saveTrip } from "./store.js";
import { qs, qsa } from "./ui.js";

const trip = loadCurrentTrip();
if (!trip) { location.href = "index.html"; throw new Error("no trip"); }

qs("#trip-title").textContent =
  `${trip.destination} — ${trip.days}d ${trip.transport}`;

function renderOverview() {
  const f = trip.anchors.flight.data;
  const l = trip.anchors.lodging.data;
  qs("#overview").textContent =
    `${trip.people} people • ${trip.startDate || "no date"}` +
    (f ? ` • Flight ${f.from}→${f.to}` : "") +
    (l ? ` • ${l.name}` : "");
}
renderOverview();

qs("#save-trip").addEventListener("click", () => {
  saveTrip(trip);
  saveCurrentTrip(trip);
  alert("Trip saved.");
});

qsa(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".tab-btn").forEach(b => {
      b.classList.remove("border-sky-500", "font-semibold");
      b.classList.add("border-transparent");
    });
    btn.classList.remove("border-transparent");
    btn.classList.add("border-sky-500", "font-semibold");
    const name = btn.dataset.tab;
    qs("#tab-plan").classList.toggle("hidden", name !== "plan");
    qs("#tab-fees").classList.toggle("hidden", name !== "fees");
  });
});

export { trip, renderOverview };
