import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, CheckSquare, Calendar, Settings, Shield } from 'lucide-react';

const items = [
  { name: 'Dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { name: 'Tasks', label: 'משימות', icon: CheckSquare },
  { name: 'Calendar', label: 'יומן', icon: Calendar },
  { name: 'Settings', label: 'הגדרות', icon: Settings },
];

// Bottom tab bar for mobile. Fixed to the bottom, respects the safe area.
export default function MobileNav({ currentPageName, isAdmin = false }) {
  const navItems = isAdmin
    ? [...items, { name: 'Admin', label: 'ניהול', icon: Shield }]
    : items;

  return (
    <nav
      dir="rtl"
      className="lg:hidden fixed bottom-0 right-0 left-0 z-50 border-t border-purple-100 bg-white/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = currentPageName === item.name;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.name)}
              className="flex flex-1 flex-col items-center gap-1 py-1.5 rounded-xl transition-all active:scale-95"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-300'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-purple-600' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
