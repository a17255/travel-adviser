export const CITY_TO_IATA = {
  "Ho Chi Minh":  "SGN", "Saigon": "SGN", "HCMC": "SGN", "Sai Gon": "SGN",
  "Ha Noi":       "HAN", "Hanoi":  "HAN",
  "Da Nang":      "DAD", "Danang": "DAD",
  "Nha Trang":    "CXR", "Cam Ranh": "CXR",
  "Phu Quoc":     "PQC",
  "Phan Thiet":   "SGN",
  "Da Lat":       "DLI", "Dalat":  "DLI",
  "Hai Phong":    "HPH",
  "Hue":          "HUI",
  "Hoi An":       "DAD",
  "Sa Pa":        "HAN",
  "Bangkok":      "BKK",
  "Singapore":    "SIN",
  "Tokyo":        "NRT",
  "Seoul":        "ICN",
  "Taipei":       "TPE",
  "Hong Kong":    "HKG"
};

export function iataFor(city) {
  if (!city) return "";
  const normalized = city.trim();
  return CITY_TO_IATA[normalized] || normalized.toUpperCase().slice(0, 3);
}

function ymdToSkyscanner(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return y.slice(2) + m + d;
}

function ymdDashToDMY(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}-${m}-${y}`;
}

export function flightSearchUrl(provider, fromCity, toCity, date) {
  const from = iataFor(fromCity);
  const to   = iataFor(toCity);
  if (!from || !to) return null;
  switch (provider) {
    case "Google Flights":
      return `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to} on ${date || ""}`)}`;
    case "Skyscanner":
      return `https://www.skyscanner.com/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/${ymdToSkyscanner(date)}/`;
    case "Traveloka":
      return `https://www.traveloka.com/en-vn/flight/fullsearch?ap=${from}.${to}&dt=${ymdDashToDMY(date)}.NA&ps=1.0.0&sc=ECONOMY`;
    default:
      return null;
  }
}

export function hotelSearchUrl(provider, city, checkIn, checkOut) {
  const q = encodeURIComponent(city || "");
  switch (provider) {
    case "Booking.com":
      return `https://www.booking.com/searchresults.html?ss=${q}` +
        (checkIn  ? `&checkin=${checkIn}` : "") +
        (checkOut ? `&checkout=${checkOut}` : "");
    case "Agoda":
      return `https://www.agoda.com/search?city=${q}` +
        (checkIn  ? `&checkIn=${checkIn}` : "") +
        (checkOut ? `&checkOut=${checkOut}` : "");
    case "Traveloka":
      return `https://www.traveloka.com/en-vn/hotel/search?destination=${q}` +
        (checkIn  ? `&checkInDate=${ymdDashToDMY(checkIn)}` : "") +
        (checkOut ? `&checkOutDate=${ymdDashToDMY(checkOut)}` : "");
    default:
      return null;
  }
}
