'use client';

import { usePathname } from 'next/navigation';
import { TopNavigation } from '@/components/layout/TopNavigation';

export interface ConditionalNavigationProps {
  user?: {
    name: string;
    avatar?: string;
    xp: number;
    chronos: number;
    level?: number;
  };
}

export function ConditionalNavigation({ user }: ConditionalNavigationProps) {
  const pathname = usePathname();
  
  // Don't show navigation on landing page
  if (pathname === '/') {
    return null;
  }

  return <TopNavigation user={user} />;
}

