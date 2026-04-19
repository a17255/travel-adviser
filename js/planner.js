import { autoRows } from "./timing.js";

function pad(n) { return String(n).padStart(2, "0"); }

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function uuid() { return crypto.randomUUID(); }

const TEMPLATES = {
  beach: [
    { t: "05:45", a: "Wake up, sunrise walk on the beach" },
    { t: "07:00", a: "Breakfast at the resort" },
    { t: "08:30", a: "Swim / beach activities" },
    { t: "11:30", a: "Lunch — local seafood" },
    { t: "13:00", a: "Rest, siesta" },
    { t: "15:00", a: "Kayak / banana boat / snorkel" },
    { t: "17:00", a: "Cafe & sunset viewpoint" },
    { t: "19:00", a: "Dinner" },
    { t: "20:30", a: "Night market / ice cream stroll" },
    { t: "22:00", a: "Back to lodging, sleep" }
  ],
  mountain: [
    { t: "05:30", a: "Wake up, viewpoint for sunrise" },
    { t: "07:00", a: "Breakfast (warm pho / banh mi)" },
    { t: "08:30", a: "Hike or scenic drive" },
    { t: "12:00", a: "Lunch at a mountain restaurant" },
    { t: "13:30", a: "Waterfall / cave / ethnic village" },
    { t: "16:00", a: "Cafe with valley view" },
    { t: "17:30", a: "Sunset at the highest point" },
    { t: "19:00", a: "Dinner — local grilled specialties" },
    { t: "20:30", a: "Stargazing / campfire" },
    { t: "22:00", a: "Back to lodging, sleep" }
  ],
  city: [
    { t: "06:30", a: "Wake up, morning walk in old quarter" },
    { t: "07:30", a: "Breakfast (pho / banh mi)" },
    { t: "09:00", a: "Landmark / temple / historic site" },
    { t: "11:30", a: "Museum or market" },
    { t: "12:30", a: "Lunch" },
    { t: "14:00", a: "Shopping / souvenirs" },
    { t: "16:00", a: "Cafe break" },
    { t: "18:00", a: "Dinner" },
    { t: "20:00", a: "Night market / walking street" },
    { t: "22:00", a: "Back to lodging, sleep" }
  ],
  food: [
    { t: "07:00", a: "Specialty coffee at a local cafe" },
    { t: "08:00", a: "Breakfast — iconic dish of the region" },
    { t: "10:00", a: "Food tour / cooking class" },
    { t: "12:30", a: "Lunch at a famous quan" },
    { t: "14:30", a: "Cafe & dessert" },
    { t: "16:00", a: "Street food alley / market snacks" },
    { t: "18:30", a: "Dinner — seafood or hotpot" },
    { t: "20:00", a: "Night cafe / che / coconut ice cream" },
    { t: "22:00", a: "Back to lodging, sleep" }
  ],
  mixed: [
    { t: "06:30", a: "Wake up, light walk" },
    { t: "07:30", a: "Breakfast" },
    { t: "09:00", a: "Highlight activity of the day" },
    { t: "11:30", a: "Lunch" },
    { t: "13:00", a: "Rest" },
    { t: "15:00", a: "Secondary activity" },
    { t: "17:00", a: "Cafe / sunset" },
    { t: "19:00", a: "Dinner" },
    { t: "20:30", a: "Walk / night market" },
    { t: "22:00", a: "Back to lodging, sleep" }
  ]
};

function whereOf(trip) {
  const lodging = trip.anchors.lodging.data;
  return lodging?.name || trip.destination || "";
}

export function generatePlan(trip) {
  const base = autoRows(trip);
  const userRows = trip.itinerary.filter(r => r.source === "user");
  const byDate = {};
  base.forEach(r => { (byDate[r.date] ||= []).push(r); });

  const tpl = TEMPLATES[trip.tripType] || TEMPLATES.mixed;
  const where = whereOf(trip);
  const days = Number(trip.days) || 1;
  const start = trip.startDate;
  if (!start) return trip.itinerary;

  const flight = trip.anchors.flight.data;
  const lodging = trip.anchors.lodging.data;
  const arrivalDate = flight?.arrive ? flight.arrive.slice(0, 10) : start;
  const departDate  = flight?.depart ? flight.depart.slice(0, 10) : addDays(start, days - 1);
  const checkoutDate = lodging?.checkOutDate || addDays(start, days - 1);

  const rows = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const isArrival  = date === arrivalDate && flight?.arrive;
    const isDeparture = date === departDate && flight?.depart;
    const isCheckout  = date === checkoutDate && !isDeparture;

    const arrivalHHMM = flight?.arrive ? flight.arrive.slice(11, 16) : "00:00";
    const departHHMM  = flight?.depart ? flight.depart.slice(11, 16) : "23:59";

    for (const step of tpl) {
      if (isArrival && step.t < arrivalHHMM) continue;
      if (isDeparture && step.t >= departHHMM) continue;
      rows.push({
        id: uuid(),
        date, timeStart: step.t,
        activity: step.a, where,
        source: "generated"
      });
    }
    if (isCheckout) {
      rows.push({
        id: uuid(), date, timeStart: trip.config.checkOutTime || "12:00",
        activity: "Check out, pack up", where, source: "generated"
      });
    }
  }

  return [...base, ...rows, ...userRows].sort((a, b) =>
    (a.date + a.timeStart).localeCompare(b.date + b.timeStart));
}
