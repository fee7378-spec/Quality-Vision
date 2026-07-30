import { useState, useMemo } from 'react';
import { 
  Users, Search, X, AlertTriangle, Layers, BarChart2, CheckCircle2, Info,
  Activity, Award, PieChart as PieChartIcon, Clock, ChevronRight, Briefcase
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LabelList, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { useStore, MonitoringItem, ProductivityItem, normalizeName } from '../store/useStore';

export interface QuadranteInfo {
  nivel: number;
  titulo: string;
  descricao: string;
  colorClass: string;
}

export const getQuadranteForCount = (count: number): QuadranteInfo => {
  if (count <= 0) {
    return {
      nivel: 0,
      titulo: 'Conforme',
      descricao: 'Conforme - Sem erros na mesma TAG',
      colorClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
    };
  }
  if (count === 1) {
    return {
      nivel: 1,
      titulo: '1º Feedback',
      descricao: '1º Feedback',
      colorClass: 'bg-blue-950/90 text-blue-400 border-blue-800'
    };
  }
  if (count === 2) {
    return {
      nivel: 2,
      titulo: '2º Quadrante',
      descricao: '2º Análise de reincidência + lado a lado',
      colorClass: 'bg-amber-950/90 text-amber-400 border-amber-800'
    };
  }
  if (count === 3) {
    return {
      nivel: 3,
      titulo: '3º Quadrante',
      descricao: '3º Feedback formal + Medida disciplinar',
      colorClass: 'bg-orange-950/90 text-orange-400 border-orange-800'
    };
  }
  if (count === 4) {
    return {
      nivel: 4,
      titulo: '4º Quadrante',
      descricao: '4º Avaliação de gestão + Medidas administrativas',
      colorClass: 'bg-red-950/90 text-red-400 border-red-800'
    };
  }
  return {
    nivel: 5,
    titulo: 'Persistência',
    descricao: '+ de 4 erros Persistência',
    colorClass: 'bg-rose-950/90 text-rose-300 border-rose-700 font-extrabold'
  };
};

export interface TagErrorDetail {
  tag: string;
  count: number;
  quadrante: QuadranteInfo;
}

export interface MacroErrorDetail {
  macro: string;
  count: number;
}

export interface AnalystSummary {
  codigo: string;
  nome: string;
  supervisor: string;
  esteiras: string[];
  totalMonitorias: number;
  totalProdutividade: number;
  totalErros: number;
  qualidadePct: number;
  reincidencias: number;
  maxTagErrorCount: number;
  tagsDetalhadas: TagErrorDetail[];
  macrosDetalhados: MacroErrorDetail[];
  score: number;
  scoreFormatted: string;
  maxQuadrante: QuadranteInfo;
  mediaDiasEntreErros: number;
  items: MonitoringItem[];
  prodItems: ProductivityItem[];
}


const DONUT_PALETTE = ['#ffff00', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = payload.value || '';

  const words = value.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word: string) => {
    if ((currentLine + ' ' + word).trim().length <= 12) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="middle" fill="#a1a1aa" fontSize={9} fontWeight="500">
        {lines.slice(0, 3).map((line, index) => (
          <tspan x={0} dy={index === 0 ? 8 : 10} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

export const AnalistasPage = () => {
  const { 
    data, 
    productivityData,
    startDate, 
    endDate, 
    selectedEsteira, 
    selectedForma 
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnalyst, setSelectedAnalyst] = useState<AnalystSummary | null>(null);
  const [popupAnalyst, setPopupAnalyst] = useState<AnalystSummary | null>(null);

  // Helper to test error status for items (considering selectedForma filter for errors)
  const isErrorItem = (item: MonitoringItem) => {
    const errStr = String(item.Erro ?? '').trim().toLowerCase();
    const isErr = 
      errStr === '0' || 
      errStr === '0.0' || 
      errStr.startsWith('0') || 
      errStr.includes('erro') || 
      errStr.includes('não conforme') || 
      errStr.includes('nao conforme') || 
      errStr.includes('falha') || 
      errStr.includes('reprovad') || 
      errStr === 'nc' || 
      errStr === 'n/c' || 
      errStr === 'nok';

    if (!isErr) return false;
    if (selectedForma !== 'TODAS' && item.FormaMonitoria !== selectedForma) return false;
    return true;
  };

  // Filter raw monitoria data by date and esteira
  const filteredRawData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedEsteira]);

  // Filter raw productivity data by date and esteira
  const filteredProdData = useMemo(() => {
    return productivityData.filter(item => {
      if (startDate && item.DataProdutividade && item.DataProdutividade < startDate) return false;
      if (endDate && item.DataProdutividade && item.DataProdutividade > endDate) return false;
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
      return true;
    });
  }, [productivityData, startDate, endDate, selectedEsteira]);

  // Group all filtered data by Analyst name/code
  const analystsList = useMemo(() => {
    const monitoriasMap: Record<string, MonitoringItem[]> = {};
    const prodMap: Record<string, ProductivityItem[]> = {};
    const displayNameMap: Record<string, string> = {};

    filteredRawData.forEach(item => {
      const rawName = item.NomeAnalista ? item.NomeAnalista.trim() : 'ANALISTA DESCONHECIDO';
      const key = normalizeName(rawName);
      if (!key) return;
      if (!monitoriasMap[key]) monitoriasMap[key] = [];
      monitoriasMap[key].push(item);
      if (!displayNameMap[key]) displayNameMap[key] = rawName.toUpperCase();
    });

    filteredProdData.forEach(p => {
      const rawName = p.NomeAnalista ? p.NomeAnalista.trim() : 'ANALISTA DESCONHECIDO';
      const key = normalizeName(rawName);
      if (!key) return;
      if (!prodMap[key]) prodMap[key] = [];
      prodMap[key].push(p);
      if (!displayNameMap[key]) displayNameMap[key] = rawName.toUpperCase();
    });

    const allAnalystKeys = Array.from(new Set([...Object.keys(monitoriasMap), ...Object.keys(prodMap)]));

    return allAnalystKeys.map((key): AnalystSummary => {
      const items = monitoriasMap[key] || [];
      const prodItems = prodMap[key] || [];
      const nome = displayNameMap[key] || key;

      const codigo = items[0]?.CodigoAnalista || 'MAT-000';
      const supervisor = items[0]?.NomeSupervisor || 'SUPERVISOR GERAL';

      const esteirasFromMon = items.map(i => i.Esteira);
      const esteirasFromProd = prodItems.map(p => p.Esteira);
      const esteiras = Array.from(new Set([...esteirasFromMon, ...esteirasFromProd])).filter(Boolean);

      const totalMonitorias = items.length;
      const totalProdutividade = prodItems.reduce((sum, p) => sum + (Number(p.Quantidade) || 1), 0);

      const erros = items.filter(i => isErrorItem(i));
      const totalErros = erros.length;
      const qualidadePct = totalMonitorias > 0 
        ? Number((((totalMonitorias - totalErros) / totalMonitorias) * 100).toFixed(1)) 
        : 100;

      // Reincidências por TAG (mesma TAG)
      const tagCount: Record<string, number> = {};
      let reincidencias = 0;
      erros.forEach(e => {
        const tag = (e.Tag && e.Tag.trim()) ? e.Tag.trim() : 'Outros / Sem TAG';
        tagCount[tag] = (tagCount[tag] || 0) + 1;
        if (tagCount[tag] > 1) reincidencias += 1;
      });

      // Tag com mais erros
      let maxTagErrorCount = 0;
      Object.values(tagCount).forEach(cnt => {
        if (cnt > maxTagErrorCount) maxTagErrorCount = cnt;
      });

      // Detalhamento de cada Tag de Erro
      const tagsDetalhadas: TagErrorDetail[] = Object.entries(tagCount)
        .map(([tag, count]) => ({
          tag,
          count,
          quadrante: getQuadranteForCount(count)
        }))
        .sort((a, b) => b.count - a.count);

      // Erros por Motivo Macro
      const macroCount: Record<string, number> = {};
      erros.forEach(e => {
        const macro = (e.MotivoMacro && e.MotivoMacro.trim()) ? e.MotivoMacro.trim() : 'Outros / Sem Motivo';
        macroCount[macro] = (macroCount[macro] || 0) + 1;
      });
      const macrosDetalhados: MacroErrorDetail[] = Object.entries(macroCount)
        .map(([macro, count]) => ({ macro, count }))
        .sort((a, b) => b.count - a.count);

      // Maior Quadrante alcançado pelo analista
      const maxQuadrante = getQuadranteForCount(maxTagErrorCount);

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
        mediaDiasEntreErros = 30;
      } else {
        mediaDiasEntreErros = 60;
      }

      // SCORE do analista (0 a 100)
      const score = Math.round(qualidadePct);
      let categoria = 'Crítico';
      if (score >= 95) categoria = 'Excelente';
      else if (score >= 90) categoria = 'Bom';
      else if (score >= 80) categoria = 'Precisa melhorar';
      else categoria = 'Crítico';

      const scoreFormatted = `${categoria} - ${score}pts`;

      return {
        codigo,
        nome,
        supervisor,
        esteiras,
        totalMonitorias,
        totalProdutividade,
        totalErros,
        qualidadePct,
        reincidencias,
        maxTagErrorCount,
        tagsDetalhadas,
        macrosDetalhados,
        score,
        scoreFormatted,
        maxQuadrante,
        mediaDiasEntreErros,
        items: items.sort((a, b) => (b.DataMonitoria || '').localeCompare(a.DataMonitoria || '')),
        prodItems: prodItems.sort((a, b) => (b.DataProdutividade || '').localeCompare(a.DataProdutividade || ''))
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredRawData, filteredProdData, selectedForma]);


  // Quadrant statistics calculation (counts and percentages)
  const quadrantStats = useMemo(() => {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const total = analystsList.length;

    analystsList.forEach(a => {
      const lvl = Math.min(a.maxQuadrante.nivel, 5);
      counts[lvl as keyof typeof counts] = (counts[lvl as keyof typeof counts] || 0) + 1;
    });

    const getStat = (lvl: number) => {
      const qty = counts[lvl as keyof typeof counts] || 0;
      const pct = total > 0 ? ((qty / total) * 100).toFixed(1) : '0.0';
      return { qty, pct: `${pct}%` };
    };

    return {
      0: getStat(0),
      1: getStat(1),
      2: getStat(2),
      3: getStat(3),
      4: getStat(4),
      5: getStat(5),
    };
  }, [analystsList]);

  const filteredAnalysts = useMemo(() => {
    if (!searchTerm.trim()) return analystsList;
    const term = searchTerm.toLowerCase();
    return analystsList.filter(a => 
      a.nome.toLowerCase().includes(term) || 
      a.codigo.toLowerCase().includes(term) ||
      a.supervisor.toLowerCase().includes(term) ||
      a.esteiras.some(e => e.toLowerCase().includes(term))
    );
  }, [analystsList, searchTerm]);

  const getScoreBadgeColor = (scoreFormatted: string) => {
    if (scoreFormatted.startsWith('Excelente')) return 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
    if (scoreFormatted.startsWith('Bom')) return 'bg-blue-950/80 text-blue-400 border-blue-800';
    if (scoreFormatted.startsWith('Precisa melhorar')) return 'bg-yellow-950/80 text-[#ffff00] border-[#ffff00]/60';
    return 'bg-red-950/80 text-red-400 border-red-800';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black p-8 space-y-8 text-zinc-100">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestão de Analistas</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {analystsList.length} analista(s) avaliado(s) na base ativa
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por analista, esteira, matrícula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#ffff00] outline-none"
          />
        </div>
      </div>

      {/* Matriz Centralizada de Regras de Acompanhamento & Feedbacks */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-black border border-zinc-800 rounded-xl text-[#ffff00]">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Matriz Centralizada de Acompanhamento e Feedbacks (Quadrantes)</h3>
            <p className="text-xs text-zinc-400">Diretrizes de acompanhamento e medidas operacionais conforme acúmulo de erros na mesma TAG:</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 0 Conforme */}
          <div className="bg-black border border-emerald-800/80 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-extrabold text-[10px] border border-emerald-800 mb-0.5">0</span>
              <h4 className="text-xs font-bold text-emerald-400">Conforme</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Monitorias sem erros</p>
            </div>
            <div className="w-full border-t border-emerald-900/60 my-2" />
            <p className="text-xs font-bold text-emerald-400 whitespace-nowrap">
              {quadrantStats[0].qty} analistas ({quadrantStats[0].pct})
            </p>
          </div>

          {/* 1º Quadrante */}
          <div className="bg-black border border-blue-800/80 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-950 text-blue-400 font-extrabold text-[10px] border border-blue-800 mb-0.5">1</span>
              <h4 className="text-xs font-bold text-blue-400">1º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Feedback</p>
            </div>
            <div className="w-full border-t border-blue-900/60 my-2" />
            <p className="text-xs font-bold text-blue-400 whitespace-nowrap">
              {quadrantStats[1].qty} analistas ({quadrantStats[1].pct})
            </p>
          </div>

          {/* 2º Quadrante */}
          <div className="bg-black border border-amber-800/80 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-950 text-amber-400 font-extrabold text-[10px] border border-amber-800 mb-0.5">2</span>
              <h4 className="text-xs font-bold text-amber-400">2º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Análise de reincidência + lado a lado</p>
            </div>
            <div className="w-full border-t border-amber-900/60 my-2" />
            <p className="text-xs font-bold text-amber-400 whitespace-nowrap">
              {quadrantStats[2].qty} analistas ({quadrantStats[2].pct})
            </p>
          </div>

          {/* 3º Quadrante */}
          <div className="bg-black border border-orange-800/80 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-950 text-orange-400 font-extrabold text-[10px] border border-orange-800 mb-0.5">3</span>
              <h4 className="text-xs font-bold text-orange-400">3º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Feedback formal + Medida disciplinar</p>
            </div>
            <div className="w-full border-t border-orange-900/60 my-2" />
            <p className="text-xs font-bold text-orange-400 whitespace-nowrap">
              {quadrantStats[3].qty} analistas ({quadrantStats[3].pct})
            </p>
          </div>

          {/* 4º Quadrante */}
          <div className="bg-black border border-red-800/80 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-950 text-red-400 font-extrabold text-[10px] border border-red-800 mb-0.5">4</span>
              <h4 className="text-xs font-bold text-red-400">4º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Avaliação de gestão + Medidas adm.</p>
            </div>
            <div className="w-full border-t border-red-900/60 my-2" />
            <p className="text-xs font-bold text-red-400 whitespace-nowrap">
              {quadrantStats[4].qty} analistas ({quadrantStats[4].pct})
            </p>
          </div>

          {/* >4 Persistência */}
          <div className="bg-black border border-rose-700 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-950 text-rose-300 font-extrabold text-[10px] border border-rose-700 mb-0.5">&gt;4</span>
              <h4 className="text-xs font-extrabold text-rose-300">Persistência</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">+ de 4 erros na mesma TAG</p>
            </div>
            <div className="w-full border-t border-rose-900/60 my-2" />
            <p className="text-xs font-bold text-rose-300 whitespace-nowrap">
              {quadrantStats[5].qty} analistas ({quadrantStats[5].pct})
            </p>
          </div>
        </div>
      </div>

      {/* Analysts Main List */}
      <div className="flex flex-col gap-4">
        {filteredAnalysts.length > 0 ? (
          filteredAnalysts.map(analyst => (
            <div
              key={analyst.codigo + analyst.nome}
              onClick={() => setSelectedAnalyst(analyst)}
              className="w-full bg-zinc-900 border border-zinc-800 hover:border-[#ffff00] p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-[#ffff00]/5 flex flex-col xl:flex-row items-center justify-between gap-4 xl:gap-6 group"
            >
              {/* Left: Avatar, Name, Code, Supervisor & Individual Esteira Boxes */}
              <div className="flex items-center gap-3.5 w-full xl:w-[340px] shrink-0 overflow-hidden">
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
                  {/* Esteiras em quadradinhos individuais lado a lado */}
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    {analyst.esteiras.length > 0 ? (
                      analyst.esteiras.map((e, idx) => (
                        <span 
                          key={idx} 
                          className="text-[10px] font-semibold text-zinc-300 bg-black border border-zinc-800 px-2 py-0.5 rounded-md inline-block whitespace-nowrap"
                        >
                          {e}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-zinc-500 bg-black border border-zinc-800 px-2 py-0.5 rounded-md">Sem Esteira</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle: Metrics Bar */}
              <div className="w-full xl:w-[420px] shrink-0 bg-black border border-zinc-800/80 px-4 py-2.5 rounded-xl grid grid-cols-5 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Produtividade</p>
                  <p className="text-sm font-bold text-blue-400 mt-0.5">{analyst.totalProdutividade}</p>
                </div>
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
              </div>


              {/* Botão de Reincidência e Nível de Criticidade */}
              <div className="w-full xl:w-[170px] shrink-0 flex items-center justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopupAnalyst(analyst);
                  }}
                  className={`w-[150px] h-9 rounded-xl text-xs font-bold border inline-flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shrink-0 ${analyst.maxQuadrante.colorClass}`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-[10px] font-black shrink-0">
                    {analyst.maxTagErrorCount}
                  </span>
                  <span className="font-extrabold text-xs">
                    {analyst.maxTagErrorCount} {analyst.maxTagErrorCount === 1 ? 'erro' : 'erros'}
                  </span>
                  <Info size={13} className="shrink-0 opacity-80" />
                </button>
              </div>

              {/* Right: Score Formatted Badge & Chevron */}
              <div className="w-full xl:w-[170px] shrink-0 flex items-center justify-between xl:justify-end gap-3 border-t xl:border-t-0 border-zinc-800/60 pt-3 xl:pt-0">
                <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border ${getScoreBadgeColor(analyst.scoreFormatted)}`}>
                  {analyst.scoreFormatted}
                </span>
                <span className="flex items-center gap-1 text-[#ffff00] font-semibold text-xs group-hover:translate-x-1 transition-transform bg-black border border-zinc-800 px-3 py-1.5 rounded-xl">
                  Detalhes <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="w-full bg-zinc-900 border border-zinc-800 p-12 rounded-2xl text-center space-y-3">
            <Users size={40} className="mx-auto text-zinc-600" />
            <h3 className="text-lg font-bold text-white">Nenhum analista encontrado</h3>
            <p className="text-xs text-zinc-500">
              Verifique os filtros aplicados ou importe a base na aba <strong className="text-zinc-300">Importar Base</strong>.
            </p>
          </div>
        )}
      </div>

      {/* DETAILED ANALYST FULL POPUP MODAL */}
      {selectedAnalyst && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 my-auto space-y-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 custom-scrollbar relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-bold text-xl text-[#ffff00] shrink-0">
                  {selectedAnalyst.nome.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-white">{selectedAnalyst.nome}</h2>
                    {/* Score ao lado direito do nome, sutil mas visível */}
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${getScoreBadgeColor(selectedAnalyst.scoreFormatted)}`}>
                      {selectedAnalyst.scoreFormatted}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                    <span>{selectedAnalyst.codigo}</span>
                    <span>•</span>
                    <span>Supervisor: {selectedAnalyst.supervisor}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-400 font-semibold mr-1">Esteiras:</span>
                    {selectedAnalyst.esteiras.map((e, idx) => (
                      <span key={idx} className="text-[10px] font-semibold text-[#ffff00] bg-black border border-zinc-800 px-2.5 py-0.5 rounded-md">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnalyst(null)}
                className="p-2 text-zinc-400 hover:text-white bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
                title="Fechar Dashboard"
              >
                <X size={20} />
              </button>
            </div>

            {/* TOP KPI CARDS: Produtividade (Ao lado esquerdo de Monitorias), Monitorias, Qualidade, Erros, Reincidências */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Produtividade</p>
                <p className="text-xl sm:text-2xl font-extrabold text-blue-400">{selectedAnalyst.totalProdutividade}</p>
              </div>

              <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Monitorias</p>
                <p className="text-xl sm:text-2xl font-extrabold text-white">{selectedAnalyst.totalMonitorias}</p>
              </div>

              <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Qualidade</p>
                <p className="text-xl sm:text-2xl font-extrabold text-[#ffff00]">{selectedAnalyst.qualidadePct}%</p>
              </div>

              <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Erros</p>
                <p className="text-xl sm:text-2xl font-extrabold text-red-400">{selectedAnalyst.totalErros}</p>
              </div>

              <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Reincidências</p>
                <p className="text-xl sm:text-2xl font-extrabold text-amber-400">{selectedAnalyst.reincidencias}</p>
              </div>
            </div>


            {/* Visualização de Reincidências por TAG & Medida de Acompanhamento */}
            <div className="bg-black border border-zinc-800 p-6 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-[#ffff00]" />
                Reincidências por TAG & Medida de Acompanhamento
              </h4>

              {selectedAnalyst.tagsDetalhadas.length > 0 ? (
                <div className="space-y-3">
                  {selectedAnalyst.tagsDetalhadas.map((item, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{item.tag}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Erros acumulados nesta tag: <strong className="text-[#ffff00]">{item.count} erro(s)</strong>
                        </p>
                      </div>

                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${item.quadrante.colorClass}`}>
                        {item.quadrante.descricao}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-zinc-900 rounded-xl text-xs text-emerald-400 border border-emerald-900/60 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>Analista não possui reincidência de erros por TAG no período selecionado.</span>
                </div>
              )}
            </div>

            {/* Dash Individual do Analista (Gráficos) */}
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <BarChart2 size={20} className="text-[#ffff00]" />
                Dash Individual do Analista
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Erros por TAG */}
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ffff00]"></span>
                    Erros por TAG
                  </h4>

                  {selectedAnalyst.tagsDetalhadas.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={selectedAnalyst.tagsDetalhadas} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="tag" stroke="#71717a" interval={0} tick={<CustomXAxisTick />} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                          itemStyle={{ color: '#ffff00' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar dataKey="count" name="Quantidade" fill="#ffff00" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="count" position="top" fill="#ffffff" fontSize={11} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-zinc-500 py-10 text-center">Nenhum erro de TAG registrado.</p>
                  )}
                </div>

                {/* Visual Erros por Motivo Macro */}
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChartIcon size={14} className="text-[#ffff00]" />
                    Erros por Motivo Macro
                  </h4>

                  {selectedAnalyst.macrosDetalhados.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={selectedAnalyst.macrosDetalhados}
                          dataKey="count"
                          nameKey="macro"
                          cx="50%"
                          cy="45%"
                          outerRadius={70}
                          innerRadius={35}
                          paddingAngle={4}
                          label={({ count }) => `${count}`}
                        >
                          {selectedAnalyst.macrosDetalhados.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DONUT_PALETTE[index % DONUT_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                          itemStyle={{ color: '#ffff00' }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '11px', color: '#ffffff' }} 
                          formatter={(value) => <span style={{ color: '#ffffff', fontWeight: 500 }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-zinc-500 py-10 text-center">Nenhum erro macro registrado.</p>
                  )}
                </div>

                {/* Visual Produtividade do Analista por Data */}
                <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase size={14} className="text-[#ffff00]" />
                    Evolução da Produtividade no Período (Total: {selectedAnalyst.totalProdutividade} itens)
                  </h4>

                  {selectedAnalyst.prodItems && selectedAnalyst.prodItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart 
                        data={Object.entries(
                          selectedAnalyst.prodItems.reduce((acc, p) => {
                            const d = p.DataProdutividade || 'Outra';
                            acc[d] = (acc[d] || 0) + (Number(p.Quantidade) || 1);
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .map(([data, qtd]) => {
                            let label = data;
                            if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
                              const parts = data.split('-');
                              label = `${parts[2]}/${parts[1]}`;
                            }
                            return { data, label, qtd };
                          })
                          .sort((a, b) => a.data.localeCompare(b.data))
                        }
                        margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                          itemStyle={{ color: '#ffff00' }}
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        />
                        <Bar dataKey="qtd" name="Produtividade" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="qtd" position="top" fill="#ffffff" fontSize={11} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-zinc-500 py-10 text-center">Nenhum registro de produtividade encontrado para este analista no período e esteira selecionados.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Medidor de Intervalo de Erros */}
            <div className="bg-black border border-zinc-800 p-6 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-[#ffff00]" />
                  Medidor de Sustentação Operacional
                </h4>
                <span className="text-xs text-zinc-400 font-mono">
                  Média: <strong className="text-[#ffff00]">{selectedAnalyst.mediaDiasEntreErros} dias</strong> sem erros
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                O analista mantém em média <strong className="text-white">{selectedAnalyst.mediaDiasEntreErros} dias</strong> de operação sem intercorrências operacionais ou não conformidades.
              </p>
            </div>

            {/* Histórico Completo de Monitorias */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-[#ffff00]" />
                Histórico de Monitorias ({selectedAnalyst.items.length})
              </h4>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
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
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
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

      {/* POP-UP MODAL: Erros e Reincidências */}
      {popupAnalyst && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-zinc-100 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={20} className="text-[#ffff00]" />
                  Erros e reincidências
                </h2>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Analista: <strong className="text-white font-sans">{popupAnalyst.nome}</strong> ({popupAnalyst.codigo})
                </p>
              </div>

              <button
                onClick={() => setPopupAnalyst(null)}
                className="p-2 text-zinc-400 hover:text-white bg-black border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mini Gráfico de Erros por TAG */}
            <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 size={16} className="text-[#ffff00]" />
                Volume de Erros por TAG
              </h4>

              {popupAnalyst.tagsDetalhadas.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={popupAnalyst.tagsDetalhadas} margin={{ top: 20, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="tag" stroke="#71717a" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                      itemStyle={{ color: '#ffff00' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', color: '#ffffff' }} 
                      formatter={(value) => <span style={{ color: '#ffffff', fontWeight: 500 }}>{value}</span>}
                    />
                    <Bar dataKey="count" name="Erros na TAG" fill="#ffff00" radius={[6, 6, 0, 0]} barSize={32}>
                      <LabelList dataKey="count" position="top" fill="#ffffff" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                  <p className="text-xs text-emerald-400 font-semibold">Analista 100% Conforme! Nenhum erro registrado no período.</p>
                </div>
              )}
            </div>

            {/* Lista Detalhada de TAGs e Criticidade */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Layers size={15} className="text-[#ffff00]" />
                Acompanhamento e Medidas por TAG
              </h4>

              {popupAnalyst.tagsDetalhadas.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {popupAnalyst.tagsDetalhadas.map((item, idx) => (
                    <div key={idx} className="bg-black border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-white">{item.tag}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Quantidade: <strong className="text-[#ffff00]">{item.count} erro(s)</strong>
                        </p>
                      </div>

                      <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${item.quadrante.colorClass}`}>
                        {item.quadrante.descricao}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Sem ocorrências operacionais registradas.</p>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-2 text-right">
              <button
                onClick={() => setPopupAnalyst(null)}
                className="px-5 py-2.5 bg-[#ffff00] text-black font-bold text-xs rounded-xl hover:bg-yellow-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
