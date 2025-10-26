import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TopNavigation is now in root layout (app/layout.tsx)
  // TODO: Implement auth context to pass user data to global TopNavigation

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Page content - scrollable */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
