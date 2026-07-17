import { HttpError } from './errorHandler.js';
import { ALLOWED_UNITS } from '../utils/units.js';

export function assert(cond, status, message) {
  if (!cond) throw new HttpError(status, message);
}

function requireString(value, field, { max = 255 } = {}) {
  assert(typeof value === 'string' && value.trim().length > 0, 400, `${field} is required`);
  assert(value.length <= max, 400, `${field} exceeds max length ${max}`);
  return value.trim();
}

function requireNumber(value, field, { min = undefined, max = undefined, integer = false } = {}) {
  const n = Number(value);
  assert(Number.isFinite(n), 400, `${field} must be a number`);
  if (integer) assert(Number.isInteger(n), 400, `${field} must be an integer`);
  if (min !== undefined) assert(n >= min, 400, `${field} must be >= ${min}`);
  if (max !== undefined) assert(n <= max, 400, `${field} must be <= ${max}`);
  return n;
}

function optionalString(value, field, opts) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, opts);
}

function requireUnit(value, field) {
  const s = requireString(value, field, { max: 20 }).toLowerCase();
  assert(ALLOWED_UNITS.includes(s), 400, `${field} "${value}" is not a supported unit`);
  return s;
}

function requireId(value, field) {
  const n = Number(value);
  assert(Number.isInteger(n) && n > 0, 400, `${field} must be a positive integer`);
  return n;
}

function requireEmail(value, field = 'email') {
  const s = requireString(value, field, { max: 150 }).toLowerCase();
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 400, 'email is invalid');
  return s;
}

export function validateRegister(body = {}) {
  return {
    name: requireString(body.name, 'name', { max: 100 }),
    email: requireEmail(body.email),
    password: (() => {
      assert(typeof body.password === 'string', 400, 'password is required');
      assert(body.password.length >= 6, 400, 'password must be at least 6 characters');
      return body.password;
    })(),
    business_name: optionalString(body.business_name, 'business_name', { max: 150 }),
  };
}

export function validateLogin(body = {}) {
  return {
    email: requireEmail(body.email),
    password: (() => {
      assert(typeof body.password === 'string' && body.password.length > 0, 400, 'password is required');
      return body.password;
    })(),
  };
}

export function validateProfileUpdate(body = {}) {
  return {
    name: requireString(body.name, 'name', { max: 100 }),
    business_name: optionalString(body.business_name, 'business_name', { max: 150 }),
  };
}

export function validateIngredient(body = {}) {
  return {
    name: requireString(body.name, 'name', { max: 150 }),
    purchase_price: requireNumber(body.purchase_price, 'purchase_price', { min: 0 }),
    purchase_qty: requireNumber(body.purchase_qty, 'purchase_qty', { min: 0.000001 }),
    purchase_unit: requireUnit(body.purchase_unit, 'purchase_unit'),
    category: optionalString(body.category, 'category', { max: 50 }),
  };
}

export function validateOverhead(body = {}) {
  const period = requireString(body.period, 'period', { max: 20 });
  assert(period === 'per_bulan' || period === 'per_batch', 400, 'period must be "per_bulan" or "per_batch"');
  return {
    name: requireString(body.name, 'name', { max: 100 }),
    amount: requireNumber(body.amount, 'amount', { min: 0 }),
    period,
  };
}

export function validateRecipe(body = {}) {
  assert(Array.isArray(body.ingredients) && body.ingredients.length > 0, 400, 'ingredients must be a non-empty array');
  const ingredients = body.ingredients.map((row, i) => ({
    ingredient_id: requireId(row?.ingredient_id, `ingredients[${i}].ingredient_id`),
    qty_used: requireNumber(row?.qty_used, `ingredients[${i}].qty_used`, { min: 0 }),
    unit: requireUnit(row?.unit, `ingredients[${i}].unit`),
  }));
  return {
    name: requireString(body.name, 'name', { max: 150 }),
    yield_qty: requireNumber(body.yield_qty, 'yield_qty', { min: 0.01 }),
    yield_unit: requireUnit(body.yield_unit, 'yield_unit'),
    ingredients,
  };
}

export function validateCalculate(body = {}) {
  assert(Array.isArray(body.overhead_allocations), 400, 'overhead_allocations must be an array');
  const overhead_allocations = body.overhead_allocations.map((row, i) => ({
    overhead_cost_id: requireId(row?.overhead_cost_id, `overhead_allocations[${i}].overhead_cost_id`),
    estimated_monthly_production: requireNumber(
      row?.estimated_monthly_production,
      `overhead_allocations[${i}].estimated_monthly_production`,
      { min: 1, integer: true }
    ),
  }));
  const target_margin_percent = requireNumber(body.target_margin_percent, 'target_margin_percent', {
    min: 0,
    max: 99.99,
  });
  return { target_margin_percent, overhead_allocations };
}

export function parseIdParam(value, field = 'id') {
  return requireId(value, field);
}
