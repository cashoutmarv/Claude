// Wallet service. Source of truth = Storage. Emits change events so HUDs
// and shop UIs stay in sync without polling.

import { Storage } from "./storage.js";

const listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try { fn(getBalances()); } catch (e) { console.error(e); }
  }
}

export function getBalances() {
  const w = Storage.load().wallet;
  return { gold: w.gold, gems: w.gems, tokens: w.exchangeTokens };
}

export function addGold(amount, reason = "") {
  if (amount <= 0) return;
  Storage.mutate((s) => { s.wallet.gold += Math.floor(amount); });
  if (reason) console.info(`[currency] +${Math.floor(amount)}g  (${reason})`);
  emit();
}

export function addGems(amount, reason = "") {
  if (amount <= 0) return;
  Storage.mutate((s) => { s.wallet.gems += Math.floor(amount); });
  if (reason) console.info(`[currency] +${Math.floor(amount)}gem (${reason})`);
  emit();
}

export function addTokens(amount) {
  if (amount <= 0) return;
  Storage.mutate((s) => { s.wallet.exchangeTokens += Math.floor(amount); });
  emit();
}

export function spendGold(amount) {
  const w = Storage.load().wallet;
  if (w.gold < amount) return false;
  Storage.mutate((s) => { s.wallet.gold -= amount; });
  emit();
  return true;
}

export function spendGems(amount) {
  const w = Storage.load().wallet;
  if (w.gems < amount) return false;
  Storage.mutate((s) => { s.wallet.gems -= amount; });
  emit();
  return true;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
