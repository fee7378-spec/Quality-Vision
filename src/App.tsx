/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AnalistasPage } from './pages/AnalistasPage';
import { AnaliseEvolucaoPage } from './pages/AnaliseEvolucaoPage';
import { OperacaoPage } from './pages/OperacaoPage';
import { CapacidadePage } from './pages/CapacidadePage';
import { MetricasPage } from './pages/MetricasPage';
import { HistoryPage } from './pages/HistoryPage';

export default function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/operacao" element={<OperacaoPage />} />
          <Route path="/capacidade" element={<CapacidadePage />} />
          <Route path="/metricas" element={<MetricasPage />} />
          <Route path="/analise" element={<AnaliseEvolucaoPage />} />
          <Route path="/analistas" element={<AnalistasPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}

