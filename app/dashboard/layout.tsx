'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DashboardTopbar from '@/components/DashboardTopbar';

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Summary', href: '/dashboard/summary' },
  { label: 'Projects', href: '/dashboard/projects' },
  { label: 'Tasks', href: '/dashboard/tasks' },
  { label: 'Members', href: '/dashboard/members' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Dashboard</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <DashboardTopbar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

