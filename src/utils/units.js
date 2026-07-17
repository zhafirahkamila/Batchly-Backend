import { HttpError } from '../middleware/errorHandler.js';

// Every supported unit maps to a family and a factor to that family's base unit.
// Base units: weight → gram, volume → ml, count → pcs.
const UNITS = {
  gram:       { family: 'weight', factor: 1 },
  g:          { family: 'weight', factor: 1 },
  kg:         { family: 'weight', factor: 1000 },
  kilogram:   { family: 'weight', factor: 1000 },

  ml:         { family: 'volume', factor: 1 },
  milliliter: { family: 'volume', factor: 1 },
  liter:      { family: 'volume', factor: 1000 },
  litre:      { family: 'volume', factor: 1000 },
  l:          { family: 'volume', factor: 1000 },

  pcs:        { family: 'count',  factor: 1 },
  piece:      { family: 'count',  factor: 1 },
  pieces:     { family: 'count',  factor: 1 },
  unit:       { family: 'count',  factor: 1 },
  butir:      { family: 'count',  factor: 1 },
  buah:       { family: 'count',  factor: 1 },
};

export const ALLOWED_UNITS = Object.keys(UNITS);

function lookup(unit) {
  const key = String(unit || '').trim().toLowerCase();
  const entry = UNITS[key];
  if (!entry) throw new HttpError(400, `Unknown unit: "${unit}"`);
  return entry;
}

// Price per 1 base unit (per gram / per ml / per pcs) given the purchase details.
export function pricePerBaseUnit(purchasePrice, purchaseQty, purchaseUnit) {
  const price = Number(purchasePrice);
  const qty = Number(purchaseQty);
  if (!(price >= 0)) throw new HttpError(400, 'purchase_price must be >= 0');
  if (!(qty > 0)) throw new HttpError(400, 'purchase_qty must be > 0');
  const { factor } = lookup(purchaseUnit);
  return price / (qty * factor);
}

// Convert `qty fromUnit` into the base unit of the ingredient's purchase_unit family.
// Throws 400 if the families don't match (e.g. recipe uses ml but ingredient priced in kg).
export function convertQtyToBaseOf(qty, fromUnit, ingredientPurchaseUnit) {
  const q = Number(qty);
  if (!(q >= 0)) throw new HttpError(400, 'qty_used must be >= 0');
  const from = lookup(fromUnit);
  const target = lookup(ingredientPurchaseUnit);
  if (from.family !== target.family) {
    throw new HttpError(
      400,
      `Unit family mismatch: cannot use "${fromUnit}" (${from.family}) for ingredient priced in "${ingredientPurchaseUnit}" (${target.family})`
    );
  }
  return q * from.factor;
}

export function unitFamily(unit) {
  return lookup(unit).family;
}
