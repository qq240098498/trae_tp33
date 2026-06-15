import { Home, Bell, Building2, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { usePropertyStore } from '@/stores/propertyStore';

const navItems = [
  { path: '/', label: '房屋管理', icon: Home },
  { path: '/reminders', label: '提醒中心', icon: Bell },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const properties = usePropertyStore((s) => s.properties);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/property');
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-[var(--color-primary)]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          租房管家
        </h1>
      </div>

      <nav className="mt-2 flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-primary)]'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] px-6 py-4">
        <p className="text-xs text-[var(--color-text-secondary)]">
          当前在租合同 <span className="font-semibold text-[var(--color-primary)]">{properties.length}</span> 份
        </p>
      </div>
    </>
  );

  return (
    <>
      <div className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-[var(--color-border)] md:bg-[var(--color-surface)]">
        {navContent}
      </div>

      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
          <span className="font-bold text-[var(--color-primary)]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            租房管家
          </span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)]'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <p className="text-xs text-[var(--color-text-secondary)]">
              当前在租合同 <span className="font-semibold text-[var(--color-primary)]">{properties.length}</span> 份
            </p>
          </div>
        </div>
      )}
    </>
  );
}
