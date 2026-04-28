import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center overflow-x-auto whitespace-nowrap text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="mx-2 h-4 w-4 shrink-0 opacity-50" />}
            {isLast || !item.href ? (
              <span className="font-medium text-foreground" aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            ) : (
              <Link to={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
