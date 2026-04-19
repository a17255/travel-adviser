import { loadCurrentTrip, saveCurrentTrip, saveTrip, getProfile } from "./store.js";
import { qs, qsa, el, formatVND, uuid } from "./ui.js";
import { loadSuppliers } from "./templates.js";
import { shareOf, netPerParticipant, suggestSettlement } from "./fees.js";
import { parseFlight, parseLodging } from "./parser.js";

const trip = loadCurrentTrip();
if (!trip) { location.href = "index.html"; throw new Error("no trip"); }

const FEE_LABELS = [
  "Breakfast", "Lunch", "Dinner", "Cafe", "Snack",
  "Transport", "Taxi / Grab", "Fuel / Parking",
  "Accommodation", "Activity / Ticket", "Shopping",
  "Groceries", "Tip", "Other"
];

function pad(n) { return String(n).padStart(2, "0"); }

function addDaysISO(dateStr, n) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const d = new Date(dateStr + "T00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function dedupeByKey(list, keyFn) {
  const seen = new Set();
  return list.filter(item => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

qs("#trip-title").textContent =
  `${trip.destination} — ${trip.days}d ${trip.transport}`;

function renderOverview() {
  const f = trip.anchors.flight.data;
  const l = trip.anchors.lodging.data;
  qs("#overview").textContent =
    `${trip.people} people • ${trip.startDate || "no date"}` +
    (f ? ` • Flight ${f.from || ""}→${f.to || ""}` : "") +
    (l ? ` • ${l.name || ""}` : "");
}
renderOverview();

qs("#save-trip").addEventListener("click", () => {
  saveTrip(trip);
  saveCurrentTrip(trip);
  alert("Trip saved.");
});

qsa(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const name = btn.dataset.tab;
    qs("#tab-plan").hidden = name !== "plan";
    qs("#tab-fees").hidden = name !== "fees";
    if (name === "fees") renderFees();
    if (name === "plan") redraw();
  });
});

async function renderAnchors() {
  const host = qs("#tab-plan");
  host.innerHTML = "";
  const suppliers = await loadSuppliers();

  const airlineSuggestions = trip.transport === "air"
    ? dedupeByKey(
        [...suppliers.airlines.domestic, ...(suppliers.airlines.international || [])],
        s => s.code || s.name)
    : [];

  host.appendChild(anchorCard("Flight", trip.anchors.flight, {
    onStatus: (s) => { trip.anchors.flight.status = s; redraw(); },
    onSave: (data) => { trip.anchors.flight.data = data; redraw(); },
    suggestions: airlineSuggestions,
    extraSuggestions: [],
    fields: ["depart", "arrive", "from", "to", "international"],
    parser: parseFlight
  }));

  const curatedHotels = suppliers.hotels[trip.destination] || [];
  const fallbackHotels = suppliers.hotels.__fallback__ || [];
  host.appendChild(anchorCard("Lodging", trip.anchors.lodging, {
    onStatus: (s) => { trip.anchors.lodging.status = s; redraw(); },
    onSave: (data) => { trip.anchors.lodging.data = data; redraw(); },
    suggestions: curatedHotels.length ? curatedHotels : fallbackHotels,
    extraSuggestions: curatedHotels.length ? fallbackHotels : [],
    fields: ["checkInDate", "checkOutDate", "name"],
    parser: parseLodging
  }));

  host.appendChild(configCard());
  host.appendChild(itineraryHost());
}

