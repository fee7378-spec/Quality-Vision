import { useMemo } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

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
    selectedSupervisor,
    setSelectedSupervisor,
    analystSearchQuery,
    setAnalystSearchQuery,
    resetToCurrentMonth 
  } = useStore();

  const getTitleNode = () => {
    switch (location.pathname) {
      case '/':
        return (
          <>
            DASHBOARD <span className="text-[#FFFF00] font-extrabold">OVERVIEW</span>
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
      case '/import':
        return 'DATA HUB';
      default:
        return (
          <>
            DASHBOARD <span className="text-[#FFFF00] font-extrabold">OVERVIEW</span>
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

  // Unique list of Supervisors
  const availableSupervisors = useMemo(() => {
    const setS = new Set<string>();
    data.forEach(item => {
      const sup = item.NomeSupervisor || item.Supervisor;
      if (sup && String(sup).trim()) setS.add(String(sup).trim().toUpperCase());
    });
    return ['TODOS', ...Array.from(setS).sort()];
  }, [data]);

  // Interdependent (Cascading) dropdown filters
  const availableFormas = useMemo(() => {
    let items = data;
    if (selectedEsteira !== 'TODAS') {
      items = items.filter(i => i.Esteira === selectedEsteira);
    }
    const setF = new Set<string>(items.map(i => i.FormaMonitoria).filter(Boolean));
    return ['TODAS', ...Array.from(setF).sort()];
  }, [data, selectedEsteira]);

  const availableMacros = useMemo(() => {
    let items = data;
    if (selectedEsteira !== 'TODAS') {
      items = items.filter(i => i.Esteira === selectedEsteira);
    }
    if (selectedForma !== 'TODAS') {
      items = items.filter(i => i.FormaMonitoria === selectedForma);
    }
    const setM = new Set<string>(items.map(i => i.MotivoMacro).filter(Boolean));
    return ['TODOS', ...Array.from(setM).sort()];
  }, [data, selectedEsteira, selectedForma]);

  const availableTags = useMemo(() => {
    let items = data;
    if (selectedEsteira !== 'TODAS') {
      items = items.filter(i => i.Esteira === selectedEsteira);
    }
    if (selectedForma !== 'TODAS') {
      items = items.filter(i => i.FormaMonitoria === selectedForma);
    }
    if (selectedMacro !== 'TODOS') {
      items = items.filter(i => i.MotivoMacro === selectedMacro);
    }
    const setT = new Set<string>(items.map(i => i.Tag).filter(Boolean));
    return ['TODAS', ...Array.from(setT).sort()];
  }, [data, selectedEsteira, selectedForma, selectedMacro]);

  const path = location.pathname;
  const showFilters = path !== '/import';

  // Specific visibility per page
  const showPeriodFilter = path === '/' || path === '/operacao' || path === '/capacidade' || path === '/parametros' || path === '/analise';
  const showFormaFilter = path === '/' || path === '/analise';
  const showEsteiraFilter = path === '/' || path === '/operacao' || path === '/capacidade' || path === '/parametros' || path === '/analise' || path === '/analistas';
  const showSearchAnalyst = path === '/analistas';
  const showSupervisorFilter = path === '/' || path === '/analistas' || path === '/analise';

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 min-h-16 py-2 px-6 flex flex-wrap items-center justify-between gap-3 text-zinc-200 z-40">
      <div className="flex items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase whitespace-nowrap">
          {getTitleNode()}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200">
            {/* Search Input for Gestão de Analistas */}
            {showSearchAnalyst && (
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar analista por nome ou código..."
                  value={analystSearchQuery}
                  onChange={(e) => setAnalystSearchQuery(e.target.value)}
                  className="bg-black border border-zinc-800 rounded-md pl-8 pr-7 py-1 text-xs text-white outline-none focus:border-amber-600 w-64 md:w-80"
                />
                {analystSearchQuery && (
                  <button 
                    onClick={() => setAnalystSearchQuery('')} 
                    className="absolute right-2 text-zinc-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {showSearchAnalyst && showEsteiraFilter && (
              <div className="h-4 w-px bg-zinc-800 mx-1" />
            )}

            {/* Period Filter */}
            {showPeriodFilter && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold text-[11px] uppercase">Período:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-black border border-zinc-800 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-600"
                />
                <span className="text-zinc-500 text-[11px]">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-black border border-zinc-800 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-600"
                />
              </div>
            )}

            {showPeriodFilter && (showFormaFilter || showEsteiraFilter) && (
              <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-1" />
            )}

            {/* Forma Filter */}
            {showFormaFilter && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold text-[11px] uppercase">Forma:</span>
                <select
                  value={selectedForma}
                  onChange={(e) => setSelectedForma(e.target.value)}
                  className="bg-black border border-zinc-800 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-600 cursor-pointer"
                >
                  {availableFormas.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}

            {showFormaFilter && showEsteiraFilter && (
              <div className="h-4 w-px bg-zinc-800 hidden md:block mx-1" />
            )}

            {/* Esteira Filter */}
            {showEsteiraFilter && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold text-[11px] uppercase">Esteira:</span>
                <select
                  value={selectedEsteira}
                  onChange={(e) => setSelectedEsteira(e.target.value)}
                  className="bg-black border border-zinc-800 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-600 cursor-pointer max-w-[160px] truncate"
                >
                  {availableEsteiras.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

            {showEsteiraFilter && showSupervisorFilter && (
              <div className="h-4 w-px bg-zinc-800 hidden md:block mx-1" />
            )}

            {/* Supervisor Filter */}
            {showSupervisorFilter && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold text-[11px] uppercase">Supervisor:</span>
                <select
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="bg-black border border-zinc-800 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-600 cursor-pointer max-w-[170px] truncate"
                >
                  {availableSupervisors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Refresh / Reset Button */}
        <button
          onClick={resetToCurrentMonth}
          className="flex items-center justify-center bg-[#FFFF00] text-black p-2 rounded-md hover:bg-[#e6e600] active:scale-95 transition-all cursor-pointer shadow-sm shadow-[#FFFF00]/20 font-bold"
          title="Resetar filtros e voltar para o Mês Atual"
        >
          <RefreshCw size={15} className="stroke-[2.5]" />
        </button>
      </div>
    </header>
  );
};
