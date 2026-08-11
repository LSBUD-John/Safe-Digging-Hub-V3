export const text = (row, ...keys) => {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null) return String(row[key]).trim();
  }
  return '';
};
export const splitList = value => String(value || '').split(/[;|,]/).map(x => x.trim()).filter(Boolean);
export const words = value => String(value || '').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(x => x.length > 2);
export const slug = value => String(value || '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const uniq = values => [...new Set(values.filter(Boolean))];
export const byId = rows => Object.fromEntries(rows.map(row => [row.id, row]));
export function includesAny(haystack, needles) {
  const h = String(haystack || '').toLowerCase();
  return needles.some(n => n && h.includes(String(n).toLowerCase()));
}
