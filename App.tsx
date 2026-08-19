/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AnalistasPage } from './pages/AnalistasPage';
import { AnaliseEvolucaoPage } from './pages/AnaliseEvolucaoPage';
import { OperacaoPage } from './pages/OperacaoPage';
import { CapacidadePage } from './pages/CapacidadePage';
import { HistoryPage } from './pages/HistoryPage';
import { useTokenStore } from './store/useTokenStore';
import { AuthScreen } from './components/AuthScreen';
import { ExpiredTokenModal } from './components/ExpiredTokenModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { isLoggedIn, isInitialized, initSessionFromStorage, checkTokenStatus } = useTokenStore();

  useEffect(() => {
    initSessionFromStorage();
  }, [initSessionFromStorage]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      checkTokenStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn, checkTokenStatus]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 size={36} className="animate-spin text-blue-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Carregando Sessão do Supabase...
        </span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthScreen />;
  }

  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/operacao" element={<OperacaoPage />} />
          <Route path="/capacidade" element={<CapacidadePage />} />
          <Route path="/analise" element={<AnaliseEvolucaoPage />} />
          <Route path="/analistas" element={<AnalistasPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>

      {/* Expired Session Overlay */}
      <ExpiredTokenModal />
    </Router>
  );
}
