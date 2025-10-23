'use client';

import React from 'react';
import { Menu, Calendar, Zap, Coins, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  pageTitle?: string;
  user: {
    name: string;
    avatar?: string;
    xp: number;
    chronos: number;
    daysActive?: number;
  };
  onMobileMenuClick?: () => void;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  breadcrumbs,
  pageTitle,
  user = { name: 'User', xp: 0, chronos: 0 },
  onMobileMenuClick,
  className,
}) => {
  return (
    <header className={cn('header', className)}>
      <div className="header-left">
        {onMobileMenuClick && (
          <button
            onClick={onMobileMenuClick}
            className="lg:hidden p-2 hover:bg-bg-hover rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
        )}

        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="breadcrumbs hidden md:flex">
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="breadcrumb-item">
                {crumb.href ? (
                  <Link href={crumb.href}>{crumb.label}</Link>
                ) : (
                  <span className="active">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight size={16} className="breadcrumb-separator" />
                )}
              </div>
            ))}
          </nav>
        )}
      </div>

      <div className="header-center">
        {pageTitle && (
          <h2 className="text-lg md:text-xl font-bold text-text-primary hidden sm:block">
            {pageTitle}
          </h2>
        )}
      </div>

      <div className="header-right">
        {user.daysActive !== undefined && (
          <Tooltip content="Days Active">
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card">
              <Calendar size={18} className="text-accent-cyan" />
              <span className="text-sm font-semibold">{user.daysActive}</span>
            </div>
          </Tooltip>
        )}

        <Tooltip content="Total XP">
          <Link
            href="/dashboard/achievements"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-hover transition-colors"
          >
            <Zap size={18} className="text-accent-yellow" />
            <span className="text-sm font-semibold hidden sm:inline">{user.xp} XP</span>
            <span className="text-sm font-semibold sm:hidden">{user.xp}</span>
          </Link>
        </Tooltip>

        <Tooltip content="CHRONOS Balance">
          <Link
            href="/dashboard/wallet"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-hover transition-colors"
          >
            <Coins size={18} className="text-accent-green" />
            <span className="text-sm font-semibold hidden sm:inline">{user.chronos} CHRONOS</span>
            <span className="text-sm font-semibold sm:hidden">{user.chronos}</span>
          </Link>
        </Tooltip>

        <Link href="/dashboard/profile" className="ml-2">
          <Avatar src={user.avatar} alt={user.name} size="md" />
        </Link>
      </div>
    </header>
  );
};
