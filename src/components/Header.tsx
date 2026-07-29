import { useMemo } from 'react';
import { RefreshCw, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const Header = () => {
  const location = useLocation();
  const { 
    data, 
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
    resetToCurrentMonth 
  } = useStore();

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/analise': return 'Análise & Evolução';
      case '/analistas': return 'Analistas';
      case '/import': return 'Importar Base';
      default: return 'Dashboard';
    }
  };

  const availableTags = useMemo(() => ['TODAS', ...Array.from(new Set(data.map(item => item.Tag).filter(Boolean)))], [data]);
  const availableMacros = useMemo(() => ['TODOS', ...Array.from(new Set(data.map(item => item.MotivoMacro).filter(Boolean)))], [data]);
  const availableEsteiras = useMemo(() => ['TODAS', ...Array.from(new Set(data.map(item => item.Esteira).filter(Boolean)))], [data]);

  const showFilters = location.pathname !== '/import';

  return (
    <header className="bg-black border-b border-zinc-800 min-h-16 py-2 px-6 flex flex-wrap items-center justify-between gap-3 text-zinc-200 z-40">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-extrabold text-white tracking-wide uppercase whitespace-nowrap">{getTitle()}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200">
            {/* Period Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[11px] uppercase">Período:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffff00]"
              />
              <span className="text-zinc-500 text-[11px]">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffff00]"
              />
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block mx-1" />

            {/* Forma Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[11px] uppercase">Forma:</span>
              <select
                value={selectedForma}
                onChange={(e) => setSelectedForma(e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffff00]"
              >
                <option value="TODAS">TODAS</option>
                <option value="Qualidade Interfile">Qualidade Interfile</option>
                <option value="Estudo">Estudo</option>
              </select>
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden md:block mx-1" />

            {/* Esteira Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[11px] uppercase">Esteira:</span>
              <select
                value={selectedEsteira}
                onChange={(e) => setSelectedEsteira(e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffff00]"
              >
                {availableEsteiras.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden md:block mx-1" />

            {/* Tag Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[11px] uppercase">TAG:</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffff00] max-w-[130px] truncate"
              >
                {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden lg:block mx-1" />

            {/* Macro Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold text-[11px] uppercase">Macro:</span>
              <select
                value={selectedMacro}
                onChange={(e) => setSelectedMacro(e.target.value)}
                className="bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#ffff00] max-w-[130px] truncate"
              >
                {availableMacros.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Refresh / Reset Button */}
        <button
          onClick={resetToCurrentMonth}
          className="flex items-center justify-center bg-[#ffff00] text-black p-2 rounded-xl hover:bg-[#e6e600] active:scale-95 transition-all cursor-pointer shadow-sm shadow-[#ffff00]/20"
          title="Resetar filtros e voltar para o Mês Atual"
        >
          <RefreshCw size={15} className="stroke-[2.5]" />
        </button>

        <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-[#ffff00] flex-shrink-0">
          <User size={16} />
        </div>
      </div>
    </header>
  );
};