function anchorCard(title, anchor, opts) {
  const wrap = el("div", { class: "card" });
  wrap.appendChild(el("h2", { style: "margin:0 0 .75rem" }, title));

  const seg = el("div", { class: "status-seg" });
  [["book-now","Book now"],["later","Later"],["booked","Booked"]].forEach(([s, label]) => {
    const b = el("button", {
      class: anchor.status === s ? "active" : "",
      onclick: () => opts.onStatus(s)
    }, label);
    seg.appendChild(b);
  });
  wrap.appendChild(seg);

  if (anchor.status === "book-now") {
    wrap.appendChild(el("p", { class: "muted", style: "font-size:.88rem; margin:.75rem 0 .5rem;" },
      "1. Pick a supplier to book on their site. 2. Paste the confirmation email below, or switch to \"Booked\" for manual entry."));

    const list = el("div", { class: "stack", style: "margin-bottom:1rem;" });
    renderSupplierList(list, opts.suggestions);
    if (opts.extraSuggestions.length) {
      const details = el("details", { style: "margin-top:.5rem;" });
      details.appendChild(el("summary", { style: "cursor:pointer; color:var(--caramel); font-weight:600; font-size:.9rem;" },
        `More options (${opts.extraSuggestions.length} brokers)`));
      const extra = el("div", { class: "stack", style: "margin-top:.5rem;" });
      renderSupplierList(extra, opts.extraSuggestions);
      details.appendChild(extra);
      list.appendChild(details);
    }
    wrap.appendChild(list);

    wrap.appendChild(smartPastePanel(opts.parser, opts.onSave));
  } else if (anchor.status === "booked") {
    const hint = el("div", { class: "subpanel", style: "margin-top:.75rem;" });
    hint.appendChild(el("p", { class: "muted", style: "font-size:.88rem; margin:0 0 .5rem;" },
      "Paste a confirmation email to auto-fill, or edit the fields directly."));
    hint.appendChild(smartPastePanel(opts.parser, (data) => {
      const merged = { ...(anchor.data || {}), ...data };
      opts.onSave(merged);
    }, { compact: true }));
    wrap.appendChild(hint);

    const form = el("div", { class: "grid-2", style: "margin-top:.75rem;" });
    opts.fields.forEach(f => {
      const isIntl = f === "international";
      const input = el("input", {
        type: f.toLowerCase().includes("date") ? (f.toLowerCase().includes("time") ? "datetime-local" :
               (f === "depart" || f === "arrive") ? "datetime-local" : "date") :
               (isIntl ? "checkbox" : "text"),
        placeholder: f,
        value: anchor.data?.[f] ?? "",
        checked: isIntl ? !!anchor.data?.[f] : undefined,
        style: "width:100%"
      });
      input.addEventListener("change", () => {
        const data = { ...(anchor.data || {}) };
        data[f] = isIntl ? input.checked : input.value;
        opts.onSave(data);
      });
      const label = el("label", {}, [
        el("span", {}, f),
        input
      ]);
      form.appendChild(label);
    });
    wrap.appendChild(form);
  } else {
    wrap.appendChild(el("p", { class: "muted", style: "font-size:.88rem; margin-top:.75rem;" },
      "Book later. Day-by-day timing around this anchor will activate once booked."));
  }
  return wrap;
}

function renderSupplierList(host, suggestions) {
  if (suggestions.length === 0) {
    host.appendChild(el("p", { class: "muted", style: "font-size:.88rem;" },
      "No curated suppliers for this destination. Use the paste box or \"Booked\" tab."));
    return;
  }
  suggestions.forEach(sup => {
    const row = el("div", {
      class: "row",
      style: "justify-content: space-between; padding:.5rem .75rem; background: var(--cream); border-radius:10px;"
    });
    row.appendChild(el("span", {}, `${sup.name}${sup.tier ? " — " + sup.tier : ""}`));
    if (sup.url) {
      row.appendChild(el("a", {
        href: sup.url, target: "_blank", rel: "noopener",
        class: "btn btn-accent btn-sm"
      }, "Book on supplier ↗"));
    } else {
      row.appendChild(el("span", { class: "muted", style: "font-size:.85rem;" }, "no link"));
    }
    host.appendChild(row);
  });
}

function smartPastePanel(parser, onSave, { compact = false } = {}) {
  const panel = el("div", { class: compact ? "" : "subpanel" });
  if (!compact) panel.appendChild(el("h3", { style: "margin:0 0 .5rem; font-size:1rem;" },
    "Smart paste — confirmation email"));

  const ta = el("textarea", {
    rows: compact ? 3 : 5, placeholder: "Paste the confirmation email…",
    style: "width:100%"
  });
  panel.appendChild(ta);

  const preview = el("div", { style: "margin-top:.5rem; font-size:.9rem;" });
  const btn = el("button", {
    class: "btn btn-primary btn-sm", style: "margin-top:.5rem;",
    onclick: () => {
      const data = parser(ta.value);
      preview.innerHTML = "";
      if (!data) {
        preview.appendChild(el("p", { style: "color:var(--rose);" },
          "Couldn't parse. Edit fields manually below."));
        return;
      }
      const rows = Object.entries(data).filter(([, v]) => v !== "" && v !== false);
      const tbl = el("table", { style: "width:100%;" });
      rows.forEach(([k, v]) =>
        tbl.appendChild(el("tr", {}, [
          el("td", { style: "padding:.15rem .6rem .15rem 0; font-weight:600;" }, k),
          el("td", { style: "padding:.15rem 0;" }, String(v))
        ])));
      preview.appendChild(tbl);
      const save = el("button", {
        class: "btn btn-accent btn-sm", style: "margin-top:.5rem;",
        onclick: () => onSave(data)
      }, "Use these details");
      preview.appendChild(save);
    }
  }, "Parse email");
  panel.appendChild(btn);
  panel.appendChild(preview);
  return panel;
}

