export function shareOf(fee, participants) {
  const names = participants.map(p => p.name);
  let active;
  switch (fee.splitMode) {
    case "all":
      active = names;
      break;
    case "exclude":
      active = names.filter(n => !(fee.participants || []).includes(n));
      break;
    case "include":
      active = (fee.participants || []).filter(n => names.includes(n));
      break;
    case "manual":
      return { ...fee.manualShares };
    default:
      active = names;
  }
  const each = active.length ? fee.amount / active.length : 0;
  const out = {};
  active.forEach(n => { out[n] = each; });
  return out;
}

export function netPerParticipant(fees, participants) {
  const net = {};
  participants.forEach(p => { net[p.name] = 0; });
  for (const f of fees) {
    if (f.voided) continue;
    net[f.paidBy] = (net[f.paidBy] || 0) + f.amount;
    const shares = shareOf(f, participants);
    for (const [name, amt] of Object.entries(shares)) {
      net[name] = (net[name] || 0) - amt;
    }
  }
  return net;
}

export function suggestSettlement(net) {
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([n, v]) => ({ name: n, amount: v }));
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([n, v]) => ({ name: n, amount: -v }));
  const out = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const pay = Math.min(creditors[i].amount, debtors[j].amount);
    out.push({ from: debtors[j].name, to: creditors[i].name, amount: pay });
    creditors[i].amount -= pay;
    debtors[j].amount   -= pay;
    if (creditors[i].amount === 0) i++;
    if (debtors[j].amount   === 0) j++;
  }
  return out;
}
