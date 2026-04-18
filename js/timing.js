function parseDT(iso) {
  const [d, t] = iso.split("T");
  return { date: d, time: t };
}

function addMinutes(iso, minutes) {
  const dt = new Date(iso);
  dt.setMinutes(dt.getMinutes() + minutes);
  const pad = n => String(n).padStart(2, "0");
  const date = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  const time = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return { date, time };
}

function row(date, time, activity, where) {
  return {
    id: crypto.randomUUID(),
    date, timeStart: time, activity, where, source: "auto"
  };
}

export function flightRows(flight, config) {
  if (!flight || !flight.depart || !flight.arrive) return [];
  const buffer = flight.international
    ? config.airportBufferInternational
    : config.airportBufferDomestic;
  const pre   = addMinutes(flight.depart, -buffer);
  const dep   = parseDT(flight.depart);
  const arr   = parseDT(flight.arrive);
  const post  = addMinutes(flight.arrive, 30);
  return [
    row(pre.date,  pre.time,  "Arrive at airport",     flight.from),
    row(dep.date,  dep.time,  "Flight departure",      flight.from),
    row(arr.date,  arr.time,  "Land",                  flight.to),
    row(post.date, post.time, "Transfer to lodging",   flight.to),
  ];
}

export function lodgingRows(lodging, config) {
  if (!lodging || !lodging.checkInDate || !lodging.checkOutDate) return [];
  return [
    row(lodging.checkInDate,  config.checkInTime,  "Check in",  lodging.name),
    row(lodging.checkOutDate, config.checkOutTime, "Check out", lodging.name),
  ];
}

export function autoRows(trip) {
  const out = [];
  if (trip.anchors.flight.status === "booked")
    out.push(...flightRows(trip.anchors.flight.data, trip.config));
  if (trip.anchors.lodging.status === "booked")
    out.push(...lodgingRows(trip.anchors.lodging.data, trip.config));
  return out;
}
