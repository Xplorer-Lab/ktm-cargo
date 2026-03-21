import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/auth/UserContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Truck,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Plane,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import NotificationBell from '@/components/notifications/NotificationBell';
import { canAccessPage, getUserRoleLabel, ROLE_COLORS } from '@/components/auth/RolePermissions';
import { shouldBypassAppLayout } from '@/pages/layoutRouteGuards';
import { startTour, hasTour } from '@/components/common/TourGuide';

const navSections = [
  {
    title: 'Main',
    items: [
      {
        name: 'Dashboard',
        icon: LayoutDashboard,
        page: 'Operations',
        href: createPageUrl('Operations'),
        activePages: ['Operations'],
      },
      { name: 'Orders', icon: ShoppingBag, page: 'ShoppingOrders' },
      { name: 'Clients', icon: Users, page: 'Customers' },
      { name: 'Logistics', icon: Truck, page: 'Vendors' },
      { name: 'Invoices', icon: FileText, page: 'Invoices' },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Settings', icon: Settings, page: 'Settings' },
    ],
  },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useUser();
  const location = useLocation();

  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const list = await db.companySettings.list();
      return list[0] || null;
    },
  });

  // Bypass Layout (Sidebar/Header) for Public Pages
  if (shouldBypassAppLayout(location.pathname)) {
    return <>{children}</>;
  }

  const companyName = companySettings?.company_name || 'BKK-YGN Cargo';
  const companyLogo = companySettings?.logo_url;
  const companyTagline = companySettings?.tagline || '& Shopping Services';

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="p-2 bg-blue-600 rounded-lg">
                <Plane className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900">{companyName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden lg:flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={`${companyName} logo`}
                  className="w-12 h-12 object-contain rounded-xl"
                />
              ) : (
                <div className="p-2 bg-blue-600 rounded-xl">
                  <Plane className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-slate-900">{companyName}</h1>
                <p className="text-xs text-slate-500">{companyTagline}</p>
              </div>
            </div>
            <NotificationBell />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto mt-16 lg:mt-0">
            {navSections.map((section) => {
              const visibleItems = section.items
                .filter((item) => canAccessPage(user, item.page))
                .filter((item) => !item.feature || user?.features?.[item.feature]);

              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title}>
                  <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = item.activePages
                        ? item.activePages.includes(currentPageName)
                        : currentPageName === item.page;
                      return (
                        <Link
                          key={`${section.title}-${item.name}`}
                          to={item.href || createPageUrl(item.page)}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                          flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                          ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }
                        `}
                        >
                          <item.icon
                            className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                          />
                          <span>{item.name}</span>
                          {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-100">
            {hasTour(currentPageName) && (
              <Button
                variant="outline"
                onClick={() => startTour(currentPageName)}
                className="w-full justify-start mb-3 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              >
                <Sparkles className="w-4 h-4 mr-3" />
                Page Tour
              </Button>
            )}
            {user && (
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <span className="font-medium text-slate-600">
                    {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{user.full_name || 'User'}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : ROLE_COLORS[user.staff_role] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {getUserRoleLabel(user)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">{children}</main>
    </div>
  );
}
