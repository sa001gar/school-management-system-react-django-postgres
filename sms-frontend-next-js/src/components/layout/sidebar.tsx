/**
 * Dashboard Sidebar Component
 * With collapsible groups and solid UI
 */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, ChevronLeft, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href: string;
  title: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

interface SidebarProps {
  items?: NavItem[];
  groups?: NavGroup[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

function NavGroupComponent({
  group,
  collapsed,
  onNavClick,
}: {
  group: NavGroup;
  collapsed: boolean;
  onNavClick: () => void;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(group.defaultOpen ?? true);

  // Check if any item in group is active
  const hasActiveItem = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="mb-2">
      {/* Group Header */}
      {!collapsed && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors",
            hasActiveItem
              ? "text-amber-800 bg-amber-100/50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          )}
        >
          <span>{group.title}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isOpen ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>
      )}

      {/* Group Items */}
      <ul
        className={cn(
          "mt-1 space-y-0.5 overflow-hidden transition-all duration-200",
          collapsed ? "" : isOpen ? "max-h-96" : "max-h-0"
        )}
      >
        {group.items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  collapsed ? "justify-center" : "ml-1",
                  isActive
                    ? "bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-md"
                    : "text-gray-700 hover:bg-amber-50 hover:text-amber-800"
                )}
                onClick={onNavClick}
                title={collapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive && "drop-shadow-sm"
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar({ items, groups, header, footer }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed } =
    useUIStore();

  // Convert flat items to a single group if no groups provided
  const navGroups: NavGroup[] =
    groups || (items ? [{ title: "Menu", items, defaultOpen: true }] : []);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r transition-all duration-300",
          // Solid amber/orange themed background
          "bg-linear-to-b from-gray-50 via-white to-amber-50/30 border-amber-200/60",
          sidebarCollapsed ? "w-20" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-amber-200/60 px-4",
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!sidebarCollapsed && header}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex hover:bg-amber-100 text-gray-600"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                sidebarCollapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group, idx) => (
            <NavGroupComponent
              key={group.title + idx}
              group={group}
              collapsed={sidebarCollapsed}
              onNavClick={() => setSidebarOpen(false)}
            />
          ))}
        </nav>

        {/* Footer */}
        {footer && (
          <div className="border-t border-amber-200/60 p-4 bg-amber-50/50">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function MobileHeader({
  title,
  subtitle,
  icon,
  actions,
}: MobileHeaderProps) {
  const { setSidebarOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-amber-200/60 bg-white/95 backdrop-blur-sm px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarOpen(true)}
          className="hover:bg-amber-100"
        >
          <Menu className="h-5 w-5 text-gray-700" />
        </Button>
        {icon}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </header>
  );
}
