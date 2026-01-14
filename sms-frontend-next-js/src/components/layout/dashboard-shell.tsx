/**
 * Dashboard Shell Component
 * Main layout wrapper for dashboard pages
 */
'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores';
import { Sidebar, MobileHeader, type NavItem } from './sidebar';
import { DashboardHeader } from './dashboard-header';
import { School } from 'lucide-react';
import type { UserRole } from '@/types';

export interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  role: UserRole;
  sidebarHeader?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}

const roleConfig = {
  admin: { title: 'Admin Dashboard', color: 'from-purple-500 to-indigo-600' },
  teacher: { title: 'Teacher Dashboard', color: 'from-blue-500 to-cyan-600' },
  student: { title: 'Student Portal', color: 'from-green-500 to-emerald-600' },
};

export function DashboardShell({
  children,
  navItems,
  role,
  sidebarHeader,
  sidebarFooter,
}: DashboardShellProps) {
  const { sidebarCollapsed } = useUIStore();
  const config = roleConfig[role];

  const defaultHeader = (
    <div className="flex items-center gap-3">
      <div className={cn('h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center', config.color)}>
        <School className="h-4 w-4 text-white" />
      </div>
      {!sidebarCollapsed && (
        <span className="font-semibold text-gray-900">SMS</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Sidebar */}
      <Sidebar
        items={navItems}
        header={sidebarHeader || defaultHeader}
        footer={sidebarFooter}
      />

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-300 lg:ml-64',
          sidebarCollapsed && 'lg:ml-20'
        )}
      >
        {/* Mobile header */}
        <MobileHeader
          title={config.title}
          icon={
            <div className={cn('h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center', config.color)}>
              <School className="h-4 w-4 text-white" />
            </div>
          }
        />

        {/* Desktop header */}
        <div className="hidden lg:block">
          <DashboardHeader />
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
