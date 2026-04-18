import { describe, it, assertEqual } from "../js/test-runner.js";
import { shareOf, netPerParticipant, suggestSettlement } from "../js/fees.js";

const people = [{ name: "A" }, { name: "B" }, { name: "C" }];

describe("fees.shareOf", () => {
  it("all mode splits equally", () => {
    const s = shareOf({ amount: 300, splitMode: "all" }, people);
    assertEqual(s, { A: 100, B: 100, C: 100 });
  });
  it("exclude mode drops listed names", () => {
    const s = shareOf(
      { amount: 200, splitMode: "exclude", participants: ["C"] }, people);
    assertEqual(s, { A: 100, B: 100 });
  });
  it("include mode keeps only listed names", () => {
    const s = shareOf(
      { amount: 300, splitMode: "include", participants: ["A", "B"] }, people);
    assertEqual(s, { A: 150, B: 150 });
  });
  it("manual mode uses provided shares", () => {
    const s = shareOf(
      { amount: 500, splitMode: "manual",
        manualShares: { A: 200, B: 200, C: 100 } }, people);
    assertEqual(s, { A: 200, B: 200, C: 100 });
  });
});

describe("fees.netPerParticipant", () => {
  it("paid - owed per person", () => {
    const fees = [
      { amount: 300, paidBy: "A", splitMode: "all", voided: false },
      { amount: 60,  paidBy: "B", splitMode: "all", voided: false }
    ];
    const net = netPerParticipant(fees, people);
    assertEqual(net, { A: 180, B: -60, C: -120 });
  });
  it("skips voided fees", () => {
    const fees = [
      { amount: 300, paidBy: "A", splitMode: "all", voided: true }
    ];
    assertEqual(netPerParticipant(fees, people), { A: 0, B: 0, C: 0 });
  });
});

describe("fees.suggestSettlement", () => {
  it("pairs biggest debtor with biggest creditor", () => {
    const net = { A: 180, B: -60, C: -120 };
    const s = suggestSettlement(net);
    assertEqual(s, [
      { from: "C", to: "A", amount: 120 },
      { from: "B", to: "A", amount: 60 }
    ]);
  });
});
