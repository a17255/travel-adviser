const SESS_CURRENT = "currentTrip";
const LS_TRIPS     = "trips";
const LS_PROFILE   = "userProfile";
const LS_TEMPLATES = "userTemplates";

export function saveCurrentTrip(trip) {
  sessionStorage.setItem(SESS_CURRENT, JSON.stringify(trip));
}

export function loadCurrentTrip() {
  const raw = sessionStorage.getItem(SESS_CURRENT);
  return raw ? JSON.parse(raw) : null;
}

export function listTrips() {
  const raw = localStorage.getItem(LS_TRIPS);
  return raw ? JSON.parse(raw) : [];
}

export function saveTrip(trip) {
  const trips = listTrips().filter(t => t.id !== trip.id);
  trips.push(trip);
  localStorage.setItem(LS_TRIPS, JSON.stringify(trips));
}

export function deleteTrip(id) {
  const trips = listTrips().filter(t => t.id !== id);
  localStorage.setItem(LS_TRIPS, JSON.stringify(trips));
}

export function getProfile() {
  const raw = localStorage.getItem(LS_PROFILE);
  return raw ? JSON.parse(raw) : { name: "", defaultCurrency: "VND" };
}

export function setProfile(p) {
  localStorage.setItem(LS_PROFILE, JSON.stringify(p));
}

export function listUserTemplates() {
  const raw = localStorage.getItem(LS_TEMPLATES);
  return raw ? JSON.parse(raw) : [];
}

export function saveUserTemplate(tpl) {
  const list = listUserTemplates().filter(t => t.id !== tpl.id);
  list.push(tpl);
  localStorage.setItem(LS_TEMPLATES, JSON.stringify(list));
}
