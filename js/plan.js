import { loadCurrentTrip, saveCurrentTrip, saveTrip } from "./store.js";
import { qs, qsa, el } from "./ui.js";
import { loadSuppliers } from "./templates.js";

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

async function renderAnchors() {
  const host = document.querySelector("#tab-plan");
  host.innerHTML = "";
  const suppliers = await loadSuppliers();

  host.appendChild(anchorCard("Flight", trip.anchors.flight, {
    onStatus: (s) => { trip.anchors.flight.status = s; redraw(); },
    onSave: (data) => { trip.anchors.flight.data = data; redraw(); },
    suggestions: trip.transport === "air"
      ? suppliers.airlines.domestic
      : [],
    fields: ["depart", "arrive", "from", "to", "international"]
  }));

  host.appendChild(anchorCard("Lodging", trip.anchors.lodging, {
    onStatus: (s) => { trip.anchors.lodging.status = s; redraw(); },
    onSave: (data) => { trip.anchors.lodging.data = data; redraw(); },
    suggestions: suppliers.hotels[trip.destination] || [],
    fields: ["checkInDate", "checkOutDate", "name"]
  }));

  host.appendChild(configCard());
  host.appendChild(itineraryCard());
}

function anchorCard(title, anchor, opts) {
  const wrap = el("div", {
    class: "bg-white rounded-2xl shadow p-5 mb-4"
  }, [ el("h2", { class: "text-xl font-bold mb-3" }, title) ]);

  const selector = el("div", { class: "flex gap-2 mb-3" });
  ["book-now", "later", "booked"].forEach(s => {
    const b = el("button", {
      class: `px-3 py-1 rounded-lg ${anchor.status === s
        ? "bg-sky-500 text-white" : "bg-gray-200"}`,
      onclick: () => opts.onStatus(s)
    }, s.replace("-", " "));
    selector.appendChild(b);
  });
  wrap.appendChild(selector);

  if (anchor.status === "book-now") {
    const list = el("div", { class: "space-y-1" });
    opts.suggestions.forEach(sup => {
      list.appendChild(el("div", {
        class: "flex justify-between items-center p-2 bg-gray-50 rounded-lg"
      }, [
        el("span", {}, `${sup.name}${sup.tier ? " — " + sup.tier : ""}`),
        el("button", {
          class: "text-sky-600 text-sm",
          onclick: () => {
            const data = { provider: sup.name };
            opts.fields.forEach(f => {
              data[f] = prompt(`${f}?`) || "";
              if (f === "international") data[f] = data[f] === "true";
            });
            opts.onSave(data);
          }
        }, "Mark as booked")
      ]));
    });
    if (opts.suggestions.length === 0) {
      list.appendChild(el("p", { class: "text-gray-500 text-sm" },
        "No suggestions for this destination/transport. Use 'booked' to enter manually."));
    }
    wrap.appendChild(list);
  } else if (anchor.status === "booked") {
    const form = el("div", { class: "grid grid-cols-2 gap-2" });
    opts.fields.forEach(f => {
      const input = el("input", {
        class: "border rounded-lg p-2",
        placeholder: f,
        value: anchor.data?.[f] ?? ""
      });
      input.addEventListener("change", () => {
        const data = { ...(anchor.data || {}) };
        data[f] = f === "international" ? (input.value === "true") : input.value;
        opts.onSave(data);
      });
      form.appendChild(input);
    });
    wrap.appendChild(form);
  } else {
    wrap.appendChild(el("p", { class: "text-gray-500 text-sm" },
      "Book later. Timing auto-rows skipped until booked."));
  }
  return wrap;
}

function configCard() {
  const wrap = el("details", {
    class: "bg-white rounded-2xl shadow p-5 mb-4"
  }, [ el("summary", { class: "font-bold cursor-pointer" }, "Config") ]);
  const grid = el("div", { class: "grid grid-cols-2 gap-3 mt-3" });
  const fields = [
    ["airportBufferDomestic", "Domestic buffer (min)", "number"],
    ["airportBufferInternational", "Intl buffer (min)", "number"],
    ["checkInTime",  "Check-in time",  "time"],
    ["checkOutTime", "Check-out time", "time"]
  ];
  fields.forEach(([k, label, type]) => {
    const input = el("input", {
      type, value: trip.config[k],
      class: "border rounded-lg p-2 w-full"
    });
    input.addEventListener("change", () => {
      trip.config[k] = type === "number" ? Number(input.value) : input.value;
      redraw();
    });
    grid.appendChild(el("label", {}, [
      el("span", { class: "text-sm font-semibold" }, label), input
    ]));
  });
  wrap.appendChild(grid);
  return wrap;
}

function itineraryCard() {
  return el("div", { id: "itinerary-host" });
}

function redraw() {
  renderOverview();
  renderAnchors();
}

renderAnchors();

export { trip, renderOverview };
