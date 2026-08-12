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
        <main className="flex-1 w-full overflow-y-auto bg-gray-50 flex flex-col">
          <div className="flex-1 w-full">
            {children}
          </div>
        </main>
        <footer className="w-full h-16 border-t border-gray-200 bg-gray-50 shrink-0 px-6 flex items-center justify-center z-10">
          <div className="flex items-center justify-center">
            <span className="text-xs font-bold text-brand-blue tracking-wider">
              © Developed by Felipe Nascimento
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};


