export type CategoryLabelColor = 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'teal';

export function categoryColor(category: string | null): CategoryLabelColor {
  const c = (category ?? '').toLowerCase();
  if (c.includes('cloud') || c.includes('ai')) return 'blue';
  if (c.includes('frontend') || c.includes('react') || c.includes('design') || c.includes('ui')) return 'purple';
  if (c.includes('agent') || c.includes('workflow')) return 'teal';
  if (c.includes('test') || c.includes('qa')) return 'green';
  if (c.includes('cursor') || c.includes('tooling') || c.includes('sdk') || c.includes('api')) return 'orange';
  if (c.includes('review') || c.includes('developer')) return 'yellow';
  if (c.includes('backend') || c.includes('devops') || c.includes('infra')) return 'orange';
  return 'yellow';
}
