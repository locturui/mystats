'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, BarChart2, TrendingUp, Sparkles, Upload, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/top', label: 'Top', icon: BarChart2 },
  { href: '/dashboard/stats', label: 'Charts', icon: TrendingUp },
  { href: '/wrapped', label: 'Wrapped', icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUsername(d.user.username); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <aside className="hidden sm:flex flex-col fixed left-0 top-0 h-full w-56 bg-[#111] border-r border-white/5 z-40">
        <div className="px-5 py-6 border-b border-white/5">
          <span className="text-lg font-black tracking-tight select-none">
            <span className="text-spotify-green">my</span>stats
          </span>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-spotify-green/10 text-spotify-green'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 space-y-0.5 border-t border-white/5">
          <Link
            href="/upload"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors mt-3"
          >
            <Upload size={18} />
            Upload data
          </Link>

          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-7 h-7 rounded-full bg-spotify-green/20 flex items-center justify-center text-xs font-bold text-spotify-green shrink-0">
              {username.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="flex-1 text-sm text-white/60 truncate">{username}</span>
            <button
              onClick={handleLogout}
              className="text-white/30 hover:text-white/70 transition-colors"
              title="Log out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur border-t border-white/5 z-40 flex">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-6 transition-colors ${
                active ? 'text-spotify-green' : 'text-white/35 hover:text-white/60'
              }`}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
