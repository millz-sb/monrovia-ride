import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './pages/LandingPage';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

function MainApp() {
  const { user, role, quickLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'passenger' | 'driver' | 'admin'>('home');

  // Auth modal control
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authDefaultRole, setAuthDefaultRole] = useState<'passenger' | 'driver'>('passenger');

  const openAuth = (mode: 'login' | 'register' = 'login', targetRole: 'passenger' | 'driver' = 'passenger') => {
    setAuthMode(mode);
    setAuthDefaultRole(targetRole);
    setIsAuthOpen(true);
  };

  const handleStartBooking = async () => {
    if (!user) {
      // Auto-log into demo passenger or open login modal
      await quickLogin('passenger');
    }
    setActiveTab('passenger');
  };

  const handleOpenDriverSignup = () => {
    openAuth('register', 'driver');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Navigation Header */}
      <Navbar
        onOpenAuth={(mode) => openAuth(mode || 'login', 'passenger')}
        activeTab={activeTab}
        setActiveTab={(tab: string) => {
          if (tab === 'passenger' && !user) {
            quickLogin('passenger');
          } else if (tab === 'driver' && !user) {
            quickLogin('driver');
          } else if (tab === 'admin' && !user) {
            quickLogin('admin');
          }
          setActiveTab(tab as any);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <LandingPage
            onStartBooking={handleStartBooking}
            onOpenDriverSignup={handleOpenDriverSignup}
          />
        )}

        {activeTab === 'passenger' && <PassengerDashboard />}

        {activeTab === 'driver' && <DriverDashboard />}

        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Global Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
        defaultRole={authDefaultRole}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
