const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function pad(n) { return String(n).padStart(2, "0"); }

function normalizeDate(d, m, y) {
  const yy = y.length === 2 ? "20" + y : y;
  return `${yy}-${pad(m)}-${pad(d)}`;
}

function findDates(text) {
  const out = [];
  const rx1 = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
  let m;
  while ((m = rx1.exec(text))) {
    out.push(normalizeDate(Number(m[1]), Number(m[2]), m[3]));
  }
  const rx2 = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi;
  while ((m = rx2.exec(text))) {
    out.push(normalizeDate(Number(m[1]), MONTHS[m[2].toLowerCase().slice(0, 3)], m[3]));
  }
  return out;
}

function findTimes(text) {
  const out = [];
  const rx = /\b(\d{1,2}):(\d{2})\b/g;
  let m;
  while ((m = rx.exec(text))) {
    out.push(`${pad(Number(m[1]))}:${m[2]}`);
  }
  return out;
}

export function parseFlight(text) {
  const t = text || "";
  const flightMatch = t.match(/\b(VN|VJ|QH)\s*(\d{3,4})\b/i);
  const airportPair = t.match(/\b([A-Z]{3})\b[\s\S]{0,40}?\b([A-Z]{3})\b/);
  const pnr = t.match(/\b([A-Z0-9]{6})\b(?![A-Z0-9])/);
  const dates = findDates(t);
  const times = findTimes(t);

  if (!flightMatch && !airportPair) return null;

  const out = {
    provider: flightMatch ? ({
      VN: "Vietnam Airlines", VJ: "VietJet Air", QH: "Bamboo Airways"
    }[flightMatch[1].toUpperCase()]) : "",
    flightNumber: flightMatch ? `${flightMatch[1].toUpperCase()}${flightMatch[2]}` : "",
    from: airportPair ? airportPair[1] : "",
    to: airportPair ? airportPair[2] : "",
    pnr: pnr ? pnr[1] : "",
    international: false
  };
  if (dates.length && times.length >= 2) {
    out.depart = `${dates[0]}T${times[0]}`;
    out.arrive = `${dates[0]}T${times[1]}`;
  } else if (dates.length && times.length === 1) {
    out.depart = `${dates[0]}T${times[0]}`;
  }
  return out;
}

export function parseLodging(text) {
  const t = text || "";
  const dates = findDates(t);
  const hotel = t.match(/(?:hotel|resort|villa|homestay|inn|lodge)[:\s-]*([^\n\r]{3,80})/i);
  const nameLine = t.split(/\r?\n/).map(s => s.trim()).find(s =>
    /(hotel|resort|villa|homestay|inn|lodge)/i.test(s) && s.length < 100);
  const confirmation = t.match(/\b(?:confirmation|booking)[^\w]{0,5}([A-Z0-9]{4,12})\b/i);

  if (dates.length < 2 && !nameLine && !hotel) return null;

  return {
    provider: "",
    name: nameLine || (hotel ? hotel[1].trim() : ""),
    checkInDate: dates[0] || "",
    checkOutDate: dates[1] || "",
    confirmation: confirmation ? confirmation[1] : ""
  };
}
