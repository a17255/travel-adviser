import { autoRows } from "./timing.js";
import { el, uuid } from "./ui.js";

export function reseedAuto(trip) {
  const userRows = trip.itinerary.filter(r => r.source === "user");
  trip.itinerary = [...autoRows(trip), ...userRows]
    .sort(cmp);
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
  const card = el("div", { class: "bg-white rounded-2xl shadow p-5" });
  card.appendChild(el("div", { class: "flex justify-between items-center mb-3" }, [
    el("h2", { class: "text-xl font-bold" }, "Itinerary"),
    el("button", {
      class: "px-3 py-1 bg-sky-500 text-white rounded-lg",
      onclick: () => {
        trip.itinerary.push({
          id: uuid(),
          date: trip.startDate || new Date().toISOString().slice(0,10),
          timeStart: "12:00", activity: "", where: "", source: "user"
        });
        onChange();
      }
    }, "+ Add row")
  ]));

  const table = el("table", { class: "itinerary w-full text-left" });
  table.appendChild(el("thead", {}, el("tr", {}, [
    el("th", {}, "Date"), el("th", {}, "Start"),
    el("th", {}, "Activity"), el("th", {}, "Where"), el("th", {}, "")
  ])));
  const tbody = el("tbody");
  trip.itinerary.sort(cmp);
  trip.itinerary.forEach(r => {
    const tr = el("tr");
    const dateIn = el("input", { type: "date", value: r.date, class: "border rounded p-1" });
    const timeIn = el("input", { type: "time", value: r.timeStart, class: "border rounded p-1" });
    const actIn  = el("input", { value: r.activity, class: "border rounded p-1 w-full" });
    const whereIn= el("input", { value: r.where,    class: "border rounded p-1 w-full" });

    [dateIn, timeIn, actIn, whereIn].forEach(inp =>
      inp.addEventListener("change", () => {
        r.date = dateIn.value; r.timeStart = timeIn.value;
        r.activity = actIn.value; r.where = whereIn.value;
        if (r.source === "auto") r.source = "user";
        onChange();
      }));

    tr.appendChild(el("td", {}, dateIn));
    tr.appendChild(el("td", {}, timeIn));
    tr.appendChild(el("td", {}, [
      actIn,
      overlapsAuto(r, trip.itinerary)
        ? el("span", { class: "badge-overlap ml-2" }, "overlaps")
        : document.createTextNode("")
    ]));
    tr.appendChild(el("td", {}, whereIn));
    tr.appendChild(el("td", {}, el("button", {
      class: "text-rose-500",
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
