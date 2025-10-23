'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  className?: string;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  className,
}: QuickActionCardProps) {
  return (
    <Link href={href}>
      <Card
        padding="lg"
        hover
        className={cn(
          'bg-bg-card border border-border-default transition-all duration-200 hover:border-accent-cyan hover:shadow-lg cursor-pointer group',
          className
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-accent-cyan/10 rounded-lg group-hover:bg-accent-cyan/20 transition-colors">
            <Icon className="w-8 h-8 text-accent-cyan" />
          </div>
          <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent-cyan group-hover:translate-x-1 transition-all" />
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-text-secondary text-sm">{description}</p>
      </Card>
    </Link>
  );
}
