// Derived state for trades that use the contracts + exits[] model.
// Use these to keep status/pnl/contractsOpen consistent across server & client.

export function ensureTradeShape(t) {
  return {
    ...t,
    contracts: Number.isFinite(Number(t.contracts)) && Number(t.contracts) > 0
      ? Number(t.contracts)
      : 1,
    exits: Array.isArray(t.exits) ? t.exits : [],
  };
}

export function summarizeExits(exits = []) {
  let usedContracts = 0;
  let pnl = 0;
  let weightedR = 0;
  let lastClosedAt = null;
  for (const e of exits) {
    const c = Number(e.contracts) || 0;
    const p = Number(e.pnl) || 0;
    const r = Number(e.r) || 0;
    usedContracts += c;
    pnl += p;
    weightedR += r * c;
    if (e.closedAt && (!lastClosedAt || e.closedAt > lastClosedAt)) {
      lastClosedAt = e.closedAt;
    }
  }
  return {
    usedContracts,
    pnl,
    avgR: usedContracts > 0 ? weightedR / usedContracts : 0,
    lastClosedAt,
  };
}

export function deriveStatus(trade) {
  const t = ensureTradeShape(trade);
  const { usedContracts } = summarizeExits(t.exits);
  if (usedContracts === 0) return 'open';
  if (usedContracts >= t.contracts) return 'closed';
  return 'runner';
}

// Returns a trade with status, pnl, rMultiple, exitedAt re-computed from exits.
export function recomputeTrade(trade) {
  const t = ensureTradeShape(trade);
  const sum = summarizeExits(t.exits);
  const status = sum.usedContracts === 0
    ? 'open'
    : sum.usedContracts >= t.contracts ? 'closed' : 'runner';
  return {
    ...t,
    status,
    pnl: sum.usedContracts > 0 ? String(Math.round(sum.pnl * 100) / 100) : (t.pnl || ''),
    rMultiple: sum.usedContracts > 0 ? String(Math.round(sum.avgR * 100) / 100) : (t.rMultiple || ''),
    exitedAt: status === 'closed' ? (sum.lastClosedAt || t.exitedAt) : null,
  };
}
