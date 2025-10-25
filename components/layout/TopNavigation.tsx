'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Calendar,
  Trophy,
  Wallet,
  BarChart,
  Menu,
  X,
  Zap,
  Coins,
  User,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';

export interface TopNavigationProps {
  user?: {
    name: string;
    avatar?: string;
    xp: number;
    chronos: number;
    level?: number;
  };
  className?: string;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  user,
  className,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: MessageSquare, label: 'AI Chat', href: '/dashboard/student/chat' },
    { icon: Calendar, label: 'Calendar', href: '/dashboard/calendar' },
    { icon: Trophy, label: 'Achievements', href: '/dashboard/achievements' },
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
    { icon: BarChart, label: 'Leaderboard', href: '/dashboard/leaderboard' },
  ];

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/whop/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className={cn(
      'sticky top-0 z-50 w-full border-b border-border-default bg-bg-sidebar',
      className
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Image
                  src="/images/logo_brand/chronos_icon_grn.png"
                  alt="Chronos AI"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">CHRONOS AI</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-bg-hover text-accent-cyan'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    )}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side - User Stats & Avatar */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                {/* XP Display */}
                <Link
                  href="/dashboard/achievements"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-hover transition-colors"
                >
                  <Zap size={18} className="text-accent-yellow" />
                  <span className="text-sm font-semibold">{user.xp} XP</span>
                </Link>

                {/* CHRONOS Balance */}
                <Link
                  href="/dashboard/wallet"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-hover transition-colors"
                >
                  <Coins size={18} className="text-accent-green" />
                  <span className="text-sm font-semibold">{user.chronos}</span>
                </Link>

                {/* User Avatar & Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="focus:outline-none focus:ring-2 focus:ring-accent-cyan rounded-full"
                  >
                    <Avatar src={user.avatar} alt={user.name} size="md" />
                  </button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-bg-card border border-border-default rounded-lg shadow-lg z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-border-default">
                          <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                          <p className="text-xs text-text-muted">
                            Level {user.level || Math.floor(user.xp / 100)}
                          </p>
                        </div>
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User size={16} />
                          Profile
                        </Link>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors text-left"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-bg-hover transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border-default py-4">
            <div className="flex flex-col space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-bg-hover text-accent-cyan'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    )}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile User Stats */}
            {user && (
              <div className="mt-4 pt-4 border-t border-border-default space-y-2">
                <Link
                  href="/dashboard/achievements"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-accent-yellow" />
                    <span className="text-sm">XP</span>
                  </div>
                  <span className="text-sm font-semibold">{user.xp}</span>
                </Link>
                <Link
                  href="/dashboard/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Coins size={18} className="text-accent-green" />
                    <span className="text-sm">CHRONOS</span>
                  </div>
                  <span className="text-sm font-semibold">{user.chronos}</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
