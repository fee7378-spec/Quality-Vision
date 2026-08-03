import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 w-full overflow-y-auto bg-black flex flex-col justify-between">
          <div className="flex-1 w-full">
            {children}
          </div>
          <footer className="w-full border-t border-zinc-900 bg-black py-4 px-6 text-center text-xs text-zinc-500 font-medium shrink-0">
            © Developed by Felipe Nascimento
          </footer>
        </main>
      </div>
    </div>
  );
};


