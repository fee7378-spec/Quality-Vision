import { useMemo } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore, matchesFilter } from '../store/useStore';
import { MultiSelectDropdown } from './MultiSelectDropdown';

export const Header = () => {
  const location = useLocation();
  const { 
    data, 
    productivityData,
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
    resetToCurrentMonth 
  } = useStore();

  const getTitleNode = () => {
    switch (location.pathname) {
      case '/':
        return (
          <>
            DASHBOARD <span className="text-[#001E62] font-extrabold">OVERVIEW</span>
          </>
        );
      case '/operacao':
        return 'OPERATION DEMANDS';
      case '/capacidade':
        return 'CAPACITY & PROJECTION';
      case '/analise':
        return 'OPERACIONAL QUALITY';
      case '/analistas':
        return 'ANALYSTS VIEW';
      case '/metricas':
        return 'MÉTRICAS DAS ESTEIRAS';
      case '/history':
        return 'HISTÓRICO DE ERROS';
      case '/import':
        return 'DATA HUB';
      default:
        return (
          <>
            DASHBOARD <span className="text-[#001E62] font-extrabold">OVERVIEW</span>
          </>
        );
    }
  };

  // Base list of all unique Esteiras
  const availableEsteiras = useMemo(() => {
    const setE = new Set<string>();
    data.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    productivityData.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    return ['TODAS', ...Array.from(setE).sort()];
  }, [data, productivityData]);

  // Interdependent (Cascading) dropdown filters
  const availableFormas = useMemo(() => {
    let items = data.filter(i => matchesFilter(selectedEsteira, i.Esteira, 'TODAS'));
    const setF = new Set<string>(items.map(i => i.FormaMonitoria).filter(Boolean));
    return ['TODAS', ...Array.from(setF).sort()];
  }, [data, selectedEsteira]);

  const availableMacros = useMemo(() => {
    let items = data.filter(i => 
      matchesFilter(selectedEsteira, i.Esteira, 'TODAS') && 
      matchesFilter(selectedForma, i.FormaMonitoria, 'TODAS')
    );
    const setM = new Set<string>(items.map(i => i.MotivoMacro).filter(Boolean));
    return ['TODOS', ...Array.from(setM).sort()];
  }, [data, selectedEsteira, selectedForma]);

  const availableTags = useMemo(() => {
    let items = data.filter(i => 
      matchesFilter(selectedEsteira, i.Esteira, 'TODAS') && 
      matchesFilter(selectedForma, i.FormaMonitoria, 'TODAS') &&
      matchesFilter(selectedMacro, i.MotivoMacro, 'TODOS')
    );
    const setT = new Set<string>(items.map(i => i.Tag).filter(Boolean));
    return ['TODAS', ...Array.from(setT).sort()];
  }, [data, selectedEsteira, selectedForma, selectedMacro]);

  const path = location.pathname;
  const showFilters = path !== '/import';

  // Specific visibility per page
  const showPeriodFilter = path === '/' || path === '/operacao' || path === '/capacidade' || path === '/parametros' || path === '/analise' || path === '/analistas' || path === '/history';
  const showFormaFilter = path === '/' || path === '/analise' || path === '/history';
  const showEsteiraFilter = path === '/' || path === '/operacao' || path === '/capacidade' || path === '/parametros' || path === '/analise' || path === '/analistas' || path === '/history';
  const showSearchAnalyst = path === '/analistas' || path === '/history';

  const hasAnyFilter = showPeriodFilter || showFormaFilter || showEsteiraFilter || showSearchAnalyst;

  return (
    <header className="bg-white border-b border-gray-200 min-h-16 py-2 px-6 flex flex-wrap items-center justify-between gap-3 text-gray-800 z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-black tracking-wider text-brand-blue uppercase whitespace-nowrap">
          {getTitleNode()}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showFilters && hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-2.5 bg-white border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-800">
            {/* Search Input for Gestão de Analistas / Histórico */}
            {showSearchAnalyst && (
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Pesquisar por analista, código..."
                  value={analystSearchQuery}
                  onChange={(e) => setAnalystSearchQuery(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-md pl-8 pr-7 py-1 text-xs text-gray-900 outline-none focus:border-brand-blue-dark w-52 md:w-64"
                />
                {analystSearchQuery && (
                  <button 
                    onClick={() => setAnalystSearchQuery('')} 
                    className="absolute right-2 text-gray-500 hover:text-gray-900"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {showSearchAnalyst && showEsteiraFilter && (
              <div className="h-4 w-px bg-gray-100 mx-1" />
            )}

            {/* Period Filter */}
            {showPeriodFilter && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-semibold text-[11px] uppercase">Período:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 outline-none focus:border-[#001E62] transition-colors cursor-pointer"
                />
                <span className="text-gray-400 text-[11px]">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-900 outline-none focus:border-[#001E62] transition-colors cursor-pointer"
                />
              </div>
            )}

            {showPeriodFilter && (showFormaFilter || showEsteiraFilter) && (
              <div className="h-4 w-px bg-gray-100 hidden sm:block mx-1" />
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
              <div className="h-4 w-px bg-gray-100 hidden md:block mx-1" />
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

        {/* Refresh / Reset Button */}
        <button
          onClick={resetToCurrentMonth}
          className="flex items-center justify-center bg-white text-brand-blue border border-brand-blue p-2 rounded-md hover:bg-brand-blue hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm shadow-[#001E62]/20 font-bold"
          title="Resetar filtros e voltar para o Mês Atual"
        >
          <RefreshCw size={15} className="stroke-[2.5]" />
        </button>
      </div>
    </header>
  );
};
