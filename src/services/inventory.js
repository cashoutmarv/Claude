// Inventory + equipment service. Owned items live as { level, shards } per
// id; pulling a duplicate increases shards instead of granting a new copy.

import { Storage } from "./storage.js";
import { CHARACTERS, RELICS, WEAPONS_CATALOG, lookupItem } from "../config/items.js";

const listeners = new Set();
function emit() { for (const fn of listeners) try { fn(); } catch (e) { console.error(e); } }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const SHARDS_PER_LEVEL = [0, 1, 2, 3, 5, 8, 12, 18, 25, 35]; // index = current level
const MAX_LEVEL = SHARDS_PER_LEVEL.length;

function bucketForKind(state, kind) {
  if (kind === "character") return state.inventory.ownedCharacters;
  if (kind === "relic")     return state.inventory.ownedRelics;
  if (kind === "weapon")    return state.inventory.ownedWeapons;
  throw new Error(`unknown kind: ${kind}`);
}

// Grant an item. If owned, +1 shard; if new, level=1, shards=0.
// Returns { newlyOwned: bool }.
export function grant(itemId) {
  const meta = lookupItem(itemId);
  if (!meta) return { newlyOwned: false };
  let newlyOwned = false;
  Storage.mutate((s) => {
    const bucket = bucketForKind(s, meta.kind);
    if (bucket[itemId]) {
      bucket[itemId].shards += 1;
    } else {
      bucket[itemId] = { level: 1, shards: 0 };
      newlyOwned = true;
    }
  });
  emit();
  return { newlyOwned };
}

export function levelUp(itemId) {
  const meta = lookupItem(itemId);
  if (!meta) return false;
  const s = Storage.load();
  const bucket = bucketForKind(s, meta.kind);
  const owned = bucket[itemId];
  if (!owned) return false;
  if (owned.level >= MAX_LEVEL) return false;
  const cost = SHARDS_PER_LEVEL[owned.level] || 0;
  if (owned.shards < cost) return false;
  Storage.mutate((s2) => {
    const b = bucketForKind(s2, meta.kind);
    b[itemId].shards -= cost;
    b[itemId].level += 1;
  });
  emit();
  return true;
}

export function isOwned(itemId) {
  const meta = lookupItem(itemId);
  if (!meta) return false;
  const bucket = bucketForKind(Storage.load(), meta.kind);
  return !!bucket[itemId];
}

export function listOwned(kind) {
  const s = Storage.load();
  return Object.entries(bucketForKind(s, kind)).map(([id, data]) => ({ id, ...data }));
}

export function getEquipped() {
  const e = Storage.load().equipped;
  return { character: e.character, relics: [...e.relics] };
}

export function equipCharacter(id) {
  if (!CHARACTERS[id] || !isOwned(id)) return false;
  Storage.mutate((s) => { s.equipped.character = id; });
  emit();
  return true;
}

export function equipRelic(slot, id) {
  if (slot < 0 || slot >= 3) return false;
  if (id !== null && (!RELICS[id] || !isOwned(id))) return false;
  Storage.mutate((s) => { s.equipped.relics[slot] = id; });
  emit();
  return true;
}

// Compose run-start stat modifiers from equipped character + relics.
// `baseStats` is the player's vanilla stat object; we mutate a shallow copy
// and return it. Adds a `goldMul` field so relics can scale gold drops.
export function applyEquippedToStats(baseStats) {
  const stats = { ...baseStats, goldMul: 1 };
  const eq = getEquipped();
  const charDef = CHARACTERS[eq.character];
  if (charDef && charDef.apply) charDef.apply(stats);
  for (const slotId of eq.relics) {
    if (!slotId) continue;
    const r = RELICS[slotId];
    if (r && r.apply) r.apply(stats);
  }
  return stats;
}

export const SHARDS_TABLE = SHARDS_PER_LEVEL;
