import { useMemo } from 'react';
import { RefreshCw, Search, X, Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore, matchesFilter, matchesFormaFilter, getFormaFromItem, getVal } from '../store/useStore';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { useThemeStore } from '../store/useThemeStore';

export const Header = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();

  const { 
    data, 
    monitorias,
    monitoriaErros,
    productivityData,
    volumetriaTipoDeDemanda,
    volumetria,
    startDate, 
    endDate, 
    setStartDate, 
    setEndDate,
    selectedTag,
    setSelectedTag,
    selectedMacro,
    setSelectedMacro,
    selectedEsteira,
    setSelectedEsteira,
    selectedForma,
    setSelectedForma,
    analystSearchQuery,
    setAnalystSearchQuery,
    resetToCurrentMonth,
    fetchSupabaseData
  } = useStore();

  const handleRefresh = () => {
    resetToCurrentMonth();
    fetchSupabaseData();
  };


  const getTitleNode = () => {
    switch (location.pathname) {
      case '/':
        return (
          <>
            PAINEL <span className="text-[#001E62] dark:text-white font-extrabold">GERAL</span>
          </>
        );
      case '/operacao':
        return 'OPERAÇÃO / ESTEIRAS';
      case '/capacidade':
        return 'CAPACIDADE & SIMULAÇÃO';
      case '/analise':
        return 'QUALIDADE OPERACIONAL';
      case '/analistas':
        return 'VISUAL DE ANALISTAS';
      case '/metricas':
        return 'MÉTRICAS DAS ESTEIRAS';
      case '/history':
        return 'HISTÓRICO DE ERROS';
      case '/salesforce':
        return 'SALESFORCE / CASOS';
      case '/settings':
        return 'CONFIGURAÇÕES DO SISTEMA';
      case '/import_removed':
        return 'DATA HUB';
      default:
        return (
          <>
            DASHBOARD <span className="text-[#001E62] dark:text-white font-extrabold">OVERVIEW</span>
          </>
        );
    }
  };

  // Base list of all unique Esteiras
  const availableEsteiras = useMemo(() => {
    const setE = new Set<string>();
    data.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    productivityData.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    (volumetriaTipoDeDemanda || []).forEach(item => {
      const e = item.esteira || item.Esteira;
      if (e) setE.add(e);
    });
    (volumetria || []).forEach(item => {
      const e = item.esteira || item.Esteira;
      if (e) setE.add(e);
    });
    return ['TODAS', ...Array.from(setE).sort()];
  }, [data, productivityData, volumetriaTipoDeDemanda, volumetria]);

  // Interdependent (Cascading) dropdown filters
  const availableFormas = useMemo(() => {
    let items = data.filter(i => matchesFilter(selectedEsteira, i.Esteira, 'TODAS'));
    const setF = new Set<string>();
    items.forEach(i => {
      const forma = getFormaFromItem(i);
      if (forma && forma.trim()) setF.add(forma.trim());
    });
    if (monitoriaErros && monitoriaErros.length > 0) {
      monitoriaErros.forEach(e => {
        if (matchesFilter(selectedEsteira, getVal(e, 'esteira'), 'TODAS')) {
          const forma = getFormaFromItem(e);
          if (forma && forma.trim()) setF.add(forma.trim());
        }
      });
    }
    if (monitorias && monitorias.length > 0) {
      monitorias.forEach(m => {
        if (matchesFilter(selectedEsteira, getVal(m, 'esteira'), 'TODAS')) {
          const forma = getFormaFromItem(m);
          if (forma && forma.trim()) setF.add(forma.trim());
        }
      });
    }
    return ['TODAS', ...Array.from(setF).filter(Boolean).sort()];
  }, [data, monitorias, monitoriaErros, selectedEsteira]);

  const availableMacros = useMemo(() => {
    let items = data.filter(i => 
      matchesFilter(selectedEsteira, i.Esteira, 'TODAS') && 
      matchesFormaFilter(selectedForma, i)
    );
    const setM = new Set<string>(items.map(i => i.MotivoMacro).filter(Boolean));
    if (monitoriaErros && monitoriaErros.length > 0) {
      monitoriaErros.forEach(e => {
        if (matchesFilter(selectedEsteira, getVal(e, 'esteira'), 'TODAS') && matchesFormaFilter(selectedForma, e)) {
          const macro = getVal(e, 'macroTag');
          if (macro && String(macro).trim() && String(macro).toLowerCase() !== 'null') setM.add(String(macro).trim());
        }
      });
    }
    return ['TODOS', ...Array.from(setM).sort()];
  }, [data, monitoriaErros, selectedEsteira, selectedForma]);

  const availableTags = useMemo(() => {
    let items = data.filter(i => 
      matchesFilter(selectedEsteira, i.Esteira, 'TODAS') && 
      matchesFormaFilter(selectedForma, i) &&
      matchesFilter(selectedMacro, i.MotivoMacro, 'TODOS')
    );
    const setT = new Set<string>(items.map(i => i.Tag).filter(Boolean));
    if (monitoriaErros && monitoriaErros.length > 0) {
      monitoriaErros.forEach(e => {
        if (
          matchesFilter(selectedEsteira, getVal(e, 'esteira'), 'TODAS') && 
          matchesFormaFilter(selectedForma, e) &&
          matchesFilter(selectedMacro, getVal(e, 'macroTag'), 'TODOS')
        ) {
          const tag = getVal(e, 'tag');
          if (tag && String(tag).trim()) setT.add(String(tag).trim());
        }
      });
    }
    return ['TODAS', ...Array.from(setT).sort()];
  }, [data, monitoriaErros, selectedEsteira, selectedForma, selectedMacro]);

  const path = location.pathname;
  const showFilters = path !== '/import';

  // Specific visibility per page
  const showPeriodFilter = path === '/' || path === '/operacao' || path === '/capacidade' || path === '/parametros' || path === '/analise' || path === '/analistas' || path === '/history' || path === '/salesforce';
  const showFormaFilter = path === '/' || path === '/analise' || path === '/history';
  const showEsteiraFilter = path === '/' || path === '/operacao' || path === '/capacidade' || path === '/parametros' || path === '/analise' || path === '/analistas' || path === '/history' || path === '/salesforce';
  const showSearchAnalyst = path === '/analistas' || path === '/history';

  const hasAnyFilter = showPeriodFilter || showFormaFilter || showEsteiraFilter || showSearchAnalyst;

  return (
    <header className="bg-white dark:bg-[#131b2e] border-b border-gray-200 dark:border-gray-800 min-h-16 py-2 px-6 flex flex-wrap items-center justify-between gap-3 text-gray-800 dark:text-white z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-black tracking-wider text-brand-blue dark:text-white uppercase whitespace-nowrap">
          {getTitleNode()}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showFilters && hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-[#192238] border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200">
            {/* Search Input for Gestão de Analistas / Histórico */}
            {showSearchAnalyst && (
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-gray-500 dark:text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por analista, código..."
                  value={analystSearchQuery}
                  onChange={(e) => setAnalystSearchQuery(e.target.value)}
                  className="bg-gray-50 dark:bg-[#131b2e] border border-gray-200 dark:border-gray-700 rounded-md pl-8 pr-7 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-blue-dark dark:focus:border-blue-400 w-52 md:w-64"
                />
                {analystSearchQuery && (
                  <button 
                    onClick={() => setAnalystSearchQuery('')} 
                    className="absolute right-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {showSearchAnalyst && showEsteiraFilter && (
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
            )}

            {/* Period Filter */}
            {showPeriodFilter && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 dark:text-gray-400 font-semibold text-[11px] uppercase">Período:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 dark:bg-[#131b2e] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-[#001E62] dark:focus:border-blue-400 transition-colors cursor-pointer"
                />
                <span className="text-gray-400 dark:text-gray-500 text-[11px]">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50 dark:bg-[#131b2e] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs text-gray-900 dark:text-white outline-none focus:border-[#001E62] dark:focus:border-blue-400 transition-colors cursor-pointer"
                />
              </div>
            )}

            {showPeriodFilter && (showFormaFilter || showEsteiraFilter) && (
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block mx-1" />
            )}

            {/* Forma Filter */}
            {showFormaFilter && (
              <MultiSelectDropdown
                label="Forma"
                options={availableFormas}
                selected={selectedForma}
                onChange={setSelectedForma}
                defaultOption="TODAS"
              />
            )}

            {showFormaFilter && showEsteiraFilter && (
              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden md:block mx-1" />
            )}

            {/* Esteira Filter */}
            {showEsteiraFilter && (
              <MultiSelectDropdown
                label="Esteira"
                options={availableEsteiras}
                selected={selectedEsteira}
                onChange={setSelectedEsteira}
                defaultOption="TODAS"
              />
            )}
          </div>
        )}

        {/* Theme Toggle & Refresh / Reset Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center bg-white text-[#001E62] border border-gray-200 hover:bg-gray-100 dark:bg-[#192238] dark:text-yellow-400 dark:border-[#243049] dark:hover:bg-[#243049] p-2 rounded-md active:scale-95 transition-all cursor-pointer shadow-2xs font-bold"
            title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center justify-center bg-white text-[#001E62] border border-gray-200 hover:bg-gray-100 dark:bg-[#192238] dark:text-blue-400 dark:border-[#243049] dark:hover:bg-[#243049] p-2 rounded-md active:scale-95 transition-all cursor-pointer shadow-2xs font-bold"
            title="Resetar filtros e atualizar dados do banco"
          >
            <RefreshCw size={15} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
};
