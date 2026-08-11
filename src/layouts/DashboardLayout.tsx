import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const fetchSupabaseData = useStore(state => state.fetchSupabaseData);
  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 w-full overflow-y-auto bg-gray-50 flex flex-col justify-between">
          <div className="flex-1 w-full">
            {children}
          </div>
          <footer className="w-full border-t border-gray-200 bg-gray-50 py-4 px-6 text-center text-xs text-gray-400 font-medium shrink-0">
            © Developed by Felipe Nascimento
          </footer>
        </main>
      </div>
    </div>
  );
};


