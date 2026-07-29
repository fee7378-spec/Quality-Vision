import { useState, useMemo } from 'react';
import { 
  Users, Search, Clock, ChevronRight, Activity, X 
} from 'lucide-react';
import { useStore, MonitoringItem } from '../store/useStore';

interface AnalystSummary {
  codigo: string;
  nome: string;
  supervisor: string;
  esteiras: string[];
  totalMonitorias: number;
  totalErros: number;
  qualidadePct: number;
  reincidencias: number;
  tagsReincidentes: string[];
  mediaDiasEntreErros: number;
  score: number;
  nivelScore: 'Insuperável' | 'Excelente' | 'Atencioso' | 'Crítico';
  dataUltimoFeedback: string;
  items: MonitoringItem[];
}

export const AnalistasPage = () => {
  const { 
    data, 
    startDate, 
    endDate, 
    selectedTag, 
    selectedMacro, 
    selectedEsteira, 
    resetToCurrentMonth 
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnalyst, setSelectedAnalyst] = useState<AnalystSummary | null>(null);

  // Filter raw data by store filters
  const filteredRawData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      if (selectedTag !== 'TODAS' && item.Tag !== selectedTag) return false;
      if (selectedMacro !== 'TODOS' && item.MotivoMacro !== selectedMacro) return false;
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedTag, selectedMacro, selectedEsteira]);

  // Group all filtered data by Analyst name/code
  const analystsList = useMemo(() => {
    const map: Record<string, MonitoringItem[]> = {};

    filteredRawData.forEach(item => {
      const key = item.NomeAnalista || 'ANALISTA DESCONHECIDO';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    return Object.entries(map).map(([nome, items]): AnalystSummary => {
      const codigo = items[0]?.CodigoAnalista || 'MAT-000';
      const supervisor = items[0]?.NomeSupervisor || 'SUPERVISOR GENERAL';
      const esteiras = Array.from(new Set(items.map(i => i.Esteira))).filter(Boolean);
      
      const totalMonitorias = items.length;
      const erros = items.filter(i => i.Erro === '0');
      const totalErros = erros.length;
      const qualidadePct = totalMonitorias > 0 ? Number((((totalMonitorias - totalErros) / totalMonitorias) * 100).toFixed(1)) : 100;

      // Reincidências
      const tagCount: Record<string, number> = {};
      let reincidencias = 0;
      erros.forEach(e => {
        const tag = e.Tag || 'Geral';
        tagCount[tag] = (tagCount[tag] || 0) + 1;
        if (tagCount[tag] > 1) reincidencias += 1;
      });

      const tagsReincidentes = Object.entries(tagCount)
        .filter(([_, count]) => count > 1)
        .map(([tag]) => tag);

      // Intervalo médio entre erros (dias)
      const errorDates = erros
        .map(e => e.DataMonitoria)
        .filter(Boolean)
        .sort();

      let mediaDiasEntreErros = 0;
      if (errorDates.length >= 2) {
        let totalDays = 0;
        for (let i = 1; i < errorDates.length; i++) {
          const d1 = new Date(errorDates[i - 1]).getTime();
          const d2 = new Date(errorDates[i]).getTime();
          const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
          totalDays += diffDays;
        }
        mediaDiasEntreErros = Math.round(totalDays / (errorDates.length - 1));
      } else if (errorDates.length === 1) {
        mediaDiasEntreErros = 30; // 30 dias de sustentação com 1 único erro
      } else {
        mediaDiasEntreErros = 60; // 60+ dias sem nenhum erro
      }

      // Score do Analista (0 - 100)
      // Qualidade (60%) + Ausência de Reincidência (20%) + Sustentação entre erros (20%)
      const scoreQualidade = qualidadePct * 0.6;
      const scoreReincidencia = Math.max(0, 20 - (reincidencias * 5));
      const scoreDias = Math.min(20, (mediaDiasEntreErros / 30) * 20);
      const score = Math.min(100, Math.round(scoreQualidade + scoreReincidencia + scoreDias));

      let nivelScore: 'Insuperável' | 'Excelente' | 'Atencioso' | 'Crítico' = 'Atencioso';
      if (score >= 95) nivelScore = 'Insuperável';
      else if (score >= 80) nivelScore = 'Excelente';
      else if (score >= 65) nivelScore = 'Atencioso';
      else nivelScore = 'Crítico';

      // Feedback date
      const feedbackDates = items
        .map(i => i.DataFeedback)
        .filter(f => f && f.trim() !== '')
        .sort();
      const dataUltimoFeedback = feedbackDates.length > 0 ? feedbackDates[feedbackDates.length - 1] : 'Sem registro';

      return {
        codigo,
        nome,
        supervisor,
        esteiras,
        totalMonitorias,
        totalErros,
        qualidadePct,
        reincidencias,
        tagsReincidentes,
        mediaDiasEntreErros,
        score,
        nivelScore,
        dataUltimoFeedback,
        items: items.sort((a, b) => (b.DataMonitoria || '').localeCompare(a.DataMonitoria || ''))
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [data]);

  const filteredAnalysts = useMemo(() => {
    if (!searchTerm.trim()) return analystsList;
    const term = searchTerm.toLowerCase();
    return analystsList.filter(a => 
      a.nome.toLowerCase().includes(term) || 
      a.codigo.toLowerCase().includes(term) ||
      a.supervisor.toLowerCase().includes(term)
    );
  }, [analystsList, searchTerm]);

  const getScoreBadgeColor = (nivel: string) => {
    switch (nivel) {
      case 'Insuperável': return 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
      case 'Excelente': return 'bg-yellow-950/80 text-[#ffff00] border-[#ffff00]/60';
      case 'Atencioso': return 'bg-amber-950/80 text-amber-400 border-amber-800';
      case 'Crítico': return 'bg-red-950/80 text-red-400 border-red-800';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black p-8 space-y-8 text-zinc-100">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Analistas</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {analystsList.length} analista(s) gravado(s) e monitorado(s) na base ativa
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula ou supervisor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#ffff00] outline-none"
          />
        </div>
      </div>

      {/* Analysts Horizontal List */}
      <div className="flex flex-col gap-4">
        {filteredAnalysts.length > 0 ? (
          filteredAnalysts.map(analyst => (
            <div
              key={analyst.codigo + analyst.nome}
              onClick={() => setSelectedAnalyst(analyst)}
              className="w-full bg-zinc-900 border border-zinc-800 hover:border-[#ffff00] p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-[#ffff00]/5 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-6 group"
            >
              {/* Left: Avatar & Info - Fixed Width for Perfect Alignment */}
              <div className="flex items-center gap-3.5 w-full lg:w-[340px] shrink-0 overflow-hidden">
                <div className="w-11 h-11 rounded-xl bg-black border border-zinc-800 flex items-center justify-center font-bold text-sm text-[#ffff00] group-hover:border-[#ffff00] transition-colors flex-shrink-0">
                  {analyst.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#ffff00] transition-colors truncate" title={analyst.nome}>
                    {analyst.nome}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                    <span className="shrink-0">{analyst.codigo}</span>
                    <span>•</span>
                    <span className="truncate" title={`Sup: ${analyst.supervisor}`}>Sup: {analyst.supervisor}</span>
                  </div>
                </div>
              </div>

              {/* Middle: Horizontal Metrics Bar - Fixed Standard Width */}
              <div className="w-full lg:w-[480px] shrink-0 bg-black border border-zinc-800/80 px-4 py-2.5 rounded-xl grid grid-cols-5 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Monitorias</p>
                  <p className="text-sm font-bold text-white mt-0.5">{analyst.totalMonitorias}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Qualidade</p>
                  <p className="text-sm font-bold text-[#ffff00] mt-0.5">{analyst.qualidadePct}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Erros</p>
                  <p className="text-sm font-bold text-white mt-0.5">{analyst.totalErros}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Reincidência</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5">{analyst.reincidencias}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Freq. Erro</p>
                  <p className="text-sm font-bold text-zinc-300 mt-0.5">~{analyst.mediaDiasEntreErros}d</p>
                </div>
              </div>

              {/* Right: Score & Detalhes Button */}
              <div className="w-full lg:w-auto lg:flex-1 shrink-0 flex items-center justify-between lg:justify-end gap-3 border-t lg:border-t-0 border-zinc-800/60 pt-3 lg:pt-0">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getScoreBadgeColor(analyst.nivelScore)}`}>
                  {analyst.score} pts ({analyst.nivelScore})
                </span>
                <span className="flex items-center gap-1.5 text-[#ffff00] font-semibold text-xs group-hover:translate-x-1 transition-transform bg-black border border-zinc-800 px-3.5 py-2 rounded-xl">
                  Ver Detalhes <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full bg-zinc-900 border border-zinc-800 p-12 rounded-2xl text-center space-y-3">
            <Users size={40} className="mx-auto text-zinc-600" />
            <h3 className="text-lg font-bold text-white">Nenhum analista encontrado</h3>
            <p className="text-xs text-zinc-500">
              Certifique-se de importar a base consolidada na aba <strong className="text-zinc-300">Importar Base</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Analyst Detailed Drawer / Modal */}
      {selectedAnalyst && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto p-8 space-y-8 animate-in slide-in-from-right duration-300 text-zinc-100">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-bold text-xl text-[#ffff00]">
                  {selectedAnalyst.nome.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedAnalyst.nome}</h2>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                    <span>{selectedAnalyst.codigo}</span>
                    <span>•</span>
                    <span>Supervisor: {selectedAnalyst.supervisor}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnalyst(null)}
                className="p-2 text-zinc-400 hover:text-white bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Score & Badge Section */}
            <div className="bg-black border border-zinc-800 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Score do Analista</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-extrabold text-[#ffff00]">{selectedAnalyst.score}</h3>
                  <span className="text-xs text-zinc-500">/ 100 pontos</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold border inline-block ${getScoreBadgeColor(selectedAnalyst.nivelScore)}`}>
                  Nível: {selectedAnalyst.nivelScore}
                </span>
                <p className="text-[10px] text-zinc-500">Baseado em Qualidade, Reincidência e Intervalos</p>
              </div>
            </div>

            {/* Medidor de Intervalo de Erros */}
            <div className="bg-black border border-zinc-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-[#ffff00]" />
                  Medidor de Intervalo de Erros
                </h4>
                <span className="text-xs text-zinc-400 font-mono">
                  Média: <strong className="text-[#ffff00]">{selectedAnalyst.mediaDiasEntreErros} dias</strong> entre erros
                </span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl space-y-2">
                <p className="text-xs text-zinc-300">
                  O analista realiza em média <strong className="text-white">{selectedAnalyst.mediaDiasEntreErros} dias</strong> de operação sustentada sem cometer erros operacionais.
                </p>
              </div>
            </div>

            {/* Lista de Monitorias do Analista */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-[#ffff00]" />
                Histórico de Monitorias ({selectedAnalyst.items.length})
              </h4>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {selectedAnalyst.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      item.Erro === '0' 
                        ? 'bg-red-950/20 border-red-900/60' 
                        : 'bg-black border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-zinc-400">{item.DataMonitoria}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.Erro === '0' 
                          ? 'bg-red-950 border border-red-800 text-red-400' 
                          : 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                      }`}>
                        {item.Erro === '0' ? 'NÃO CONFORME' : 'CONFORME'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-zinc-300">
                      <p><strong className="text-zinc-500">Esteira:</strong> {item.Esteira}</p>
                      <p><strong className="text-zinc-500">TAG:</strong> {item.Tag}</p>
                      <p><strong className="text-zinc-500">Motivo Macro:</strong> {item.MotivoMacro}</p>
                      <p><strong className="text-zinc-500">Forma:</strong> {item.FormaMonitoria}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
