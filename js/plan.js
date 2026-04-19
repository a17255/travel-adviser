import { loadCurrentTrip, saveCurrentTrip, saveTrip, getProfile } from "./store.js";
import { qs, qsa, el, formatVND, uuid } from "./ui.js";
import { loadSuppliers } from "./templates.js";
import { shareOf, netPerParticipant, suggestSettlement } from "./fees.js";
import { parseFlight, parseLodging } from "./parser.js";

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
    if (btn.dataset.tab === "fees") renderFees();
    if (btn.dataset.tab === "plan") redraw();
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
      ? [...suppliers.airlines.domestic, ...(suppliers.airlines.international || [])]
      : [],
    fields: ["depart", "arrive", "from", "to", "international"]
  }));

  host.appendChild(anchorCard("Lodging", trip.anchors.lodging, {
    onStatus: (s) => { trip.anchors.lodging.status = s; redraw(); },
    onSave: (data) => { trip.anchors.lodging.data = data; redraw(); },
    suggestions: suppliers.hotels[trip.destination] || suppliers.hotels.__fallback__ || [],
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
    wrap.appendChild(el("p", { class: "text-sm text-gray-600 mb-2" },
      "1. Open a supplier below → book on their site. 2. Paste the confirmation email here, or click \"booked\" to fill manually."));

    const list = el("div", { class: "space-y-1 mb-4" });
    opts.suggestions.forEach(sup => {
      const row = el("div", {
        class: "flex justify-between items-center p-2 bg-gray-50 rounded-lg"
      }, [ el("span", {}, `${sup.name}${sup.tier ? " — " + sup.tier : ""}`) ]);
      if (sup.url) {
        const link = el("a", {
          href: sup.url, target: "_blank", rel: "noopener",
          class: "text-sky-600 text-sm font-semibold hover:underline"
        }, "Book on supplier ↗");
        row.appendChild(link);
      } else {
        row.appendChild(el("span", { class: "text-gray-400 text-sm" },
          "no link available"));
      }
      list.appendChild(row);
    });
    if (opts.suggestions.length === 0) {
      list.appendChild(el("p", { class: "text-gray-500 text-sm" },
        "No curated suppliers for this destination/transport. Use the paste box below, or switch to \"booked\" to enter fields manually."));
    }
    wrap.appendChild(list);

    // Smart-paste panel
    const pasteWrap = el("div", { class: "mt-2 p-3 bg-sky-50 rounded-lg" });
    pasteWrap.appendChild(el("h3", { class: "text-sm font-semibold mb-2" },
      "Smart paste — confirmation email"));
    const ta = el("textarea", {
      class: "w-full border rounded-lg p-2 text-sm",
      rows: 5,
      placeholder: "Paste the full confirmation email here…"
    });
    pasteWrap.appendChild(ta);

    const preview = el("div", { class: "mt-2 text-sm" });
    const parseBtn = el("button", {
      class: "mt-2 px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm",
      onclick: () => {
        const fn = title === "Flight" ? parseFlight : parseLodging;
        const data = fn(ta.value);
        preview.innerHTML = "";
        if (!data) {
          preview.appendChild(el("p", { class: "text-rose-600" },
            "Couldn't parse. Switch to \"booked\" to enter manually."));
          return;
        }
        const rows = Object.entries(data).filter(([, v]) => v !== "");
        const tbl = el("table", { class: "w-full text-left" });
        rows.forEach(([k, v]) =>
          tbl.appendChild(el("tr", {}, [
            el("td", { class: "pr-3 font-semibold" }, k),
            el("td", {}, String(v))
          ])));
        preview.appendChild(tbl);
        const save = el("button", {
          class: "mt-2 px-3 py-1 bg-sky-500 text-white rounded-lg text-sm",
          onclick: () => opts.onSave(data)
        }, "Save these details");
        preview.appendChild(save);
      }
    }, "Parse");
    pasteWrap.appendChild(parseBtn);
    pasteWrap.appendChild(preview);
    wrap.appendChild(pasteWrap);
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

async function renderItinerary() {
  const { renderItineraryInto, reseedAuto } = await import("./itinerary.js");
  reseedAuto(trip);
  const host = document.querySelector("#itinerary-host");
  if (host) renderItineraryInto(host, trip, redraw);
}

async function redraw() {
  renderOverview();
  await renderAnchors();
  await renderItinerary();
}

function renderFees() {
  const host = document.querySelector("#tab-fees");
  host.innerHTML = "";

  // Participant manager
  const pcard = el("div", { class: "bg-white rounded-2xl shadow p-5 mb-4" }, [
    el("h2", { class: "text-xl font-bold mb-3" }, "Participants")
  ]);
  const plist = el("div", { class: "flex flex-wrap gap-2 mb-3" });
  trip.participants.forEach(p => {
    plist.appendChild(el("span", {
      class: "px-3 py-1 rounded-full text-white",
      style: `background:${p.color}`
    }, [ p.name, el("button", {
      class: "ml-2",
      onclick: () => {
        trip.participants = trip.participants.filter(x => x.name !== p.name);
        renderFees();
      }
    }, "✕") ]));
  });
  pcard.appendChild(plist);
  const pinput = el("input", { placeholder: "name", class: "border rounded-lg p-2 mr-2" });
  const paddbtn = el("button", {
    class: "px-3 py-1 bg-sky-500 text-white rounded-lg",
    onclick: () => {
      if (!pinput.value) return;
      const colors = ["#0ea5e9","#f59e0b","#10b981","#f43f5e","#8b5cf6","#14b8a6"];
      const color = colors[trip.participants.length % colors.length];
      trip.participants.push({ name: pinput.value, color });
      renderFees();
    }
  }, "Add");
  pcard.appendChild(pinput);
  pcard.appendChild(paddbtn);
  host.appendChild(pcard);

  // Fee entry form
  const fcard = el("div", { class: "bg-white rounded-2xl shadow p-5 mb-4" }, [
    el("h2", { class: "text-xl font-bold mb-3" }, "Add fee")
  ]);
  const fform = el("div", { class: "grid grid-cols-2 gap-3" });
  const inputs = {
    date:   el("input", { type: "date", class: "border rounded-lg p-2" }),
    label:  el("input", { placeholder: "label", class: "border rounded-lg p-2" }),
    amount: el("input", { type: "number", placeholder: "amount", class: "border rounded-lg p-2" }),
    paidBy: el("select", { class: "border rounded-lg p-2" }),
    splitMode: el("select", { class: "border rounded-lg p-2" },
      ["all","exclude","include","manual"].map(m =>
        el("option", { value: m }, m)))
  };
  trip.participants.forEach(p =>
    inputs.paidBy.appendChild(el("option", { value: p.name }, p.name)));
  Object.entries(inputs).forEach(([k, v]) =>
    fform.appendChild(el("label", { class: "text-sm" },
      [ el("span", { class: "font-semibold" }, k), v ])));
  const addBtn = el("button", {
    class: "col-span-2 bg-emerald-600 text-white rounded-lg py-2",
    onclick: () => {
      const profile = getProfile();
      const fee = {
        id: uuid(),
        date:   inputs.date.value,
        label:  inputs.label.value,
        amount: Number(inputs.amount.value),
        currency: "VND",
        paidBy: inputs.paidBy.value,
        splitMode: inputs.splitMode.value,
        participants: [],
        manualShares: null,
        voided: false,
        log: [{ at: new Date().toISOString(),
                who: profile.name || "anon",
                action: "add", snapshot: null }]
      };
      if (fee.splitMode === "include" || fee.splitMode === "exclude") {
        const csv = prompt(`Names (comma-separated) to ${fee.splitMode}:`);
        fee.participants = (csv || "").split(",").map(s => s.trim()).filter(Boolean);
      }
      if (fee.splitMode === "manual") {
        fee.manualShares = {};
        trip.participants.forEach(p => {
          fee.manualShares[p.name] = Number(prompt(`Share for ${p.name}?`) || 0);
        });
      }
      trip.fees.push(fee);
      renderFees();
    }
  }, "Add fee");
  fform.appendChild(addBtn);
  fcard.appendChild(fform);
  host.appendChild(fcard);

  // Fee list
  const lcard = el("div", { class: "bg-white rounded-2xl shadow p-5 mb-4" }, [
    el("h2", { class: "text-xl font-bold mb-3" }, "Fees")
  ]);
  if (trip.fees.length === 0) {
    lcard.appendChild(el("p", { class: "text-gray-500" }, "No fees yet."));
  } else {
    const tbl = el("table", { class: "w-full text-left" });
    tbl.appendChild(el("thead", {}, el("tr", {},
      ["Date","Label","Amount","Paid by","Split",""].map(h => el("th", {}, h)))));
    const tb = el("tbody");
    trip.fees.forEach(f => {
      tb.appendChild(el("tr", { style: f.voided ? "opacity:.4" : "" }, [
        el("td", {}, f.date), el("td", {}, f.label),
        el("td", {}, formatVND(f.amount)), el("td", {}, f.paidBy),
        el("td", {}, f.splitMode),
        el("td", {}, el("button", {
          class: "text-rose-500",
          onclick: () => {
            f.voided = !f.voided;
            f.log.push({ at: new Date().toISOString(),
              who: getProfile().name || "anon",
              action: "void", snapshot: null });
            renderFees();
          }
        }, f.voided ? "unvoid" : "void"))
      ]));
    });
    tbl.appendChild(tb);
    lcard.appendChild(tbl);
  }
  host.appendChild(lcard);

  // Summary + settlement
  const net = netPerParticipant(trip.fees, trip.participants);
  const scard = el("div", { class: "bg-white rounded-2xl shadow p-5" }, [
    el("h2", { class: "text-xl font-bold mb-3" }, "Balance")
  ]);
  const ul = el("ul", { class: "space-y-1" });
  Object.entries(net).forEach(([name, v]) =>
    ul.appendChild(el("li", {},
      `${name}: ${v >= 0 ? "+" : ""}${formatVND(v)}`)));
  scard.appendChild(ul);
  const settlements = suggestSettlement(net);
  if (settlements.length) {
    scard.appendChild(el("h3", { class: "font-bold mt-4" }, "Suggested settlement"));
    const sl = el("ul", { class: "space-y-1" });
    settlements.forEach(s =>
      sl.appendChild(el("li", {},
        `${s.from} pays ${s.to}: ${formatVND(s.amount)}`)));
    scard.appendChild(sl);
  }
  host.appendChild(scard);
}

redraw();
renderFees();

export { trip, renderOverview };
