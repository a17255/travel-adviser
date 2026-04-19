import { autoRows } from "./timing.js";
import { generatePlan } from "./planner.js";
import { el, uuid } from "./ui.js";

export function reseedAuto(trip) {
  const userRows = trip.itinerary.filter(r => r.source === "user");
  trip.itinerary = [...autoRows(trip), ...userRows].sort(cmp);
}

export function smartGenerate(trip) {
  const userRows = trip.itinerary.filter(r => r.source === "user");
  const fresh = generatePlan({
    ...trip,
    itinerary: userRows
  });
  trip.itinerary = fresh;
}

function cmp(a, b) {
  return (a.date + a.timeStart).localeCompare(b.date + b.timeStart);
}

function overlapsAuto(row, rows) {
  if (row.source !== "auto") return false;
  return rows.some(r => r !== row && r.source === "user" &&
    r.date === row.date && r.timeStart === row.timeStart);
}

export function renderItineraryInto(host, trip, onChange) {
  host.innerHTML = "";
  const card = el("div", { class: "card" });

  const header = el("div", { class: "row", style: "justify-content: space-between; margin-bottom: 1rem;" }, [
    el("h2", { style: "margin:0" }, "Itinerary"),
    el("div", { class: "row-wrap" }, [
      el("button", {
        class: "btn btn-primary btn-sm",
        onclick: () => {
          if (trip.itinerary.some(r => r.source === "generated") &&
              !confirm("Regenerate the day-by-day plan? Existing generated rows will be replaced. Manually-added rows are kept.")) return;
          smartGenerate(trip);
          onChange();
        }
      }, "✨ Smart generate"),
      el("button", {
        class: "btn btn-outline btn-sm",
        onclick: () => {
          trip.itinerary.push({
            id: uuid(),
            date: trip.startDate || new Date().toISOString().slice(0,10),
            timeStart: "12:00", activity: "", where: "", source: "user"
          });
          onChange();
        }
      }, "+ Add row")
    ])
  ]);
  card.appendChild(header);

  const table = el("table", { class: "itinerary" });
  table.appendChild(el("thead", {}, el("tr", {}, [
    el("th", {}, "Date"), el("th", {}, "Start"),
    el("th", {}, "Activity"), el("th", {}, "Where"), el("th", {}, "")
  ])));
  const tbody = el("tbody");
  trip.itinerary.sort(cmp);
  trip.itinerary.forEach(r => {
    const tr = el("tr");
    const dateIn = el("input", { type: "date", value: r.date });
    const timeIn = el("input", { type: "time", value: r.timeStart });
    const actIn  = el("input", { value: r.activity, style: "width:100%" });
    const whereIn= el("input", { value: r.where,    style: "width:100%" });

    [dateIn, timeIn, actIn, whereIn].forEach(inp =>
      inp.addEventListener("change", () => {
        r.date = dateIn.value; r.timeStart = timeIn.value;
        r.activity = actIn.value; r.where = whereIn.value;
        if (r.source !== "user") r.source = "user";
        onChange();
      }));

    tr.appendChild(el("td", {}, dateIn));
    tr.appendChild(el("td", {}, timeIn));
    const actCell = el("td", {}, [ actIn ]);
    if (r.source === "auto") actCell.appendChild(el("span", { class: "badge badge-auto", style: "margin-left:.4rem;" }, "anchor"));
    else if (r.source === "generated") actCell.appendChild(el("span", { class: "badge badge-auto", style: "margin-left:.4rem;" }, "auto"));
    if (overlapsAuto(r, trip.itinerary))
      actCell.appendChild(el("span", { class: "badge badge-overlap", style: "margin-left:.4rem;" }, "overlaps"));
    tr.appendChild(actCell);
    tr.appendChild(el("td", {}, whereIn));
    tr.appendChild(el("td", {}, el("button", {
      class: "btn-ghost",
      onclick: () => {
        trip.itinerary = trip.itinerary.filter(x => x.id !== r.id);
        onChange();
      }
    }, "✕")));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  card.appendChild(table);
  host.appendChild(card);
}
