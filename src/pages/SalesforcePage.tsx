import React, { useState, useMemo } from 'react';
import { 
  Search, X, Eye, Clock, AlertTriangle, CheckCircle, 
  ChevronLeft, ChevronRight, ChevronDown, Filter, Calendar, 
  Layers, Users, ShieldCheck, Play, ArrowUpRight, TrendingUp, 
  Activity, Award, Flame, UserCheck, CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, BarChart, Bar, Cell 
} from 'recharts';
import { useStore, matchesFilter } from '../store/useStore';
import { 
  generateMockSalesforceCases, SalesforceCase, SalesforceCaseHistory,
  FILAS, ANALISTAS, ATIVIDADES, STATUSES, PRIORIDADES 
} from '../store/salesforceData';

export const SalesforcePage: React.FC = () => {
  // Global Filters from store
  const { selectedEsteira, startDate, endDate } = useStore();

  // Load deterministic mock data
  const allCases = useMemo(() => generateMockSalesforceCases(), []);

  // Tabs
  const [activeTab, setActiveTab] = useState<'casos' | 'analistas'>('casos');

  // Local Page Filters
  const [selectedFila, setSelectedFila] = useState<string>('TODAS');
  const [selectedAnalistaFilter, setSelectedAnalistaFilter] = useState<string>('TODAS');
  const [selectedAtividade, setSelectedAtividade] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODAS');
  const [selectedSla, setSelectedSla] = useState<string>('TODAS');
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('TODAS');
  const [searchCaseId, setSearchCaseId] = useState<string>('');

  // Main table state
  const [sortField, setSortField] = useState<keyof SalesforceCase>('id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Selected Analyst in Tab 2 (defaults to first analyst)
  const [selectedAnalystName, setSelectedAnalystName] = useState<string>('João Silva');
  const [analystSearchQuery, setAnalystSearchQuery] = useState<string>('');

  // Selected Case for Modal Details
  const [selectedCaseModal, setSelectedCaseModal] = useState<SalesforceCase | null>(null);

  // Sorting helper for main table
  const handleSort = (field: keyof SalesforceCase) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // 1. FILTER LOGIC FOR CASES
  const filteredCases = useMemo(() => {
    return allCases.filter(c => {
      // Global date range filter
      const caseDateOnly = c.dataAbertura.split(' ')[0]; // YYYY-MM-DD
      if (startDate && caseDateOnly < startDate) return false;
      if (endDate && caseDateOnly > endDate) return false;

      // Global Fila / Esteira filter (from topbar)
      if (!matchesFilter(selectedEsteira, c.fila, 'TODAS')) return false;

      // Local filters
      if (selectedFila !== 'TODAS' && c.fila !== selectedFila) return false;
      if (selectedAnalistaFilter !== 'TODAS' && c.analista !== selectedAnalistaFilter) return false;
      if (selectedAtividade !== 'TODAS' && c.atividade !== selectedAtividade) return false;
      if (selectedStatus !== 'TODAS' && c.status !== selectedStatus) return false;
      if (selectedSla !== 'TODAS' && c.sla !== selectedSla) return false;
      if (selectedPrioridade !== 'TODAS' && c.prioridade !== selectedPrioridade) return false;

      // Search ID filter
      if (searchCaseId.trim()) {
        const query = searchCaseId.trim().toLowerCase();
        if (!c.id.toLowerCase().includes(query)) return false;
      }

      return true;
    });
  }, [allCases, selectedEsteira, startDate, endDate, selectedFila, selectedAnalistaFilter, selectedAtividade, selectedStatus, selectedSla, selectedPrioridade, searchCaseId]);

  // RESET LOCAL FILTERS
  const handleClearFilters = () => {
    setSelectedFila('TODAS');
    setSelectedAnalistaFilter('TODAS');
    setSelectedAtividade('TODAS');
    setSelectedStatus('TODAS');
    setSelectedSla('TODAS');
    setSelectedPrioridade('TODAS');
    setSearchCaseId('');
  };

  // 2. INDICATOR CARDS CALCULATIONS (based on filteredCases)
  const totalCases = filteredCases.length;
  const casesSlaNormal = filteredCases.filter(c => c.sla === 'Normal').length;
  const casesSlaAlerta = filteredCases.filter(c => c.sla === 'Alerta').length;
  const casesSlaViolado = filteredCases.filter(c => c.sla === 'Violado').length;

  const pctDentroSla = totalCases > 0 ? ((casesSlaNormal / totalCases) * 100).toFixed(1) : '100.0';
  const pctVioladoSla = totalCases > 0 ? ((casesSlaViolado / totalCases) * 100).toFixed(1) : '0.0';

  // Tempo médio de conclusão (fictício, baseado nos casos filtrados)
  const avgConclusaoStr = useMemo(() => {
    if (filteredCases.length === 0) return '0h 00m';
    const totalMin = filteredCases.reduce((sum, c) => sum + c.tempoConclusaoMinutos, 0);
    const avgMin = Math.round(totalMin / filteredCases.length);
    const hours = Math.floor(avgMin / 60);
    const mins = avgMin % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }, [filteredCases]);

  // Casos prioritários (Crítica + Alta)
  const priorityCasesCount = filteredCases.filter(c => c.prioridade === 'Crítica' || c.prioridade === 'Alta').length;

  // 3. CHART & SECTION PREPARATIONS (ABA 1)

  // Status Distribution (Horizontal bars)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Em Progresso': 0,
      'Pendenciado': 0,
      'Triagem': 0,
      'N2': 0,
      'Reaberto': 0
    };
    filteredCases.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [filteredCases]);

  // Activities Distribution
  const [activitySortDesc, setActivitySortDesc] = useState<boolean>(true);
  const activityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    ATIVIDADES.forEach(act => { counts[act] = 0; });
    filteredCases.forEach(c => {
      counts[c.atividade] = (counts[c.atividade] || 0) + 1;
    });
    const list = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return list.sort((a, b) => activitySortDesc ? b.value - a.value : a.value - b.value);
  }, [filteredCases, activitySortDesc]);

  // SLA Pie Chart / Donut Chart Data representation
  const slaChartData = useMemo(() => {
    return [
      { name: 'Normal', value: casesSlaNormal, color: '#10b981' }, // emerald
      { name: 'Alerta', value: casesSlaAlerta, color: '#f59e0b' }, // amber
      { name: 'Violado', value: casesSlaViolado, color: '#ef4444' } // red
    ];
  }, [casesSlaNormal, casesSlaAlerta, casesSlaViolado]);

  // Priorities Distribution
  const priorityDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      'Crítica': 0,
      'Alta': 0,
      'Média': 0,
      'Baixa': 0
    };
    filteredCases.forEach(c => {
      if (counts[c.prioridade] !== undefined) counts[c.prioridade]++;
    });
    return Object.entries(counts);
  }, [filteredCases]);

  // Lists of specific subsets for highlighting
  const casesViolatedOnly = useMemo(() => {
    return filteredCases.filter(c => c.sla === 'Violado');
  }, [filteredCases]);

  const casesAlertOnly = useMemo(() => {
    return filteredCases.filter(c => c.sla === 'Alerta');
  }, [filteredCases]);

  // Main table list paginated & sorted
  const sortedAndPaginatedCases = useMemo(() => {
    const sorted = [...filteredCases].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });

    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [filteredCases, sortField, sortAsc, currentPage]);

  const totalPages = Math.ceil(filteredCases.length / itemsPerPage) || 1;


  // 4. ANALYSTS LIST COMPILATIONS (ABA 2)
  const analystsRanking = useMemo(() => {
    const rankings = ANALISTAS.map(name => {
      // Filter cases just for this analyst
      const aCases = allCases.filter(c => {
        if (c.analista !== name) return false;
        // Apply Global date range filter
        const caseDateOnly = c.dataAbertura.split(' ')[0]; // YYYY-MM-DD
        if (startDate && caseDateOnly < startDate) return false;
        if (endDate && caseDateOnly > endDate) return false;
        // Global Fila filter
        if (!matchesFilter(selectedEsteira, c.fila, 'TODAS')) return false;
        return true;
      });

      const total = aCases.length;
      const normal = aCases.filter(c => c.sla === 'Normal').length;
      const alerta = aCases.filter(c => c.sla === 'Alerta').length;
      const violado = aCases.filter(c => c.sla === 'Violado').length;
      const pendenciado = aCases.filter(c => c.status === 'Pendenciado').length;
      const progresso = aCases.filter(c => c.status === 'Em Progresso').length;
      const n2 = aCases.filter(c => c.status === 'N2').length;
      const triagem = aCases.filter(c => c.status === 'Triagem').length;
      const reaberto = aCases.filter(c => c.status === 'Reaberto').length;
      const prioritarios = aCases.filter(c => c.prioridade === 'Crítica' || c.prioridade === 'Alta').length;

      // Avg completion time
      let avgMinStr = '0h 00m';
      let avgMin = 0;
      if (total > 0) {
        const totalMin = aCases.reduce((sum, c) => sum + c.tempoConclusaoMinutos, 0);
        avgMin = Math.round(totalMin / total);
        const hours = Math.floor(avgMin / 60);
        const mins = avgMin % 60;
        avgMinStr = `${hours}h ${String(mins).padStart(2, '0')}m`;
      }

      return {
        name,
        total,
        normal,
        alerta,
        violado,
        pendenciado,
        progresso,
        n2,
        triagem,
        reaberto,
        prioritarios,
        avgConclusao: avgMinStr,
        avgMinVal: avgMin
      };
    });

    // Apply search filter on analysts ranking if typed
    if (analystSearchQuery.trim()) {
      const q = analystSearchQuery.trim().toLowerCase();
      return rankings.filter(r => r.name.toLowerCase().includes(q));
    }

    return rankings;
  }, [allCases, selectedEsteira, startDate, endDate, analystSearchQuery]);

  // Selected Analyst Detailed data
  const selectedAnalystDetail = useMemo(() => {
    const name = selectedAnalystName;
    const aCases = allCases.filter(c => {
      if (c.analista !== name) return false;
      const caseDateOnly = c.dataAbertura.split(' ')[0];
      if (startDate && caseDateOnly < startDate) return false;
      if (endDate && caseDateOnly > endDate) return false;
      if (!matchesFilter(selectedEsteira, c.fila, 'TODAS')) return false;
      return true;
    });

    const total = aCases.length;
    const normal = aCases.filter(c => c.sla === 'Normal').length;
    const alerta = aCases.filter(c => c.sla === 'Alerta').length;
    const violados = aCases.filter(c => c.sla === 'Violado').length;
    const prioritarios = aCases.filter(c => c.prioridade === 'Crítica' || c.prioridade === 'Alta').length;

    let avgMinStr = '0h 00m';
    if (total > 0) {
      const totalMin = aCases.reduce((sum, c) => sum + c.tempoConclusaoMinutos, 0);
      const avgMin = Math.round(totalMin / total);
      const hours = Math.floor(avgMin / 60);
      const mins = avgMin % 60;
      avgMinStr = `${hours}h ${String(mins).padStart(2, '0')}m`;
    }

    // Statuses
    const statuses = {
      'Pendenciado': aCases.filter(c => c.status === 'Pendenciado').length,
      'Em Progresso': aCases.filter(c => c.status === 'Em Progresso').length,
      'N2': aCases.filter(c => c.status === 'N2').length,
      'Triagem': aCases.filter(c => c.status === 'Triagem').length,
      'Reaberto': aCases.filter(c => c.status === 'Reaberto').length
    };

    // Violados cases
    const casesViolated = aCases.filter(c => c.sla === 'Violado');

    // Activities distribution
    const activities: Record<string, number> = {};
    aCases.forEach(c => {
      activities[c.atividade] = (activities[c.atividade] || 0) + 1;
    });
    const activitiesSorted = Object.entries(activities)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Dynamic 7-day evolution chart based on analyst totals (fictional but mathematically scaled)
    const evolutionChart = Array.from({ length: 7 }).map((_, idx) => {
      const dayOffset = 6 - idx;
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      const dayStr = String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0');

      // Deterministic offsets
      const baseSeed = name.charCodeAt(0) + idx * 10;
      const recebidos = Math.max(1, (baseSeed % 12) + 2);
      const concluidos = Math.max(0, ((baseSeed + 5) % 11) + 2);
      const pendentes = Math.max(2, Math.round(total / 3) + (idx % 3) - (idx % 2));

      return {
        day: dayStr,
        recebidos,
        concluidos,
        pendentes
      };
    });

    // Maior atraso fictício baseado em seus casos violados
    const maxAtraso = casesViolated.length > 0 ? casesViolated[0].tempoRestanteAtraso : '-';

    return {
      name,
      total,
      normal,
      alerta,
      violados,
      prioritarios,
      avgConclusao: avgMinStr,
      maxAtraso,
      statuses,
      casesViolated,
      activities: activitiesSorted,
      evolution: evolutionChart
    };
  }, [allCases, selectedAnalystName, selectedEsteira, startDate, endDate]);

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white w-full max-w-full text-xs animate-in fade-in duration-200">
      
      {/* 2-Tab Navigation Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('casos')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
            activeTab === 'casos' 
              ? 'text-brand-blue dark:text-blue-400 font-extrabold border-b-2 border-brand-blue dark:border-blue-400' 
              : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          Casos
        </button>
        <button
          onClick={() => setActiveTab('analistas')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors relative cursor-pointer ${
            activeTab === 'analistas' 
              ? 'text-brand-blue dark:text-blue-400 font-extrabold border-b-2 border-brand-blue dark:border-blue-400' 
              : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          Analistas
        </button>
      </div>

      {activeTab === 'casos' ? (
        /* ======================== ABA 1: CASOS ======================== */
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* LOCAL PAGE FILTERS PANEL */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-3.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60 pb-2">
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase flex items-center gap-1.5">
                <Filter size={13} className="text-brand-blue dark:text-blue-400" />
                Filtros de Área & Pesquisa de Casos
              </span>
              <button 
                onClick={handleClearFilters}
                className="text-[10px] text-red-500 dark:text-red-400 hover:underline font-bold transition-all cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Local Fila filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Fila / Fila de Casos</label>
                <select
                  value={selectedFila}
                  onChange={(e) => { setSelectedFila(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-[11px] text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="TODAS">TODAS</option>
                  {FILAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Local Analista filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Analista Responsável</label>
                <select
                  value={selectedAnalistaFilter}
                  onChange={(e) => { setSelectedAnalistaFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-[11px] text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="TODAS">TODOS</option>
                  {ANALISTAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Local Atividade filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Atividade / Demanda</label>
                <select
                  value={selectedAtividade}
                  onChange={(e) => { setSelectedAtividade(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-[11px] text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="TODAS">TODAS</option>
                  {ATIVIDADES.map(at => <option key={at} value={at}>{at}</option>)}
                </select>
              </div>

              {/* Local Status filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Status Salesforce</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-[11px] text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="TODAS">TODOS</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Local SLA filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">SLA Estado</label>
                <select
                  value={selectedSla}
                  onChange={(e) => { setSelectedSla(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-[11px] text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="TODAS">TODOS</option>
                  <option value="Normal">Normal</option>
                  <option value="Alerta">Alerta</option>
                  <option value="Violado">Violado</option>
                </select>
              </div>

              {/* Local Prioridade filter */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Prioridade</label>
                <select
                  value={selectedPrioridade}
                  onChange={(e) => { setSelectedPrioridade(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 text-[11px] text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="TODAS">TODAS</option>
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Case ID Search */}
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Código do Caso</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="CAS-1..."
                    value={searchCaseId}
                    onChange={(e) => { setSearchCaseId(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md p-1.5 pl-7 text-[11px] text-gray-900 dark:text-white outline-none"
                  />
                  <Search size={11} className="absolute left-2.5 top-2.5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* KPI STATS BAR (6 CARDS) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total de Casos */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-2xs flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 dark:text-white font-bold uppercase tracking-wider">Total de Casos</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-black text-brand-blue dark:text-blue-400">{totalCases.toLocaleString('pt-BR')}</p>
                <span className="text-[9px] font-semibold text-gray-400 uppercase">Geral</span>
              </div>
            </div>

            {/* Dentro do SLA */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-2xs flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 dark:text-white font-bold uppercase tracking-wider">Dentro do SLA</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{casesSlaNormal.toLocaleString('pt-BR')}</p>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                  {pctDentroSla}%
                </span>
              </div>
            </div>

            {/* Em Alerta */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-2xs flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 dark:text-white font-bold uppercase tracking-wider">Em Alerta</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-black text-amber-500 dark:text-amber-400">{casesSlaAlerta.toLocaleString('pt-BR')}</p>
                <span className="text-[9px] font-semibold text-amber-500 uppercase">SLA Próximo</span>
              </div>
            </div>

            {/* SLA Violado */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-2xs flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 dark:text-white font-bold uppercase tracking-wider">SLA Violado</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-black text-red-600 dark:text-red-400">{casesSlaViolado.toLocaleString('pt-BR')}</p>
                <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded-md">
                  {pctVioladoSla}%
                </span>
              </div>
            </div>

            {/* Tempo Médio de Conclusão */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-2xs flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 dark:text-white font-bold uppercase tracking-wider">Tempo Médio Concl.</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-lg font-black text-[#001E62] dark:text-blue-300">{avgConclusaoStr}</p>
                <span className="text-[9px] font-semibold text-gray-400 uppercase">Fictício</span>
              </div>
            </div>

            {/* Casos Prioritários */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-3 rounded-lg shadow-2xs flex flex-col justify-between">
              <p className="text-[10px] text-gray-500 dark:text-white font-bold uppercase tracking-wider">Casos Prioritários</p>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="text-2xl font-black text-red-600 dark:text-red-400">{priorityCasesCount.toLocaleString('pt-BR')}</p>
                <span className="text-[9px] font-bold text-red-600 bg-red-100 dark:bg-red-900/20 px-1 rounded-sm uppercase">Altos/Crít.</span>
              </div>
            </div>
          </div>

          {/* TWO GRAPH COLUMN ROW (SLA & STATUSES) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* SLA DISTRIBUTION (4 columns) */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider mb-2.5">
                  DISTRIBUIÇÃO DE SLA
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Normal vs. Alerta vs. Violado (passe o mouse nos indicadores)</p>
              </div>

              {/* Visual Indicator with custom big blocks */}
              <div className="space-y-3.5 my-auto py-2">
                {slaChartData.map(item => {
                  const pct = totalCases > 0 ? ((item.value / totalCases) * 100).toFixed(1) : '0.0';
                  return (
                    <div 
                      key={item.name} 
                      className="bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-800/80 p-2.5 rounded-lg flex items-center justify-between transition-all hover:translate-x-1"
                      title={`${item.name}: ${item.value} casos (${pct}%)`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <span className="font-bold text-[11px] text-gray-800 dark:text-white uppercase">{item.name}</span>
                          <span className="block text-[10px] text-gray-400">
                            {item.name === 'Normal' ? 'Dentro do SLA' : item.name === 'Alerta' ? 'Próximo do Vencimento' : 'Prazo Ultrapassado'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xs text-gray-900 dark:text-white">{item.value.toLocaleString('pt-BR')}</p>
                        <p className="text-[10px] font-bold text-gray-400">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress visual bar */}
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex mt-4">
                {slaChartData.map(item => {
                  const pct = totalCases > 0 ? (item.value / totalCases) * 100 : 0;
                  return (
                    <div 
                      key={item.name}
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                    />
                  );
                })}
              </div>
            </div>

            {/* STATUSES DISTRIBUTION (8 columns) */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs lg:col-span-8">
              <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider mb-2.5">
                STATUS DOS CASOS
              </h3>
              <p className="text-[10px] text-gray-400 mb-4">Volume total distribuído pelos cinco status operacionais do Salesforce</p>

              <div className="space-y-3.5 py-1">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const vals = Object.values(statusCounts) as number[];
                  const maxCount = Math.max(...vals) || 1;
                  const pctWidth = ((count as number) / maxCount) * 100;
                  const pctTotal = totalCases > 0 ? (((count as number) / totalCases) * 100).toFixed(1) : '0.0';

                  // Estilos de cor por status
                  let colorClass = 'bg-blue-500';
                  if (status === 'Pendenciado') colorClass = 'bg-amber-500';
                  if (status === 'N2') colorClass = 'bg-purple-500';
                  if (status === 'Triagem') colorClass = 'bg-indigo-500';
                  if (status === 'Reaberto') colorClass = 'bg-red-500';

                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{status}</span>
                        <div className="flex items-center gap-1.5 font-black text-gray-900 dark:text-white">
                          <span>{count}</span>
                          <span className="text-[10px] font-medium text-gray-400">({pctTotal}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-gray-100 dark:bg-[#192238] rounded-xs overflow-hidden">
                        <div 
                          style={{ width: `${pctWidth}%` }} 
                          className={`h-full ${colorClass} transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* TWO COLUMN ROW: ACTIVITIES (8 cols) & PRIORITIES (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* ACTIVITIES VOLUME (8 columns) */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs lg:col-span-8 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider">
                    ATIVIDADES DOS CASOS
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Frequência e volume por tipo de solicitação operacional</p>
                </div>
                <button
                  onClick={() => setActivitySortDesc(!activitySortDesc)}
                  className="px-2.5 py-1 text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md transition-colors cursor-pointer"
                >
                  Ordenar: {activitySortDesc ? 'Maior Volume' : 'Menor Volume'}
                </button>
              </div>

              {/* Grid of activities with values and visual progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pt-2">
                {activityDistribution.map(act => {
                  const maxVal = Math.max(...activityDistribution.map(a => a.value)) || 1;
                  const barPct = (act.value / maxVal) * 100;
                  return (
                    <div key={act.name} className="flex items-center justify-between bg-gray-50/50 dark:bg-[#192238]/40 border border-gray-100 dark:border-gray-800 p-1.5 rounded-sm">
                      <div className="truncate w-36 sm:w-48">
                        <p className="font-bold text-[10px] text-gray-700 dark:text-gray-200 truncate uppercase">{act.name}</p>
                        <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 mt-1 rounded-full overflow-hidden">
                          <div style={{ width: `${barPct}%` }} className="h-full bg-[#001E62] dark:bg-blue-400" />
                        </div>
                      </div>
                      <span className="font-black text-[12px] text-gray-900 dark:text-white bg-white dark:bg-[#192238] border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded-sm shadow-2xs">
                        {act.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRIORITIES SUMMARY (4 columns) */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs lg:col-span-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider mb-2.5">
                  PRIORIDADES
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Distribuição do volume por criticidade (Casos Críticos e Altos possuem maior urgência)</p>
              </div>

              <div className="space-y-3.5 my-auto py-2">
                {priorityDistribution.map(([prio, val]) => {
                  // Destaque visual por prioridade
                  let textClass = 'text-gray-800 dark:text-white';
                  let badgeClass = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
                  
                  if (prio === 'Crítica') {
                    textClass = 'text-red-600 dark:text-red-400 font-extrabold';
                    badgeClass = 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400';
                  } else if (prio === 'Alta') {
                    textClass = 'text-amber-600 dark:text-amber-400 font-bold';
                    badgeClass = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400';
                  }

                  return (
                    <div key={prio} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-2 last:border-0 last:pb-0">
                      <span className={`text-[11px] uppercase ${textClass}`}>{prio}</span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-md ${badgeClass}`}>
                        {val} casos
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-2.5 rounded-lg text-[10px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5 mt-4">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>
                  Supervisores devem priorizar as filas que possuem maior volumetria de casos classificados como <strong>Crítica</strong> e <strong>Alta</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* TWO DEDICATED EXCEPTION SECTIONS: VIOLADOS & EM ALERTA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* 1. CASOS FORA DO SLA (VIOLADOS ONLY) */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame size={14} className="animate-pulse" />
                  Casos Fora do SLA (SLA Violado)
                </h3>
                <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                  {casesViolatedOnly.length} Pendências Violadas
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Estes casos ultrapassaram o tempo limite estipulado em contrato e requerem ação imediata.</p>

              <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-md">
                <table className="w-full text-left text-[10px] text-gray-700 dark:text-gray-300 border-collapse">
                  <thead className="bg-gray-100 dark:bg-[#192238] text-gray-600 dark:text-gray-300 uppercase font-bold border-b border-gray-200 dark:border-gray-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-2">ID Caso</th>
                      <th className="py-2 px-2">Atividade</th>
                      <th className="py-2 px-2">Fila</th>
                      <th className="py-2 px-2">Analista</th>
                      <th className="py-2 px-2 text-center">Tempo Atraso</th>
                      <th className="py-2 px-2">Urgência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {casesViolatedOnly.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400 dark:text-gray-500 italic">
                          Excelente! Nenhum caso com SLA Violado no momento.
                        </td>
                      </tr>
                    ) : (
                      casesViolatedOnly.slice(0, 15).map((item) => {
                        // Highlight atrasos maiores (conter 'd' indica dias de atraso, o que é altíssimo)
                        const isExtremeDelay = item.tempoRestanteAtraso.includes('d');
                        return (
                          <tr 
                            key={item.id}
                            onClick={() => setSelectedCaseModal(item)}
                            className="hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-2 font-bold text-gray-900 dark:text-white">{item.id}</td>
                            <td className="py-2.5 px-2 font-semibold truncate max-w-28" title={item.atividade}>{item.atividade}</td>
                            <td className="py-2.5 px-2 font-medium">{item.fila}</td>
                            <td className="py-2.5 px-2">{item.analista}</td>
                            <td className="py-2.5 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-sm font-extrabold text-[10px] ${
                                isExtremeDelay 
                                  ? 'bg-red-600 text-white animate-pulse' 
                                  : 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                              }`}>
                                {item.tempoRestanteAtraso}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase ${
                                item.prioridade === 'Crítica' ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30'
                              }`}>
                                {item.prioridade}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. CASOS EM ALERTA (ALERTA ONLY) */}
            <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} />
                  Casos em Alerta (SLA Crítico)
                </h3>
                <span className="text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                  {casesAlertOnly.length} Em Alerta
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-3">Casos que ainda não violaram o SLA, mas cujo prazo de expiração é inferior a poucas horas.</p>

              <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-md">
                <table className="w-full text-left text-[10px] text-gray-700 dark:text-gray-300 border-collapse">
                  <thead className="bg-gray-100 dark:bg-[#192238] text-gray-600 dark:text-gray-300 uppercase font-bold border-b border-gray-200 dark:border-gray-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-2">ID Caso</th>
                      <th className="py-2 px-2">Atividade</th>
                      <th className="py-2 px-2">Fila</th>
                      <th className="py-2 px-2">Analista</th>
                      <th className="py-2 px-2 text-center">Tempo Restante</th>
                      <th className="py-2 px-2">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {casesAlertOnly.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-400 dark:text-gray-500 italic">
                          Sem casos em Alerta no momento. Todos operando sob SLA seguro!
                        </td>
                      </tr>
                    ) : (
                      casesAlertOnly.slice(0, 15).map((item) => (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedCaseModal(item)}
                          className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-2 font-bold text-gray-900 dark:text-white">{item.id}</td>
                          <td className="py-2.5 px-2 font-semibold truncate max-w-28" title={item.atividade}>{item.atividade}</td>
                          <td className="py-2.5 px-2 font-medium">{item.fila}</td>
                          <td className="py-2.5 px-2">{item.analista}</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-sm font-extrabold text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                              {item.tempoRestanteAtraso}
                            </span>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                              {item.prioridade}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MAIN TABLE (TABELA PRINCIPAL DE CASOS) */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider mb-2">
              TABELA PRINCIPAL DE CASOS
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">
              Base operacional consolidada com todos os casos Salesforce correspondentes aos filtros ativos ({filteredCases.length} registros). Clicar nos cabeçalhos ordena as colunas.
            </p>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-md">
              <table className="w-full text-left text-[11px] text-gray-700 dark:text-gray-300 border-collapse">
                <thead className="bg-gray-100 dark:bg-[#192238] text-gray-600 dark:text-gray-300 uppercase font-bold border-b border-gray-200 dark:border-gray-800 select-none">
                  <tr>
                    <th onClick={() => handleSort('id')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800">
                      ID Caso {sortField === 'id' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('atividade')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800">
                      Atividade {sortField === 'atividade' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('fila')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800">
                      Fila {sortField === 'fila' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('analista')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800">
                      Analista {sortField === 'analista' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('status')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800">
                      Status {sortField === 'status' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('prioridade')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 text-center">
                      Prioridade {sortField === 'prioridade' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('sla')} className="py-2.5 px-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 text-center">
                      SLA {sortField === 'sla' && (sortAsc ? '▲' : '▼')}
                    </th>
                    <th className="py-2.5 px-3 text-center">Conclusão / Atraso</th>
                    <th className="py-2.5 px-3">Abertura</th>
                    <th className="py-2.5 px-3">Última Atualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sortedAndPaginatedCases.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-gray-400 dark:text-gray-500 italic">
                        Nenhum caso encontrado para os critérios de busca selecionados.
                      </td>
                    </tr>
                  ) : (
                    sortedAndPaginatedCases.map((item) => {
                      // Cores e Badges
                      let slaBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400';
                      if (item.sla === 'Violado') slaBadge = 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400';
                      if (item.sla === 'Alerta') slaBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400';

                      let prioBadge = 'bg-gray-100 text-gray-800 dark:bg-gray-800';
                      if (item.prioridade === 'Crítica') prioBadge = 'bg-red-600 text-white';
                      if (item.prioridade === 'Alta') prioBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400';

                      let statusBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400';
                      if (item.status === 'Pendenciado') statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400';
                      if (item.status === 'Reaberto') statusBadge = 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400';

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedCaseModal(item)}
                          className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">{item.id}</td>
                          <td className="py-2 px-3 font-semibold truncate max-w-40">{item.atividade}</td>
                          <td className="py-2 px-3 font-medium">{item.fila}</td>
                          <td className="py-2 px-3">{item.analista}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase ${statusBadge}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase ${prioBadge}`}>
                              {item.prioridade}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${slaBadge}`}>
                              {item.sla}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-gray-800 dark:text-gray-100">
                            {item.tempoRestanteAtraso}
                          </td>
                          <td className="py-2 px-3 text-gray-500">{item.dataAbertura}</td>
                          <td className="py-2 px-3 text-gray-500">{item.ultimaAtualizacao}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-3 text-gray-500">
              <span className="text-[11px]">
                Exibindo página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredCases.length} casos no total)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== ABA 2: ANALISTAS ======================== */
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* TOP RANKING & GRID SEARCH */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider">
                  RANKING GERAL DOS ANALISTAS
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Visão consolidada da carteira, SLAs, status e produtividade individual de cada profissional</p>
              </div>

              {/* Analyst search input in ranking */}
              <div className="relative w-full md:w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Pesquisar analista..."
                  value={analystSearchQuery}
                  onChange={(e) => setAnalystSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md py-1.5 pl-8 pr-7 text-[11px] text-gray-900 dark:text-white outline-none"
                />
                <Search size={12} className="absolute left-2.5 top-3 text-gray-400" />
                {analystSearchQuery && (
                  <button onClick={() => setAnalystSearchQuery('')} className="absolute right-2 top-2.5 text-gray-400 hover:text-white">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-md">
              <table className="w-full text-left text-[11px] text-gray-700 dark:text-gray-300 border-collapse">
                <thead className="bg-gray-100 dark:bg-[#192238] text-gray-600 dark:text-gray-300 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Analista</th>
                    <th className="py-2.5 px-3 text-center">Total Casos</th>
                    <th className="py-2.5 px-3 text-center text-emerald-600">SLA Normal</th>
                    <th className="py-2.5 px-3 text-center text-amber-500">SLA Alerta</th>
                    <th className="py-2.5 px-3 text-center text-red-500">SLA Violado</th>
                    <th className="py-2.5 px-3 text-center">Progresso</th>
                    <th className="py-2.5 px-3 text-center">Pendenciado</th>
                    <th className="py-2.5 px-3 text-center">N2</th>
                    <th className="py-2.5 px-3 text-center">Triagem</th>
                    <th className="py-2.5 px-3 text-center">Reaberto</th>
                    <th className="py-2.5 px-3 text-center">Tempo Médio</th>
                    <th className="py-2.5 px-3 text-center">Prioritários</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {analystsRanking.map((ranking) => {
                    const isSelected = selectedAnalystName === ranking.name;
                    return (
                      <tr
                        key={ranking.name}
                        onClick={() => setSelectedAnalystName(ranking.name)}
                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/25 border-l-4 border-brand-blue dark:border-blue-500' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {isSelected && <UserCheck size={12} className="text-brand-blue dark:text-blue-400" />}
                          {ranking.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-gray-900 dark:text-white">{ranking.total}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">{ranking.normal}</td>
                        <td className="py-2.5 px-3 text-center text-amber-500 font-bold">{ranking.alerta}</td>
                        <td className="py-2.5 px-3 text-center text-red-500 font-extrabold">{ranking.violado}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{ranking.progresso}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{ranking.pendenciado}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{ranking.n2}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{ranking.triagem}</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{ranking.reaberto}</td>
                        <td className="py-2.5 px-3 text-center text-gray-800 dark:text-gray-300 font-bold">{ranking.avgConclusao}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-sm text-[10px] font-bold">
                            {ranking.prioritarios}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* INDIVIDUAL ANALYST PORTRAIT (DRILL-DOWN) */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-3">
              <div>
                <h4 className="text-xs font-bold text-brand-blue dark:text-white uppercase flex items-center gap-1.5">
                  <UserCheck size={14} className="text-brand-blue dark:text-blue-400" />
                  Detalhamento de Carteira Individual: {selectedAnalystDetail.name}
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Indicadores, volumetria diária, atividades e pendências críticas sob responsabilidade exclusiva deste analista</p>
              </div>
              <span className="bg-blue-50 dark:bg-[#192238] border border-blue-200 dark:border-blue-900 text-[#001E62] dark:text-blue-400 text-[10px] font-black px-3 py-1 rounded-md uppercase">
                Ficha Analista Selecionado
              </span>
            </div>

            {/* Individual KPIs row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Total Carteira</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{selectedAnalystDetail.total}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-emerald-600 font-bold uppercase">SLA Normal</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{selectedAnalystDetail.normal}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-amber-500 font-bold uppercase">SLA Alerta</p>
                <p className="text-xl font-black text-amber-500 mt-1">{selectedAnalystDetail.alerta}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-red-500 font-bold uppercase">SLA Violados</p>
                <p className="text-xl font-black text-red-500 mt-1">{selectedAnalystDetail.violados}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Tempo Médio</p>
                <p className="text-md font-black text-[#001E62] dark:text-blue-300 mt-1.5">{selectedAnalystDetail.avgConclusao}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-red-500 font-bold uppercase">Maior Atraso</p>
                <p className="text-sm font-black text-red-600 dark:text-red-400 mt-1.5 truncate" title={selectedAnalystDetail.maxAtraso}>
                  {selectedAnalystDetail.maxAtraso}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-[#192238]/60 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Prioritários</p>
                <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{selectedAnalystDetail.prioritarios}</p>
              </div>
            </div>

            {/* Layout divided into Left (Statuses & Activities) and Right (Evolution Graph) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Left col - Statuses and Activities (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Status distribution list */}
                <div className="bg-gray-50 dark:bg-[#192238]/30 border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                  <h5 className="font-bold text-[11px] text-gray-800 dark:text-white uppercase mb-2.5 border-b border-gray-100 dark:border-gray-800 pb-1">
                    STATUS DOS CASOS DE {selectedAnalystDetail.name}
                  </h5>
                  <div className="space-y-2.5">
                    {Object.entries(selectedAnalystDetail.statuses).map(([st, val]) => {
                      const vals = Object.values(selectedAnalystDetail.statuses) as number[];
                      const maxStVal = Math.max(...vals) || 1;
                      const widthPct = ((val as number) / maxStVal) * 100;
                      return (
                        <div key={st} className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-600 dark:text-gray-300 w-28 uppercase text-[10px]">{st}</span>
                          <div className="flex-1 mx-3 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden relative">
                            <div style={{ width: `${widthPct}%` }} className="h-full bg-blue-500 rounded-full" />
                          </div>
                          <span className="font-black text-gray-900 dark:text-white w-5 text-right">{val}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Activities distribution list */}
                <div className="bg-gray-50 dark:bg-[#192238]/30 border border-gray-100 dark:border-gray-800 rounded-lg p-3">
                  <h5 className="font-bold text-[11px] text-gray-800 dark:text-white uppercase mb-2.5 border-b border-gray-100 dark:border-gray-800 pb-1">
                    DISTRIBUIÇÃO DE ATIVIDADES DE {selectedAnalystDetail.name}
                  </h5>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {selectedAnalystDetail.activities.length === 0 ? (
                      <p className="text-gray-400 text-xs italic">Nenhuma atividade sob responsabilidade deste analista.</p>
                    ) : (
                      selectedAnalystDetail.activities.map(act => (
                        <div key={act.name} className="flex items-center justify-between text-[11px] bg-white dark:bg-[#192238] border border-gray-100 dark:border-gray-800 p-1 rounded-sm">
                          <span className="font-semibold text-gray-700 dark:text-gray-200 uppercase text-[10px] truncate max-w-64" title={act.name}>
                            {act.name}
                          </span>
                          <span className="font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-sm">
                            {act.count} casos
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right col - Evolution 7 days graph (6 cols) */}
              <div className="lg:col-span-6 bg-gray-50 dark:bg-[#192238]/30 border border-gray-100 dark:border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <h5 className="font-bold text-[11px] text-gray-800 dark:text-white uppercase mb-1 border-b border-gray-100 dark:border-gray-800 pb-1">
                    EVOLUÇÃO DOS CASOS (ÚLTIMOS 7 DIAS)
                  </h5>
                  <p className="text-[10px] text-gray-400 mb-3">Histórico de casos Recebidos, Concluídos e Pendentes na carteira individual</p>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedAnalystDetail.evolution} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2c3e50" />
                      <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: '#1e293b', color: '#fff', fontSize: '10px' }} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="recebidos" name="Recebidos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="concluidos" name="Concluidos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pendentes" name="Pendentes" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Violados cases list for selected analyst */}
            <div className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 bg-gray-50/50 dark:bg-[#192238]/20">
              <h5 className="font-bold text-[11px] text-red-600 dark:text-red-400 uppercase mb-2 flex items-center gap-1.5">
                <Flame size={12} />
                Casos Violados na Carteira de {selectedAnalystDetail.name}
              </h5>
              <p className="text-[10px] text-gray-400 mb-2.5">Lista de pendências com o prazo vencido sob a custódia direta deste analista no Salesforce.</p>

              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-[#131b2e]">
                <table className="w-full text-left text-[11px] text-gray-700 dark:text-gray-300 border-collapse">
                  <thead className="bg-gray-100 dark:bg-[#192238] text-gray-600 dark:text-gray-300 uppercase font-bold border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-2 px-3">ID Caso</th>
                      <th className="py-2 px-3">Atividade / Demanda</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Prioridade</th>
                      <th className="py-2 px-3 text-center">Tempo Atraso</th>
                      <th className="py-2 px-3">Abertura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selectedAnalystDetail.casesViolated.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-emerald-600 font-bold italic text-xs">
                          Parabéns! Nenhuma pendência com SLA violado para {selectedAnalystDetail.name}.
                        </td>
                      </tr>
                    ) : (
                      selectedAnalystDetail.casesViolated.map(item => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedCaseModal(item)}
                          className="hover:bg-red-50/30 dark:hover:bg-red-950/10 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-3 font-bold text-gray-900 dark:text-white">{item.id}</td>
                          <td className="py-2 px-3 font-semibold">{item.atividade}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold text-amber-500">{item.status}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase ${
                              item.prioridade === 'Crítica' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                            }`}>
                              {item.prioridade}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-extrabold text-red-600 dark:text-red-400">
                            {item.tempoRestanteAtraso}
                          </td>
                          <td className="py-2 px-3 text-gray-500">{item.dataAbertura}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== MODAL: DRILL-DOWN DETALHADO DO CASO ======================== */}
      {selectedCaseModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-150">
            {/* Header */}
            <div className="bg-gray-100 dark:bg-[#192238] px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-brand-blue dark:bg-blue-600 text-white font-black text-xs px-2.5 py-1 rounded-md">
                  {selectedCaseModal.id}
                </span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase">
                  Detalhamento do Caso Salesforce
                </h4>
              </div>
              <button 
                onClick={() => setSelectedCaseModal(null)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs text-gray-800 dark:text-gray-200">
              
              {/* Detailed Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-[#192238]/30 border border-gray-100 dark:border-gray-800 p-4 rounded-xl font-medium">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Atividade</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{selectedCaseModal.atividade}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Fila de Atendimento</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{selectedCaseModal.fila}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Analista de Custódia</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{selectedCaseModal.analista}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Status Atual</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-sm bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 font-bold uppercase text-[10px]">
                    {selectedCaseModal.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Prioridade</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-xs text-[9px] font-bold uppercase bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                    {selectedCaseModal.prioridade}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Estado do SLA</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-sm text-[10px] font-extrabold ${
                    selectedCaseModal.sla === 'Violado' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 animate-pulse' 
                      : selectedCaseModal.sla === 'Alerta'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                  }`}>
                    {selectedCaseModal.sla}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Data de Abertura</p>
                  <p className="text-gray-950 dark:text-gray-100 mt-0.5 font-bold">{selectedCaseModal.dataAbertura}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Última Atualização</p>
                  <p className="text-gray-950 dark:text-gray-100 mt-0.5 font-bold">{selectedCaseModal.ultimaAtualizacao}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Tempo Restante / Atraso</p>
                  <p className={`text-sm font-black mt-0.5 ${selectedCaseModal.sla === 'Violado' ? 'text-red-600' : 'text-amber-500'}`}>
                    {selectedCaseModal.tempoRestanteAtraso}
                  </p>
                </div>
              </div>

              {/* AUDIT LOG TIMELINE */}
              <div className="space-y-2.5">
                <h5 className="font-bold text-[11px] text-[#001E62] dark:text-white uppercase tracking-wider">
                  HISTÓRICO DE AUDITORIA & ATIVIDADES DO CASO
                </h5>
                
                <div className="border-l-2 border-gray-200 dark:border-gray-800 pl-4 ml-1.5 space-y-4">
                  {selectedCaseModal.historico.map((log, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline node */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-blue border-2 border-white dark:border-slate-900" />
                      
                      <div className="space-y-0.5 bg-gray-50 dark:bg-[#192238]/20 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-gray-900 dark:text-white uppercase">{log.acao}</span>
                          <span className="text-gray-400 font-semibold">{log.data}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                          Executado por: <strong className="text-brand-blue dark:text-blue-400">{log.usuario}</strong>
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 font-medium italic">
                          "{log.detalhes}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-[#192238] px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button 
                onClick={() => setSelectedCaseModal(null)}
                className="px-4 py-1.5 bg-[#001E62] text-white hover:bg-[#001543] text-xs font-bold rounded-md transition-all cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