function configCard() {
  const wrap = el("details", { class: "card" });
  wrap.appendChild(el("summary", { style: "cursor:pointer; font-weight:600;" }, "Trip config"));
  const grid = el("div", { class: "grid-2", style: "margin-top:.75rem;" });
  const fields = [
    ["airportBufferDomestic", "Domestic buffer (min)", "number"],
    ["airportBufferInternational", "Intl buffer (min)", "number"],
    ["checkInTime",  "Check-in time",  "time"],
    ["checkOutTime", "Check-out time", "time"]
  ];
  fields.forEach(([k, label, type]) => {
    const input = el("input", {
      type, value: trip.config[k], style: "width:100%"
    });
    input.addEventListener("change", () => {
      trip.config[k] = type === "number" ? Number(input.value) : input.value;
      redraw();
    });
    grid.appendChild(el("label", {}, [ el("span", {}, label), input ]));
  });
  wrap.appendChild(grid);
  return wrap;
}

function itineraryHost() {
  return el("div", { id: "itinerary-host" });
}

async function renderItinerary() {
  const { renderItineraryInto, reseedAuto } = await import("./itinerary.js");
  reseedAuto(trip);
  const host = qs("#itinerary-host");
  if (host) renderItineraryInto(host, trip, redraw);
}

async function redraw() {
  renderOverview();
  await renderAnchors();
  await renderItinerary();
}

// ------------------------- Fees tab -------------------------

function renderFees() {
  const host = qs("#tab-fees");
  host.innerHTML = "";

  host.appendChild(renderParticipants());
  host.appendChild(renderFeeEntry());
  host.appendChild(renderFeeList());
  host.appendChild(renderBalance());
}

function renderParticipants() {
  const card = el("div", { class: "card" });
  card.appendChild(el("h2", { style: "margin:0 0 .75rem" }, "Participants"));

  const plist = el("div", { class: "row-wrap", style: "margin-bottom:.75rem;" });
  trip.participants.forEach(p => {
    plist.appendChild(el("span", {
      class: "pill", style: `background:${p.color}`
    }, [ p.name, el("button", {
      onclick: () => {
        trip.participants = trip.participants.filter(x => x.name !== p.name);
        renderFees();
      }
    }, "✕") ]));
  });
  card.appendChild(plist);

  const row = el("div", { class: "row" });
  const pinput = el("input", { placeholder: "name", style: "flex:1" });
  const paddbtn = el("button", {
    class: "btn btn-primary btn-sm",
    onclick: () => {
      if (!pinput.value) return;
      const colors = ["#0ea5e9","#C68642","#059669","#C17767","#8b5cf6","#14b8a6","#f59e0b"];
      const color = colors[trip.participants.length % colors.length];
      trip.participants.push({ name: pinput.value, color });
      pinput.value = "";
      renderFees();
    }
  }, "Add");
  row.appendChild(pinput);
  row.appendChild(paddbtn);
  card.appendChild(row);
  return card;
}

