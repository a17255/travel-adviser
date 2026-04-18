import { describe, it, assertEqual } from "../js/test-runner.js";
import { flightRows, lodgingRows, autoRows } from "../js/timing.js";

describe("timing.flightRows", () => {
  it("domestic flight produces 4 rows with 90m buffer", () => {
    const rows = flightRows({
      depart: "2026-04-18T09:00",
      arrive: "2026-04-18T10:30",
      from: "SGN", to: "PQC",
      international: false
    }, { airportBufferDomestic: 90, airportBufferInternational: 150 });
    assertEqual(rows.length, 4);
    assertEqual(rows[0].timeStart, "07:30");
    assertEqual(rows[0].activity, "Arrive at airport");
    assertEqual(rows[1].timeStart, "09:00");
    assertEqual(rows[2].timeStart, "10:30");
    assertEqual(rows[3].timeStart, "11:00");
  });

  it("international flight uses 150m buffer", () => {
    const rows = flightRows({
      depart: "2026-04-18T09:00", arrive: "2026-04-18T13:00",
      from: "SGN", to: "NRT", international: true
    }, { airportBufferDomestic: 90, airportBufferInternational: 150 });
    assertEqual(rows[0].timeStart, "06:30");
  });
});

describe("timing.lodgingRows", () => {
  it("produces check-in and check-out rows", () => {
    const rows = lodgingRows({
      checkInDate: "2026-04-18",
      checkOutDate: "2026-04-20",
      name: "Resort X"
    }, { checkInTime: "14:00", checkOutTime: "12:00" });
    assertEqual(rows.length, 2);
    assertEqual(rows[0].date, "2026-04-18");
    assertEqual(rows[0].timeStart, "14:00");
    assertEqual(rows[1].timeStart, "12:00");
  });
});

describe("timing.autoRows", () => {
  it("returns empty when both anchors are 'later'", () => {
    const rows = autoRows({
      anchors: {
        flight:  { status: "later",  data: null },
        lodging: { status: "later",  data: null }
      },
      config: { airportBufferDomestic: 90, airportBufferInternational: 150,
                checkInTime: "14:00", checkOutTime: "12:00" }
    });
    assertEqual(rows, []);
  });
});
