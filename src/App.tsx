/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ImportPage } from './pages/ImportPage';
import { DashboardPage } from './pages/DashboardPage';
import { AnalistasPage } from './pages/AnalistasPage';
import { AnaliseEvolucaoPage } from './pages/AnaliseEvolucaoPage';

export default function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analise" element={<AnaliseEvolucaoPage />} />
          <Route path="/analistas" element={<AnalistasPage />} />
          <Route path="/import" element={<ImportPage />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}
