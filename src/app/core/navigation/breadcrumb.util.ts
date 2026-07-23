import { ActivatedRouteSnapshot } from '@angular/router';
import { BreadcrumbPath } from '../../shared/ui/breadcrumb/breadcrumb.component';

export function buildBreadcrumbPaths(route: ActivatedRouteSnapshot): BreadcrumbPath[] {
  const items: { label: string; url: string }[] = [];
  let current: ActivatedRouteSnapshot | null = route;

  while (current) {
    const label = current.data['breadcrumb'] as string | undefined;
    const parentLabel = current.parent?.data['breadcrumb'] as string | undefined;

    if (label && label !== parentLabel) {
      const url = current.pathFromRoot
        .flatMap((snapshot) => snapshot.url.map((segment) => segment.path))
        .filter(Boolean)
        .join('/');

      items.push({ label, url });
    }

    current = current.firstChild;
  }

  return items.map((item, index) => ({
    label: item.label,
    route: index < items.length - 1 ? `/${item.url}` : undefined,
  }));
}
