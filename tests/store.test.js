import { describe, it, assertEqual } from "../js/test-runner.js";
import {
  saveCurrentTrip, loadCurrentTrip,
  listTrips, saveTrip, deleteTrip,
  getProfile, setProfile
} from "../js/store.js";

describe("store.currentTrip", () => {
  it("round-trips through sessionStorage", () => {
    const t = { id: "x", destination: "Phan Thiet" };
    saveCurrentTrip(t);
    assertEqual(loadCurrentTrip(), t);
  });
});

describe("store.trips", () => {
  it("save, list, delete", () => {
    localStorage.clear();
    saveTrip({ id: "a", destination: "A" });
    saveTrip({ id: "b", destination: "B" });
    assertEqual(listTrips().map(t => t.id), ["a", "b"]);
    deleteTrip("a");
    assertEqual(listTrips().map(t => t.id), ["b"]);
  });
});

describe("store.profile", () => {
  it("default profile when unset", () => {
    localStorage.removeItem("userProfile");
    assertEqual(getProfile(), { name: "", defaultCurrency: "VND" });
  });
  it("setProfile persists", () => {
    setProfile({ name: "Phap", defaultCurrency: "VND" });
    assertEqual(getProfile(), { name: "Phap", defaultCurrency: "VND" });
  });
});