function renderFeeEntry() {
  const card = el("div", { class: "card" });
  card.appendChild(el("h2", { style: "margin:0 0 .75rem" }, "Add fee"));

  const defaultDate = trip.startDate || new Date().toISOString().slice(0, 10);
  const state = {
    date: defaultDate,
    label: FEE_LABELS[0],
    customLabel: "",
    amount: 0,
    place: "",
    paidBy: trip.participants[0]?.name || "",
    splitMode: "all",
    selected: new Set(trip.participants.map(p => p.name)),
    customNames: ""
  };

  // Row 1: date with ± buttons
  const dateBox = el("div", { class: "row" });
  const dateInput = el("input", { type: "date", value: state.date, style: "flex:1" });
  dateInput.addEventListener("change", () => { state.date = dateInput.value; });
  const minus = el("button", {
    class: "btn btn-outline btn-sm",
    onclick: () => {
      state.date = addDaysISO(state.date, -1);
      dateInput.value = state.date;
    }
  }, "−1d");
  const plus = el("button", {
    class: "btn btn-outline btn-sm",
    onclick: () => {
      state.date = addDaysISO(state.date, 1);
      dateInput.value = state.date;
    }
  }, "+1d");
  dateBox.append(minus, dateInput, plus);

  // Row 2: label dropdown (+ custom input when "Other")
  const labelSelect = el("select", { style: "width:100%" });
  FEE_LABELS.forEach(l =>
    labelSelect.appendChild(el("option", { value: l }, l)));
  const customLabelInput = el("input", {
    placeholder: "Custom label…",
    style: "width:100%; margin-top:.35rem; display:none;"
  });
  labelSelect.addEventListener("change", () => {
    state.label = labelSelect.value;
    customLabelInput.style.display = state.label === "Other" ? "" : "none";
  });
  customLabelInput.addEventListener("input", () => { state.customLabel = customLabelInput.value; });

  // Amount
  const amountInput = el("input", { type: "number", placeholder: "VND amount", style: "width:100%" });
  amountInput.addEventListener("input", () => { state.amount = Number(amountInput.value); });

  // Place
  const placeInput = el("input", { placeholder: "Place (optional, e.g. Restaurant AAA)", style: "width:100%" });
  placeInput.addEventListener("input", () => { state.place = placeInput.value; });

  // Paid by
  const paidSelect = el("select", { style: "width:100%" });
  trip.participants.forEach(p =>
    paidSelect.appendChild(el("option", { value: p.name }, p.name)));
  paidSelect.addEventListener("change", () => { state.paidBy = paidSelect.value; });

  // Split mode
  const splitSelect = el("select", { style: "width:100%" });
  ["all","exclude","include","manual"].forEach(m =>
    splitSelect.appendChild(el("option", { value: m }, m)));
  splitSelect.addEventListener("change", () => {
    state.splitMode = splitSelect.value;
    renderSelector();
  });

  // Participant selector (only for exclude/include)
  const selectorHost = el("div", { style: "grid-column: 1 / -1;" });
  const renderSelector = () => {
    selectorHost.innerHTML = "";
    if (state.splitMode !== "include" && state.splitMode !== "exclude" && state.splitMode !== "manual") return;

    if (state.splitMode === "manual") {
      selectorHost.appendChild(el("p", { class: "muted", style: "font-size:.85rem; margin:0 0 .35rem;" },
        "Manual split — enter amount per person (must sum to total)."));
      state.manualShares = state.manualShares || {};
      trip.participants.forEach(p => {
        const row = el("label", { class: "row", style: "margin-bottom:.25rem;" });
        row.appendChild(el("span", { style: "width:6rem;" }, p.name));
        const inp = el("input", {
          type: "number", value: state.manualShares[p.name] ?? "",
          placeholder: "0", style: "flex:1"
        });
        inp.addEventListener("input", () => {
          state.manualShares[p.name] = Number(inp.value) || 0;
        });
        row.appendChild(inp);
        selectorHost.appendChild(row);
      });
      return;
    }

    selectorHost.appendChild(el("p", { class: "muted", style: "font-size:.85rem; margin:0 0 .35rem;" },
      `Tick the people to ${state.splitMode}.`));

    const pills = el("div", { class: "row-wrap" });
    trip.participants.forEach(p => {
      const label = el("label", {
        class: "pill", style: `background:${p.color}; cursor:pointer;`
      });
      const cb = el("input", {
        type: "checkbox", style: "margin:0 .35rem 0 0;",
        checked: state.selected.has(p.name)
      });
      cb.addEventListener("change", () => {
        if (cb.checked) state.selected.add(p.name);
        else state.selected.delete(p.name);
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(p.name));
      pills.appendChild(label);
    });
    selectorHost.appendChild(pills);

    selectorHost.appendChild(el("label", { style: "display:block; margin-top:.5rem;" }, [
      el("span", {}, "Extra names not in participants (comma-separated)"),
      (() => {
        const inp = el("input", { placeholder: "e.g. Aunt Ly, Guest 1", style: "width:100%" });
        inp.addEventListener("input", () => { state.customNames = inp.value; });
        return inp;
      })()
    ]));
  };

  // Build form grid
  const grid = el("div", { class: "grid-2" });
  grid.append(
    el("label", { style: "grid-column: 1 / -1;" }, [ el("span", {}, "Date"), dateBox ]),
    el("label", {}, [ el("span", {}, "Label"), labelSelect, customLabelInput ]),
    el("label", {}, [ el("span", {}, "Amount"), amountInput ]),
    el("label", { style: "grid-column: 1 / -1;" }, [ el("span", {}, "Place (optional)"), placeInput ]),
    el("label", {}, [ el("span", {}, "Paid by"), paidSelect ]),
    el("label", {}, [ el("span", {}, "Split mode"), splitSelect ]),
    selectorHost
  );

  const addBtn = el("button", {
    class: "btn btn-primary",
    style: "margin-top:.75rem;",
    onclick: () => {
      if (!state.amount) { alert("Enter an amount."); return; }
      if (!state.paidBy) { alert("Select who paid."); return; }

      const profile = getProfile();
      const label = state.label === "Other" && state.customLabel
        ? state.customLabel : state.label;
      const extras = (state.customNames || "").split(",").map(s => s.trim()).filter(Boolean);

      let participants = [];
      if (state.splitMode === "include") {
        participants = [...Array.from(state.selected), ...extras];
      } else if (state.splitMode === "exclude") {
        participants = [...Array.from(state.selected), ...extras];
      }

      const fee = {
        id: uuid(),
        date: state.date,
        label,
        place: state.place,
        amount: state.amount,
        currency: "VND",
        paidBy: state.paidBy,
        splitMode: state.splitMode,
        participants,
        manualShares: state.splitMode === "manual" ? { ...state.manualShares } : null,
        voided: false,
        log: [{ at: new Date().toISOString(),
                who: profile.name || "anon",
                action: "add", snapshot: null }]
      };
      trip.fees.push(fee);
      renderFees();
    }
  }, "Add fee");

  card.append(grid, addBtn);
  return card;
}

function renderFeeList() {
  const card = el("div", { class: "card" });
  card.appendChild(el("h2", { style: "margin:0 0 .75rem" }, "Fees"));

  if (trip.fees.length === 0) {
    card.appendChild(el("p", { class: "muted" }, "No fees yet."));
    return card;
  }

  const tbl = el("table", { class: "fee-list" });
  tbl.appendChild(el("thead", {}, el("tr", {},
    ["Date","Label","Place","Amount","Paid by","Split",""].map(h => el("th", {}, h)))));
  const tb = el("tbody");
  trip.fees.forEach(f => {
    tb.appendChild(el("tr", { style: f.voided ? "opacity:.4" : "" }, [
      el("td", {}, f.date),
      el("td", {}, f.label),
      el("td", { class: "muted", style: "font-size:.85rem;" }, f.place || ""),
      el("td", {}, formatVND(f.amount)),
      el("td", {}, f.paidBy),
      el("td", {}, f.splitMode),
      el("td", {}, el("button", {
        class: "btn-ghost",
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
  card.appendChild(tbl);
  return card;
}

function renderBalance() {
  const card = el("div", { class: "card" });
  card.appendChild(el("h2", { style: "margin:0 0 .75rem" }, "Balance"));
  const net = netPerParticipant(trip.fees, trip.participants);
  const ul = el("ul", { class: "stack", style: "padding:0; list-style:none;" });
  Object.entries(net).forEach(([name, v]) =>
    ul.appendChild(el("li", { class: "row", style: "justify-content:space-between;" }, [
      el("span", { style: "font-weight:600;" }, name),
      el("span", { style: `color:${v >= 0 ? 'var(--palm)' : 'var(--rose)'};` },
         `${v >= 0 ? "+" : ""}${formatVND(v)}`)
    ])));
  card.appendChild(ul);

  const settlements = suggestSettlement(net);
  if (settlements.length) {
    card.appendChild(el("h3", { style: "margin: 1rem 0 .5rem;" }, "Suggested settlement"));
    const sl = el("ul", { class: "stack", style: "padding:0; list-style:none;" });
    settlements.forEach(s =>
      sl.appendChild(el("li", {},
        el("span", {}, `${s.from} pays ${s.to}: `),
        el("strong", {}, formatVND(s.amount)))));
    card.appendChild(sl);
  }
  return card;
}

redraw();

export { trip, renderOverview };
