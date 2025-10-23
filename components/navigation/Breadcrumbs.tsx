import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  return (
    <nav className={cn('breadcrumbs', className)}>
      {items.map((item, index) => (
        <div key={index} className="breadcrumb-item">
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="active">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronRight size={16} className="breadcrumb-separator" />
          )}
        </div>
      ))}
    </nav>
  );
};
