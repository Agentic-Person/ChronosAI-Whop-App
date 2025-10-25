import React from 'react';
import { TopNavigation } from '@/components/layout/TopNavigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Mock user data - in production, fetch from auth context
  const user = {
    name: 'Student',
    xp: 1250,
    chronos: 450,
    level: 12,
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Top Navigation */}
      <TopNavigation user={user} />

      {/* Page content - scrollable */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
