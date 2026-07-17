export const PACKAGING_CATEGORY = 'Packaging';

export const INGREDIENT_CATEGORIES = Object.freeze([
  'Bahan Baku',
  PACKAGING_CATEGORY,
  'Lainnya',
]);

export function isPackagingCategory(category) {
  return category === PACKAGING_CATEGORY;
}
