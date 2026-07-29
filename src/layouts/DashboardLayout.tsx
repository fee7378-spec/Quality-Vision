import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-slate-200">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-black">
          {children}
        </main>
      </div>
    </div>
  );
};

