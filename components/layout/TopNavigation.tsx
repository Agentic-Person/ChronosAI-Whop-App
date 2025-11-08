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
  LogOut,
  DollarSign
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
    { icon: MessageSquare, label: 'Videos', href: '/dashboard/student/chat' },
    { icon: DollarSign, label: 'Usage', href: '/dashboard/usage' },
    { icon: BarChart, label: 'Creator', href: '/dashboard/creator/videos' },
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <Image
                  src="/images/logo_brand/chronos_icon_256.png"
                  alt="Chronos AI"
                  width={40}
                  height={40}
                  className="rounded-xl object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold">CHRONOS AI</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105',
                      isActive
                        ? 'border border-accent-orange/60 bg-gradient-to-br from-accent-orange/15 to-accent-yellow/10 text-text-primary shadow-lg shadow-accent-orange/20 backdrop-blur-sm'
                        : 'border border-accent-orange/30 bg-bg-card/50 backdrop-blur-sm text-text-secondary hover:border-accent-orange/50 hover:bg-gradient-to-br hover:from-accent-orange/10 hover:to-accent-yellow/5 hover:text-text-primary hover:shadow-md hover:shadow-accent-orange/10'
                    )}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    {/* Holographic shine effect */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl pointer-events-none" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side - User Stats & Avatar OR Sign In */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* XP Display */}
                <Link
                  href="/dashboard/achievements"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-accent-yellow/15 to-accent-orange/10 backdrop-blur-sm border border-accent-orange/30 hover:border-accent-orange/50 hover:shadow-md hover:shadow-accent-yellow/20 transition-all duration-300 transform hover:scale-105"
                >
                  <Zap size={18} className="text-accent-yellow" />
                  <span className="text-sm font-semibold">{user.xp} XP</span>
                </Link>

                {/* TODO: Re-enable for post-MVP Chronos token feature */}
                {/* CHRONOS Balance */}
                {/* <Link
                  href="/dashboard/wallet"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-card hover:bg-bg-hover transition-colors"
                >
                  <Coins size={18} className="text-accent-green" />
                  <span className="text-sm font-semibold">{user.chronos}</span>
                </Link> */}

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
                      <div className="absolute right-0 mt-2 w-48 bg-bg-card/95 backdrop-blur-md border border-accent-orange/30 rounded-xl shadow-lg shadow-accent-orange/10 z-20 overflow-hidden">
                        <div className="px-4 py-3 border-b border-accent-orange/20 bg-gradient-to-br from-accent-orange/10 to-accent-yellow/5">
                          <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                          <p className="text-xs text-text-muted">
                            Level {user.level || Math.floor(user.xp / 100)}
                          </p>
                        </div>
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-gradient-to-br hover:from-accent-orange/10 hover:to-accent-yellow/5 hover:text-text-primary transition-all duration-200"
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
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-gradient-to-br hover:from-accent-orange/10 hover:to-accent-yellow/5 hover:text-text-primary transition-all duration-200 text-left"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Sign In Button for Unauthenticated Users */
              <Link
                href="/api/whop/auth/login"
                className="px-4 py-2 bg-gradient-primary text-white rounded-xl hover:opacity-90 transition-all duration-300 font-medium shadow-lg shadow-accent-orange/30 text-sm transform hover:scale-105 border border-accent-orange/40"
              >
                Sign In with Whop
              </Link>
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
            <div className="flex flex-col space-y-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                      isActive
                        ? 'border border-accent-orange/60 bg-gradient-to-br from-accent-orange/15 to-accent-yellow/10 text-text-primary shadow-lg shadow-accent-orange/20 backdrop-blur-sm'
                        : 'border border-accent-orange/30 bg-bg-card/50 backdrop-blur-sm text-text-secondary hover:border-accent-orange/50 hover:bg-gradient-to-br hover:from-accent-orange/10 hover:to-accent-yellow/5 hover:text-text-primary'
                    )}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl pointer-events-none" />
                    )}
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
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-br from-accent-yellow/15 to-accent-orange/10 backdrop-blur-sm border border-accent-orange/30 hover:border-accent-orange/50 hover:shadow-md hover:shadow-accent-yellow/20 transition-all duration-300"
                >
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-accent-yellow" />
                    <span className="text-sm font-medium">XP</span>
                  </div>
                  <span className="text-sm font-semibold">{user.xp}</span>
                </Link>
                {/* TODO: Re-enable for post-MVP Chronos token feature */}
                {/* <Link
                  href="/dashboard/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-card"
                >
                  <div className="flex items-center gap-2">
                    <Coins size={18} className="text-accent-green" />
                    <span className="text-sm">CHRONOS</span>
                  </div>
                  <span className="text-sm font-semibold">{user.chronos}</span>
                </Link> */}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
