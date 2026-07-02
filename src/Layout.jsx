import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Calendar, 
  Settings,
  LogOut,
  Menu,
  X,
  Shield
} from "lucide-react";

import { isAdminEmail } from '@/lib/admin';

const navItems = [
  { name: 'Dashboard', label: 'דשבורד', icon: LayoutDashboard },
  { name: 'Tasks', label: 'משימות', icon: CheckSquare },
  { name: 'Calendar', label: 'לוח שנה', icon: Calendar },
  { name: 'Settings', label: 'הגדרות', icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Hide layout navigation on specific pages that have their own header
  const pagesWithOwnHeader = ['Dashboard', 'Tasks', 'Calendar', 'Settings'];
  const showLayout = !pagesWithOwnHeader.includes(currentPageName);

  if (!showLayout) {
    return <div dir="rtl">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="fixed top-0 right-0 h-screen w-64 bg-white/80 backdrop-blur-xl border-l border-purple-100 hidden lg:block shadow-2xl">
        <div className="p-6 border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tasks & Calendar</h1>
          </div>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.name;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.name)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-200 scale-105' 
                    : 'text-slate-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          {isAdminEmail(user?.email) && (
            <Link
              to={createPageUrl('Admin')}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                ${currentPageName === 'Admin'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-purple-50'
                }
              `}
            >
              <Shield className="h-5 w-5" />
              <span className="font-medium">ניהול לקוחות</span>
            </Link>
          )}
        </nav>

        {user && (
          <div className="absolute bottom-0 right-0 left-0 p-4 border-t border-purple-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-purple-300">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{user.full_name}</p>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 right-0 left-0 bg-white/90 backdrop-blur-md border-b border-purple-100 z-50 shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tasks & Calendar</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-14 right-0 left-0 bg-white border-b shadow-lg">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = currentPageName === item.name;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.name)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{user.full_name}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 ml-2" />
                    יציאה
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="lg:mr-64">
        {children}
      </main>
    </div>
  );
}