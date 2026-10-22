import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { api } from '../services/api';
import { useWorkspace } from '../context/WorkspaceContext';
import type { HealthResponse } from '../types';

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const { refreshWorkspace } = useWorkspace();

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to check health:', err);
      setHealth({
        status: 'error',
        app_name: 'RetailIQ',
        version: '1.0.0',
        database: 'offline',
        model: 'unavailable',
        environment: 'local',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleRefresh = async () => {
    await checkHealth();
    await refreshWorkspace();
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex selection:bg-[var(--accent-lavender)] selection:text-[var(--accent-lavender-text)] transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          health={health}
          onRefresh={handleRefresh}
          lastUpdated={lastUpdated}
        />

        {/* Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
