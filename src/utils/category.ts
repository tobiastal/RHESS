// Valid PF v6 Label colors that have actual CSS (pf-m-*):
// blue, teal, green, orange, purple, red, orangered, yellow
// NOTE: 'grey' is in the TypeScript type but has no CSS in v6 — labels render invisible.
export type CategoryLabelColor =
  | 'blue' | 'teal' | 'green' | 'orange' | 'purple' | 'orangered' | 'yellow' | 'red';

export function categoryColor(category: string | null): CategoryLabelColor {
  const c = (category ?? '').toLowerCase();

  if (c.includes('cloud') || c.includes('ai'))                              return 'blue';
  if (c.includes('agent') || c.includes('workflow'))                        return 'teal';
  if (c.includes('frontend') || c.includes('react'))                        return 'purple';
  if (c.includes('design') || c.includes('ui') || c.includes('ux'))         return 'orangered';
  if (c.includes('test') || c.includes('qa'))                               return 'green';
  if (c.includes('cursor') || c.includes('tooling'))                        return 'orange';
  if (c.includes('review') || c.includes('code quality'))                   return 'yellow';
  if (c.includes('util') || c.includes('general'))                          return 'teal';
  if (c.includes('devops') || c.includes('infra') || c.includes('backend')) return 'orange';
  if (c.includes('dev') || c.includes('sdk') || c.includes('api'))          return 'blue';

  // Deterministic fallback — unknown categories spread across the palette.
  const palette: CategoryLabelColor[] = ['blue', 'teal', 'green', 'orange', 'purple', 'orangered', 'yellow', 'red'];
  const hash = [...(category ?? '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[hash % palette.length];
}
