import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, UserCircle2, ShieldCheck, Car, User } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: (defaultMode?: 'login' | 'register') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, activeTab, setActiveTab }) => {
  const { user, role, logout, quickLogin } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single Brand Wordmark */}
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 text-left group shrink-0"
          >
            <span className="text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
              MONROVIA RIDE <span className="text-amber-400">🚕</span>
            </span>
          </button>

          {/* Zone 2: Navigation Links (single-line, clean text) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'home' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab('passenger')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'passenger' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Passenger App
            </button>
            <button
              onClick={() => setActiveTab('driver')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'driver' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Driver Portal
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'admin' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              Admin Dispatch
            </button>
          </nav>

          {/* Zone 3: Primary Action & Quick Demo Selector */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] px-2 font-medium">Demo:</span>
              <button
                onClick={() => {
                  quickLogin('passenger');
                  setActiveTab('passenger');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  role === 'passenger'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Passenger Account (Korlu)"
              >
                Passenger
              </button>
              <button
                onClick={() => {
                  quickLogin('driver');
                  setActiveTab('driver');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  role === 'driver'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Driver Account (Emmanuel)"
              >
                Driver
              </button>
              <button
                onClick={() => {
                  quickLogin('admin');
                  setActiveTab('admin');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  role === 'admin'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Switch to Admin Account (Victoria)"
              >
                Admin
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {user.role} · Monrovia
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-900 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/10 whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
