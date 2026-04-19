import { saveCurrentTrip, listTrips, deleteTrip } from "./store.js";
import { findTemplates } from "./templates.js";
import { el, qs, uuid } from "./ui.js";

function formDataToTrip(fd) {
  return {
    id: uuid(),
    destination: fd.get("destination"),
    transport:   fd.get("transport"),
    tripType:    fd.get("tripType"),
    days:    Number(fd.get("days")),
    people:  Number(fd.get("people")),
    startDate:   fd.get("startDate"),
    budgetRange: fd.get("budgetRange"),
    mode: "new",
    templateId: null,
    anchors: {
      flight:  { status: "later", data: null },
      lodging: { status: "later", data: null }
    },
    config: {
      airportBufferDomestic: 90,
      airportBufferInternational: 150,
      checkInTime: "14:00",
      checkOutTime: "12:00"
    },
    itinerary: [],
    fees: [],
    participants: []
  };
}

function renderSavedTrips() {
  const host = qs("#saved-trips");
  host.innerHTML = "";
  const trips = listTrips();
  if (trips.length === 0) {
    host.appendChild(el("p", { class: "muted" }, "No saved trips yet."));
    return;
  }
  trips.forEach(t => {
    const card = el("div", { class: "card row" }, [
      el("div", { style: "flex:1" }, [
        el("div", { style: "font-weight:600" }, `${t.destination} — ${t.days}d`),
        el("div", { class: "muted", style: "font-size:.85rem" },
           `${t.transport} • ${t.people} people • ${t.startDate || ""}`)
      ]),
      el("button", {
        class: "btn btn-accent btn-sm",
        onclick: () => { saveCurrentTrip(t); location.href = "plan.html"; }
      }, "Open"),
      el("button", {
        class: "btn btn-outline btn-sm",
        onclick: () => { deleteTrip(t.id); renderSavedTrips(); }
      }, "Delete")
    ]);
    host.appendChild(card);
  });
}

async function openTemplateModal(trip) {
  const list = await findTemplates({
    destination: trip.destination, transport: trip.transport
  });
  const host = qs("#template-list");
  host.innerHTML = "";
  if (list.length === 0) {
    host.appendChild(el("p", { class: "muted" },
      "No templates match. Try creating a new plan instead."));
  } else {
    list.forEach(t => {
      host.appendChild(el("button", {
        class: "btn btn-outline",
        style: "width:100%; justify-content:flex-start;",
        onclick: () => {
          const chosen = { ...t.trip, id: uuid(),
            startDate: trip.startDate, people: trip.people };
          saveCurrentTrip(chosen);
          location.href = "plan.html";
        }
      }, `${t.destination} — ${t.days}d ${t.transport} (${t.source || "bundled"})`));
    });
  }
  qs("#template-modal").showModal();
}

qs("#trip-form").addEventListener("submit", async e => {
  e.preventDefault();
  const fd   = new FormData(e.target);
  const mode = e.submitter.value;
  const trip = formDataToTrip(fd);
  if (mode === "new") {
    saveCurrentTrip(trip);
    location.href = "plan.html";
  } else {
    await openTemplateModal(trip);
  }
});

qs("#template-close").addEventListener("click",
  () => qs("#template-modal").close());

renderSavedTrips();
