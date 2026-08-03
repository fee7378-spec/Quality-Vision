import { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, X, AlertTriangle, Layers, BarChart2, CheckCircle2, Info,
  Activity, Award, PieChart as PieChartIcon, Clock, ChevronRight, Briefcase,
  TrendingUp, ChevronDown, Crosshair, ShieldAlert, Sparkles, UserCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LabelList, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { useStore, MonitoringItem, ProductivityItem, normalizeName, isValidAnalystName } from '../store/useStore';

export interface QuadranteInfo {
  nivel: number;
  titulo: string;
  descricao: string;
  colorClass: string;
}

export interface AnalystDispersalData extends AnalystSummary {
  prodQuadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  prodQuadrantName: string;
  prodQuadrantColor: string;
  prodQuadrantBg: string;
  prodQuadrantBorder: string;
  prodPercentile: number;
  x: number;
  y: number;
  radiusPct: number;
  angleDeg: number;
  worstIndex: number;
}

export const getQuadranteForCount = (count: number): QuadranteInfo => {
  if (count <= 0) {
    return {
      nivel: 0,
      titulo: 'Conforme',
      descricao: 'Conforme - Sem erros na mesma TAG',
      colorClass: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
    };
  }
  if (count === 1) {
    return {
      nivel: 1,
      titulo: '1º Feedback',
      descricao: '1º Feedback',
      colorClass: 'bg-amber-950/60 text-amber-500 border-amber-800/80'
    };
  }
  if (count === 2) {
    return {
      nivel: 2,
      titulo: '2º Quadrante',
      descricao: '2º Análise de reincidência + lado a lado',
      colorClass: 'bg-amber-950/60 text-amber-500 border-amber-800/80'
    };
  }
  if (count === 3) {
    return {
      nivel: 3,
      titulo: '3º Quadrante',
      descricao: '3º Feedback formal + Medida disciplinar',
      colorClass: 'bg-orange-950/60 text-orange-400 border-orange-800/80'
    };
  }
  if (count === 4) {
    return {
      nivel: 4,
      titulo: '4º Quadrante',
      descricao: '4º Avaliação de gestão + Medidas administrativas',
      colorClass: 'bg-red-950/60 text-red-400 border-red-800/80'
    };
  }
  return {
    nivel: 5,
    titulo: 'Persistência',
    descricao: '+ de 4 erros Persistência',
    colorClass: 'bg-rose-950/60 text-rose-300 border-rose-800/80 font-extrabold'
  };
};

export const getQualityColorClass = (pct: number) => {
  if (pct >= 97) return 'text-emerald-400';
  if (pct >= 95) return 'text-amber-500';
  if (pct >= 92) return 'text-orange-400';
  return 'text-red-400';
};

export const getQualityBadgeClass = (pct: number) => {
  if (pct >= 97) return 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80';
  if (pct >= 95) return 'bg-amber-950/70 text-amber-500 border-amber-800/80';
  if (pct >= 92) return 'bg-orange-950/70 text-orange-400 border-orange-800/80';
  return 'bg-red-950/70 text-red-400 border-red-800/80';
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
  tmoMedio: number | string;
  items: MonitoringItem[];
  prodItems: ProductivityItem[];
}


const DONUT_PALETTE = ['#FFFF00', '#FFFF00', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#FFFF00'];

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
    selectedForma,
    selectedSupervisor,
    setSelectedSupervisor,
    analystSearchQuery,
    setAnalystSearchQuery
  } = useStore();

  const [activeTab, setActiveTab] = useState<'individual' | 'dispersao'>('individual');
  const [selectedAnalyst, setSelectedAnalyst] = useState<AnalystSummary | null>(null);
  const [popupAnalyst, setPopupAnalyst] = useState<AnalystSummary | null>(null);
  const [displayLimit, setDisplayLimit] = useState(15);
  const [rankingLimit, setRankingLimit] = useState<number>(10);
  const [rankingCategory, setRankingCategory] = useState<'geral' | 'qualidade' | 'produtividade'>('geral');
  const [selectedDiagramAnalyst, setSelectedDiagramAnalyst] = useState<AnalystDispersalData | null>(null);
  const [hoveredDiagramAnalyst, setHoveredDiagramAnalyst] = useState<{ analyst: AnalystDispersalData; mouseX: number; mouseY: number } | null>(null);

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(15);
    setRankingLimit(10);
  }, [startDate, endDate, selectedEsteira, selectedForma, selectedSupervisor, analystSearchQuery]);

  // Global Escape key handler to close popups
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (popupAnalyst) {
          setPopupAnalyst(null);
        } else if (selectedAnalyst) {
          setSelectedAnalyst(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popupAnalyst, selectedAnalyst]);

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

  // Identify recurrences based on filtered monitora base
  const errorIsRecurrence = useMemo(() => {
    const isRecurrenceMap = new Map<any, boolean>();
    const analystTagHistory: Record<string, Set<string>> = {};

    [...filteredRawData]
      .filter(item => {
        const errStr = (item.Erro || "").toString().trim().toLowerCase();
        return (
          errStr === "0" || 
          errStr === "erro" || 
          errStr === "reprovado" || 
          errStr === "nc" || 
          errStr === "n/c" || 
          errStr === "nok"
        );
      })
      .sort((a, b) => (a.DataMonitoria || "").localeCompare(b.DataMonitoria || ""))
      .forEach(item => {
        const name = item.NomeAnalista || "ANALISTA";
        const code = item.CodigoAnalista || name;
        const tag = (item.Tag && item.Tag.trim()) ? item.Tag.trim() : "Outros / Sem TAG";

        const normCode = normalizeName(code);

        if (!analystTagHistory[normCode]) {
          analystTagHistory[normCode] = new Set();
        }

        if (analystTagHistory[normCode].has(tag)) {
          isRecurrenceMap.set(item, true);
        } else {
          isRecurrenceMap.set(item, false);
          analystTagHistory[normCode].add(tag);
        }
      });
    return isRecurrenceMap;
  }, [filteredRawData]);

  // Group all filtered data by Analyst name/code
  const analystsList = useMemo(() => {
    const monitoriasMap: Record<string, MonitoringItem[]> = {};
    const prodMap: Record<string, ProductivityItem[]> = {};
    const displayNameMap: Record<string, string> = {};

    filteredRawData.forEach(item => {
      const rawName = item.NomeAnalista ? item.NomeAnalista.trim() : '';
      if (!isValidAnalystName(rawName)) return;
      const key = normalizeName(rawName);
      if (!key) return;
      if (!monitoriasMap[key]) monitoriasMap[key] = [];
      monitoriasMap[key].push(item);
      if (!displayNameMap[key]) displayNameMap[key] = rawName.toUpperCase();
    });

    filteredProdData.forEach(p => {
      const rawName = p.NomeAnalista ? p.NomeAnalista.trim() : '';
      if (!isValidAnalystName(rawName)) return;
      const key = normalizeName(rawName);
      if (!key) return;
      if (!prodMap[key]) prodMap[key] = [];
      prodMap[key].push(p);
      if (!displayNameMap[key]) displayNameMap[key] = rawName.toUpperCase();
    });

    // Only include valid analyst keys
    const allAnalystKeys = Array.from(new Set([...Object.keys(monitoriasMap), ...Object.keys(prodMap)]))
      .filter(key => isValidAnalystName(displayNameMap[key] || key));

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

      // Reincidências por TAG (mesma TAG) na base full
      const tagCount: Record<string, number> = {};
      let reincidencias = 0;
      erros.forEach(e => {
        const tag = (e.Tag && e.Tag.trim()) ? e.Tag.trim() : "Outros / Sem TAG";
        tagCount[tag] = (tagCount[tag] || 0) + 1;
        if (errorIsRecurrence.get(e)) {
          reincidencias += 1;
        }
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
      if (qualidadePct >= 97) categoria = 'Excelente';
      else if (qualidadePct >= 95) categoria = 'Bom';
      else if (qualidadePct >= 92) categoria = 'Regular';
      else categoria = 'Crítico';

      const scoreFormatted = `${categoria} - ${score}pts`;

      const totalTmoTime = prodItems.reduce((sum, p) => sum + ((p.TmoMinutos || 15) * (Number(p.Quantidade) || 1)), 0);
      const tmoMedio = totalProdutividade > 0 ? (totalTmoTime / totalProdutividade).toFixed(1) : "0.0";

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
        tmoMedio,
        items: items.sort((a, b) => (b.DataMonitoria || '').localeCompare(a.DataMonitoria || '')),
        prodItems: prodItems.sort((a, b) => (b.DataProdutividade || '').localeCompare(a.DataProdutividade || ''))
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filteredRawData, filteredProdData, selectedForma, errorIsRecurrence]);


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

  const supervisorList = useMemo(() => {
    const sups = new Set<string>();
    analystsList.forEach(a => {
      if (a.supervisor && a.supervisor.trim()) {
        sups.add(a.supervisor.trim().toUpperCase());
      }
    });
    return Array.from(sups).sort();
  }, [analystsList]);

  const filteredAnalysts = useMemo(() => {
    return analystsList.filter(a => {
      if (selectedSupervisor !== 'TODOS' && normalizeName(a.supervisor) !== normalizeName(selectedSupervisor)) {
        return false;
      }
      if (!analystSearchQuery.trim()) return true;
      const term = analystSearchQuery.toLowerCase();
      return (
        a.nome.toLowerCase().includes(term) || 
        a.codigo.toLowerCase().includes(term) ||
        a.supervisor.toLowerCase().includes(term) ||
        a.esteiras.some(e => e.toLowerCase().includes(term))
      );
    });
  }, [analystsList, analystSearchQuery, selectedSupervisor]);

  const getScoreBadgeColor = (scoreFormatted: string) => {
    if (scoreFormatted.startsWith('Excelente')) return 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80';
    if (scoreFormatted.startsWith('Bom')) return 'bg-amber-950/70 text-amber-500 border-amber-800/80';
    if (scoreFormatted.startsWith('Regular')) return 'bg-orange-950/70 text-orange-400 border-orange-800/80';
    return 'bg-red-950/70 text-red-400 border-red-800/80';
  };

  // Calculate Polar Dispersal Data (Q1, Q2, Q3, Q4 Productivity & Radial Quality)
  const dispersalData = useMemo(() => {
    if (filteredAnalysts.length === 0) return [];

    // Calculate team average productivity for realistic, organic quadrant distribution
    const totalProdSum = filteredAnalysts.reduce((sum, a) => sum + a.totalProdutividade, 0);
    const avgProd = filteredAnalysts.length > 0 ? totalProdSum / filteredAnalysts.length : 1;

    // Sort filtered analysts by totalProdutividade descending
    const sortedByProd = [...filteredAnalysts].sort((a, b) => b.totalProdutividade - a.totalProdutividade);

    // Pre-determine quadrant for each analyst based on ratio to team average
    const analystsWithQuad = filteredAnalysts.map((analyst) => {
      const prodRatio = avgProd > 0 ? analyst.totalProdutividade / avgProd : 1.0;

      let prodQuadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q4';
      let prodQuadrantName = 'Q4 • Pior (Crítico)';
      let prodQuadrantColor = '#ef4444';
      let prodQuadrantBg = 'bg-red-950/80 text-red-400 border-red-800';
      let prodQuadrantBorder = 'border-red-800';
      let angleMin = 190;
      let angleMax = 260; // Bottom-Left sector (180°..270°)

      if (prodRatio >= 1.20) {
        prodQuadrant = 'Q1';
        prodQuadrantName = 'Q1 • Positivo (Alta)';
        prodQuadrantColor = '#10b981';
        prodQuadrantBg = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
        prodQuadrantBorder = 'border-emerald-800';
        angleMin = 100;
        angleMax = 170; // Top-Left sector (90°..180°)
      } else if (prodRatio >= 0.85) {
        prodQuadrant = 'Q2';
        prodQuadrantName = 'Q2 • Mediano (Média)';
        prodQuadrantColor = '#FFFF00';
        prodQuadrantBg = 'bg-amber-950/80 text-amber-400 border-amber-800';
        prodQuadrantBorder = 'border-amber-800';
        angleMin = 10;
        angleMax = 80; // Top-Right sector (0°..90°)
      } else if (prodRatio >= 0.50) {
        prodQuadrant = 'Q3';
        prodQuadrantName = 'Q3 • Ruim (Baixa)';
        prodQuadrantColor = '#f97316';
        prodQuadrantBg = 'bg-orange-950/80 text-orange-400 border-orange-800';
        prodQuadrantBorder = 'border-orange-800';
        angleMin = 280;
        angleMax = 350; // Bottom-Right sector (270°..360°)
      }

      return {
        analyst,
        prodQuadrant,
        prodQuadrantName,
        prodQuadrantColor,
        prodQuadrantBg,
        prodQuadrantBorder,
        prodRatio,
        angleMin,
        angleMax
      };
    });

    return analystsWithQuad.map(({ analyst, prodQuadrant, prodQuadrantName, prodQuadrantColor, prodQuadrantBg, prodQuadrantBorder, prodRatio, angleMin, angleMax }) => {
      // Center (0% Quality) -> Border (100% Quality)
      const cx = 260;
      const cy = 260;
      const Rmax = 210;
      const Rmin = 18;

      const qualityFraction = Math.max(0, Math.min(100, analyst.qualidadePct)) / 100;
      const r = Rmin + qualityFraction * (Rmax - Rmin);

      // Distribute analysts in their quadrant arc based on productivity ranking inside their quadrant group
      const quadrantGroup = analystsWithQuad
        .filter(item => item.prodQuadrant === prodQuadrant)
        .sort((a, b) => b.analyst.totalProdutividade - a.analyst.totalProdutividade);

      const subIndex = Math.max(0, quadrantGroup.findIndex(item => item.analyst.codigo === analyst.codigo && item.analyst.nome === analyst.nome));
      const subCount = Math.max(1, quadrantGroup.length);
      const subFraction = subCount > 1 ? subIndex / (subCount - 1) : 0.5;

      const angleDeg = angleMin + subFraction * (angleMax - angleMin);
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad); // Inverted SVG Y

      // Score for worst metrics ranking (Higher score = worse performance)
      const quadrantPenalty = prodQuadrant === 'Q4' ? 400 : prodQuadrant === 'Q3' ? 300 : prodQuadrant === 'Q2' ? 200 : 100;
      const qualityLossPenalty = (100 - analyst.qualidadePct) * 10;
      const errorsPenalty = analyst.totalErros * 15;
      const reincidenciasPenalty = analyst.reincidencias * 20;

      const worstIndex = quadrantPenalty + qualityLossPenalty + errorsPenalty + reincidenciasPenalty;

      return {
        ...analyst,
        prodQuadrant,
        prodQuadrantName,
        prodQuadrantColor,
        prodQuadrantBg,
        prodQuadrantBorder,
        prodPercentile: prodRatio,
        x,
        y,
        radiusPct: analyst.qualidadePct,
        angleDeg,
        worstIndex
      } as AnalystDispersalData;
    });
  }, [filteredAnalysts]);

  const rankingData = useMemo(() => {
    if (rankingCategory === 'qualidade') {
      return [...dispersalData].sort((a, b) => {
        if (a.qualidadePct !== b.qualidadePct) return a.qualidadePct - b.qualidadePct;
        return b.totalErros - a.totalErros;
      });
    }
    if (rankingCategory === 'produtividade') {
      return [...dispersalData].sort((a, b) => {
        if (a.totalProdutividade !== b.totalProdutividade) return a.totalProdutividade - b.totalProdutividade;
        return a.qualidadePct - b.qualidadePct;
      });
    }
    return [...dispersalData].sort((a, b) => b.worstIndex - a.worstIndex);
  }, [dispersalData, rankingCategory]);

  return (
    <div className="w-full bg-black p-4 sm:p-6 md:p-8 space-y-8 text-zinc-100 relative">
      {/* Navigation Tabs Switcher & Top-Right Active Analysts counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        {/* Left: Tab Selector Switcher */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl shrink-0 shadow-lg">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'individual' 
                ? 'bg-amber-600 text-zinc-950 shadow-md shadow-amber-500/20' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users size={15} />
            Análise Individual
          </button>
          <button
            onClick={() => setActiveTab('dispersao')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dispersao' 
                ? 'bg-amber-600 text-zinc-950 shadow-md shadow-amber-500/20' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity size={15} />
            Diagrama de Dispersão
          </button>
        </div>

        {/* Right side: Active Analysts counter (placed on top right per prompt) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 bg-zinc-900/60 border border-zinc-800 px-3.5 py-2 rounded-xl self-end sm:self-auto">
          <Users size={14} className="text-amber-500" />
          <span><strong className="text-white">{filteredAnalysts.length}</strong> analistas ativos nesta base</span>
        </div>
      </div>

      {activeTab === 'dispersao' ? (
        /* TAB 2: DIAGRAMA DE DISPERSÃO (QUADRANTES Q1..Q4 & QUALIDADE RADIAL) */
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Quadrant Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Q1 Positivo */}
            <div className="bg-zinc-900 border border-emerald-900/60 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Q1 • Positivo
                </span>
                <TrendingUp size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q1').length} <span className="text-xs font-normal text-zinc-400">analistas</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Alta Produtividade & Desempenho Superior</p>
              </div>
            </div>

            {/* Q2 Mediano */}
            <div className="bg-zinc-900 border border-amber-900/60 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800">
                  Q2 • Mediano
                </span>
                <BarChart2 size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q2').length} <span className="text-xs font-normal text-zinc-400">analistas</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Produtividade Média Operacional</p>
              </div>
            </div>

            {/* Q3 Ruim */}
            <div className="bg-zinc-900 border border-orange-900/60 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-orange-950 text-orange-400 border border-orange-800">
                  Q3 • Ruim
                </span>
                <AlertTriangle size={18} className="text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q3').length} <span className="text-xs font-normal text-zinc-400">analistas</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Baixa Produtividade • Abaixo da Meta</p>
              </div>
            </div>

            {/* Q4 Pior */}
            <div className="bg-zinc-900 border border-red-900/60 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-red-950 text-red-400 border border-red-800">
                  Q4 • Pior (Crítico)
                </span>
                <ShieldAlert size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q4').length} <span className="text-xs font-normal text-zinc-400">analistas</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">Produtividade Crítica / Gargalo Operacional</p>
              </div>
            </div>
          </div>

          {/* DISPERSAL SCATTER CHART CARD */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
                  <Activity className="text-amber-500" size={20} />
                  DIAGRAMA DE DISPERSÃO — PRODUTIVIDADE X QUALIDADE
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mapeamento em 4 quadrantes de produtividade com raio radial representando a taxa de qualidade (Centro = 0% → Borda = 100%)
                </p>
              </div>

              {/* Chart Legend Summary */}
              <div className="flex items-center gap-3 text-xs flex-wrap bg-black border border-zinc-800 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Q1 (Positivo)</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Q2 (Mediano)</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                  <span>Q3 (Ruim)</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Q4 (Pior)</span>
                </div>
              </div>
            </div>

            {/* SVG Interactive Polar Scatter Chart Area */}
            <div className="flex flex-col lg:flex-row items-center justify-around gap-8 py-2">
              <div className="relative w-full max-w-[520px] aspect-square flex items-center justify-center bg-black/90 border border-zinc-800 rounded-2xl p-4 shadow-2xl overflow-hidden">
                <svg viewBox="0 0 520 520" className="w-full h-full select-none overflow-visible">
                  <defs>
                    <radialGradient id="polarGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#18181b" stopOpacity="0.8" />
                      <stop offset="70%" stopColor="#09090b" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="1" />
                    </radialGradient>
                    
                    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>

                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
                    </marker>
                  </defs>

                  {/* Outer Main Circle (100% Quality Border) */}
                  <circle cx="260" cy="260" r="210" fill="url(#polarGrad)" stroke="#3f3f46" strokeWidth="2" />

                  {/* Concentric Dashed Quality Rings */}
                  {/* 25% Ring */}
                  <circle cx="260" cy="260" r="63.75" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="260" y="193" textAnchor="middle" fill="#52525b" fontSize="9" fontWeight="bold">25% Qualidade</text>

                  {/* 50% Ring */}
                  <circle cx="260" cy="260" r="112.5" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="260" y="144" textAnchor="middle" fill="#52525b" fontSize="9" fontWeight="bold">50% Qualidade</text>

                  {/* 75% Ring */}
                  <circle cx="260" cy="260" r="161.25" fill="none" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="260" y="95" textAnchor="middle" fill="#71717a" fontSize="10" fontWeight="bold">75% Qualidade</text>

                  {/* Outer Quality Border Labels */}
                  <text x="260" y="44" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="extrabold">100% Qualidade (Borda)</text>
                  <text x="260" y="278" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="extrabold">0% Qualidade (Centro)</text>

                  {/* Crosshair Dividers (Q1, Q2, Q3, Q4 Axis) */}
                  <line x1="260" y1="50" x2="260" y2="470" stroke="#52525b" strokeWidth="1.5" strokeDasharray="6 4" />
                  <line x1="50" y1="260" x2="470" y2="260" stroke="#52525b" strokeWidth="1.5" strokeDasharray="6 4" />

                  {/* Quadrant Titles - Positioned in outer corners so they never overlap analyst dots */}
                  {/* Q1: Top-Left */}
                  <g transform="translate(65, 26)">
                    <rect x="-45" y="-13" width="90" height="26" rx="6" fill="#022c22" stroke="#065f46" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="extrabold">Q1 • Positivo</text>
                  </g>

                  {/* Q2: Top-Right */}
                  <g transform="translate(455, 26)">
                    <rect x="-45" y="-13" width="90" height="26" rx="6" fill="#451a03" stroke="#92400e" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#FFFF00" fontSize="12" fontWeight="extrabold">Q2 • Mediano</text>
                  </g>

                  {/* Q3: Bottom-Right */}
                  <g transform="translate(455, 494)">
                    <rect x="-40" y="-13" width="80" height="26" rx="6" fill="#431407" stroke="#9a3412" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#fb923c" fontSize="12" fontWeight="extrabold">Q3 • Ruim</text>
                  </g>

                  {/* Q4: Bottom-Left */}
                  <g transform="translate(65, 494)">
                    <rect x="-40" y="-13" width="80" height="26" rx="6" fill="#450a0a" stroke="#991b1b" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="extrabold">Q4 • Pior</text>
                  </g>

                  {/* Analyst Dots (Bolinhas - Totalmente fixas e sem vibração no hover) */}
                  {dispersalData.map((item) => {
                    const isSelected = selectedDiagramAnalyst?.codigo === item.codigo && selectedDiagramAnalyst?.nome === item.nome;
                    const isSearched = analystSearchQuery.trim().length > 0 && (
                      item.nome.toLowerCase().includes(analystSearchQuery.toLowerCase()) || 
                      item.codigo.toLowerCase().includes(analystSearchQuery.toLowerCase())
                    );

                    return (
                      <g 
                        key={item.codigo + item.nome}
                        onClick={() => setSelectedDiagramAnalyst(item)}
                        onMouseEnter={(e) => setHoveredDiagramAnalyst({ analyst: item, mouseX: e.clientX, mouseY: e.clientY })}
                        onMouseMove={(e) => setHoveredDiagramAnalyst({ analyst: item, mouseX: e.clientX, mouseY: e.clientY })}
                        onMouseLeave={() => setHoveredDiagramAnalyst(null)}
                        className="cursor-pointer group"
                      >
                        {(isSelected || isSearched) && (
                          <>
                            <circle 
                              cx={item.x} 
                              cy={item.y} 
                              r="22" 
                              fill="none" 
                              stroke={isSearched ? "#FFFF00" : item.prodQuadrantColor} 
                              strokeWidth="2.5" 
                              className="animate-ping opacity-75" 
                            />
                            <circle 
                              cx={item.x} 
                              cy={item.y} 
                              r="16" 
                              fill="none" 
                              stroke={isSearched ? "#FFFF00" : item.prodQuadrantColor} 
                              strokeWidth="2" 
                              strokeDasharray="3 2"
                              className="opacity-90" 
                            />
                          </>
                        )}

                        <circle 
                          cx={item.x} 
                          cy={item.y} 
                          r={isSelected || isSearched ? "11" : "8"} 
                          fill={isSearched ? "#FFFF00" : item.prodQuadrantColor} 
                          stroke={isSelected || isSearched ? "#ffffff" : "#000000"} 
                          strokeWidth={isSelected || isSearched ? "3" : "2"}
                          className="transition-all duration-150 group-hover:stroke-[#FFFF00] group-hover:stroke-[3.5]"
                          filter="url(#dotGlow)"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Analyst Side Card */}
              <div className="w-full lg:w-[380px] bg-black border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
                {selectedDiagramAnalyst ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-amber-500 text-sm shrink-0">
                          {selectedDiagramAnalyst.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{selectedDiagramAnalyst.nome}</h4>
                          <p className="text-[11px] font-mono text-zinc-400">{selectedDiagramAnalyst.codigo} • Sup: {selectedDiagramAnalyst.supervisor}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDiagramAnalyst(null)}
                        className="p-1 text-zinc-500 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quadrant Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Quadrante de Produtividade:</span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${selectedDiagramAnalyst.prodQuadrantBg}`}>
                        {selectedDiagramAnalyst.prodQuadrantName}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold">Qualidade</p>
                        <p className={`text-base font-extrabold mt-0.5 ${getQualityColorClass(selectedDiagramAnalyst.qualidadePct)}`}>
                          {selectedDiagramAnalyst.qualidadePct}%
                        </p>
                      </div>

                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold">Produção</p>
                        <p className="text-base font-extrabold text-blue-400 mt-0.5">
                          {selectedDiagramAnalyst.totalProdutividade} <span className="text-[10px] text-zinc-400 font-normal">un.</span>
                        </p>
                      </div>

                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold">Total Monitorias</p>
                        <p className="text-base font-extrabold text-white mt-0.5">
                          {selectedDiagramAnalyst.totalMonitorias}
                        </p>
                      </div>

                      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold">Erros Registrados</p>
                        <p className="text-base font-extrabold text-red-400 mt-0.5">
                          {selectedDiagramAnalyst.totalErros}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => {
                        setSelectedAnalyst(selectedDiagramAnalyst);
                        setActiveTab('individual');
                      }}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users size={15} />
                      Abrir Análise Individual Completa
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <Crosshair size={32} className="mx-auto text-amber-500/80 animate-pulse" />
                    <p className="text-xs font-bold text-white">Clique em qualquer unidade no diagrama</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Selecione um analista no Diagrama de Dispersão para inspecionar seus dados de produtividade, qualidade e acessar sua ficha individual.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RANKING DE OFENSORES */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
                  <AlertTriangle size={20} className="text-red-500" />
                  RANKING DE OFENSORES
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Classificação de acompanhamento prioritário de analistas
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Heatmap-style view filter selector with small cards (Geral, Qualidade, Produtividade) */}
                <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRankingCategory('geral');
                      setRankingLimit(10);
                    }}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rankingCategory === 'geral'
                        ? 'bg-amber-600 text-zinc-950 shadow-sm font-extrabold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRankingCategory('qualidade');
                      setRankingLimit(10);
                    }}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rankingCategory === 'qualidade'
                        ? 'bg-amber-600 text-zinc-950 shadow-sm font-extrabold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Qualidade
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRankingCategory('produtividade');
                      setRankingLimit(10);
                    }}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rankingCategory === 'produtividade'
                        ? 'bg-amber-600 text-zinc-950 shadow-sm font-extrabold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Produtividade
                  </button>
                </div>
              </div>
            </div>

            {/* Ranking List Table / Cards */}
            <div className="space-y-3">
              {rankingData.slice(0, rankingLimit).map((analyst, index) => {
                const rankNum = index + 1;
                const isTop3 = rankNum <= 3;
                const isSearched = analystSearchQuery.trim().length > 0 && (
                  analyst.nome.toLowerCase().includes(analystSearchQuery.toLowerCase()) || 
                  analyst.codigo.toLowerCase().includes(analystSearchQuery.toLowerCase())
                );
                return (
                  <div
                    key={analyst.codigo + analyst.nome}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
                      isSearched
                        ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50 shadow-lg'
                        : isTop3 
                          ? 'bg-red-950/20 border-red-900/60 hover:border-red-600/80' 
                          : 'bg-black border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Rank Badge & Name */}
                    <div className="flex items-center gap-3.5 w-full md:w-[320px]">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        isSearched
                          ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                          : isTop3 
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                            : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        #{rankNum}
                      </span>

                      <div className="overflow-hidden min-w-0">
                        <h4 className="text-sm font-bold text-white truncate" title={analyst.nome}>{analyst.nome}</h4>
                        <p className="text-[11px] font-mono text-zinc-400">{analyst.codigo} • Sup: {analyst.supervisor}</p>
                      </div>
                    </div>

                    {/* Quadrant & Quality Badge */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${analyst.prodQuadrantBg}`}>
                        {analyst.prodQuadrantName}
                      </span>

                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getQualityBadgeClass(analyst.qualidadePct)}`}>
                        Qualidade: {analyst.qualidadePct}%
                      </span>
                    </div>

                    {/* Volume & Erros Metrics */}
                    <div className="flex items-center gap-6 text-xs text-zinc-300 w-full md:w-auto justify-around md:justify-start">
                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Produção</span>
                        <strong className="text-blue-400 font-bold">{analyst.totalProdutividade} un.</strong>
                      </div>

                      <div>
                        <span className="text-zinc-500 text-[10px] uppercase font-semibold block">Erros</span>
                        <strong className="text-red-400 font-bold">{analyst.totalErros} ({analyst.reincidencias} reinc.)</strong>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setSelectedAnalyst(analyst);
                        setActiveTab('individual');
                      }}
                      className="w-full md:w-auto px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-500 border border-zinc-700 hover:border-amber-600/60 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      Analisar <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Card button to load 10 more piores */}
            {rankingLimit < rankingData.length && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setRankingLimit(prev => prev + 10)}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-amber-500 border border-zinc-700 hover:border-amber-600/60 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  Exibir mais 10 analistas
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 1: ANÁLISE INDIVIDUAL (Matriz de Quadrantes & Fichas) */
        <div className="space-y-8 animate-in fade-in duration-300">

      {/* Matriz Centralizada de Regras de Acompanhamento & Feedbacks */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-black border border-zinc-800 rounded-xl text-amber-500">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase">MATRIZ DE QUADRANTES</h3>
            <p className="text-xs text-zinc-400">Diretrizes de acompanhamento e medidas operacionais:</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 0 Conforme */}
          <div className="bg-black border border-emerald-900/60 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 font-extrabold text-[10px] border border-emerald-800/80 mb-0.5">0</span>
              <h4 className="text-xs font-bold text-emerald-400">Conforme</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Monitorias sem erros</p>
            </div>
            <div className="w-full border-t border-emerald-900/60 my-2" />
            <p className="text-xs font-bold text-emerald-400 whitespace-nowrap">
              {quadrantStats[0].qty} analistas ({quadrantStats[0].pct})
            </p>
          </div>

          {/* 1º Quadrante */}
          <div className="bg-black border border-amber-900/60 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-950 text-amber-500 font-extrabold text-[10px] border border-amber-800/80 mb-0.5">1</span>
              <h4 className="text-xs font-bold text-amber-500">1º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Feedback</p>
            </div>
            <div className="w-full border-t border-amber-900/60 my-2" />
            <p className="text-xs font-bold text-amber-500 whitespace-nowrap">
              {quadrantStats[1].qty} analistas ({quadrantStats[1].pct})
            </p>
          </div>

          {/* 2º Quadrante */}
          <div className="bg-black border border-amber-900/60 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-950 text-amber-500 font-extrabold text-[10px] border border-amber-800/80 mb-0.5">2</span>
              <h4 className="text-xs font-bold text-amber-500">2º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Análise de reincidência + lado a lado</p>
            </div>
            <div className="w-full border-t border-amber-900/60 my-2" />
            <p className="text-xs font-bold text-amber-500 whitespace-nowrap">
              {quadrantStats[2].qty} analistas ({quadrantStats[2].pct})
            </p>
          </div>

          {/* 3º Quadrante */}
          <div className="bg-black border border-orange-900/60 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-950 text-orange-400 font-extrabold text-[10px] border border-orange-800/80 mb-0.5">3</span>
              <h4 className="text-xs font-bold text-orange-400">3º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Feedback formal + Medida disciplinar</p>
            </div>
            <div className="w-full border-t border-orange-900/60 my-2" />
            <p className="text-xs font-bold text-orange-400 whitespace-nowrap">
              {quadrantStats[3].qty} analistas ({quadrantStats[3].pct})
            </p>
          </div>

          {/* 4º Quadrante */}
          <div className="bg-black border border-red-900/60 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-950 text-red-400 font-extrabold text-[10px] border border-red-800/80 mb-0.5">4</span>
              <h4 className="text-xs font-bold text-red-400">4º Quadrante</h4>
              <p className="text-[11px] text-zinc-400 leading-tight">Avaliação de gestão + Medidas adm.</p>
            </div>
            <div className="w-full border-t border-red-900/60 my-2" />
            <p className="text-xs font-bold text-red-400 whitespace-nowrap">
              {quadrantStats[4].qty} analistas ({quadrantStats[4].pct})
            </p>
          </div>

          {/* >4 Persistência */}
          <div className="bg-black border border-rose-800/80 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-950 text-rose-300 font-extrabold text-[10px] border border-rose-800/80 mb-0.5">&gt;4</span>
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
          <>
            {filteredAnalysts.slice(0, displayLimit).map(analyst => (
              <div
                key={analyst.codigo + analyst.nome}
                onClick={() => setSelectedAnalyst(analyst)}
                className="w-full bg-zinc-900 border border-zinc-800 hover:border-amber-600/50 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col xl:flex-row items-center justify-between gap-4 xl:gap-6 group"
              >
              {/* Left: Avatar, Name, Code, Supervisor & Individual Esteira Boxes */}
              <div className="flex items-center gap-3.5 w-full xl:w-[350px] shrink-0 overflow-hidden">
                <div className="w-11 h-11 rounded-xl bg-black border border-zinc-800 flex items-center justify-center font-bold text-sm text-amber-500 group-hover:border-amber-600 transition-colors flex-shrink-0">
                  {analyst.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0">
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors truncate" title={analyst.nome}>
                    {analyst.nome}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-0.5 flex-wrap">
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
              <div className="w-full xl:w-[480px] shrink-0 bg-black border border-zinc-800/80 px-3 py-2.5 rounded-sm grid grid-cols-6 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Prod.</p>
                  <p className="text-sm font-bold text-blue-500 mt-0.5">{analyst.totalProdutividade}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Monit.</p>
                  <p className="text-sm font-bold text-white mt-0.5">{analyst.totalMonitorias}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Quali.</p>
                  <p className={`text-sm font-bold mt-0.5 ${getQualityColorClass(analyst.qualidadePct)}`}>{analyst.qualidadePct}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Erros</p>
                  <p className="text-sm font-bold text-white mt-0.5">{analyst.totalErros}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Reincid.</p>
                  <p className="text-sm font-bold text-red-400 mt-0.5">{analyst.reincidencias}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">TMO</p>
                  <p className="text-sm font-bold text-zinc-300 mt-0.5">{analyst.tmoMedio}m</p>
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
                <div className={`flex flex-col items-center justify-center w-[85px] py-1 rounded-sm border ${getScoreBadgeColor(analyst.scoreFormatted)}`}>
                  <span className="text-[10px] uppercase font-bold">{analyst.scoreFormatted.split(' - ')[0]}</span>
                  <span className="text-sm font-black">{analyst.score} pts</span>
                </div>
                <span className="flex items-center gap-1 text-amber-500 font-semibold text-xs group-hover:translate-x-1 transition-transform bg-black border border-zinc-800 px-3 py-1.5 rounded-sm">
                  Detalhes <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
          {displayLimit < filteredAnalysts.length && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setDisplayLimit(prev => prev + 50)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold py-2 px-6 rounded-md transition-colors border border-zinc-700 hover:border-zinc-600 shadow-sm"
              >
                Exibir mais 50 analistas
              </button>
            </div>
          )}
          </>
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
      </div>
      )}

      {/* DETAILED ANALYST FULL POPUP MODAL */}
      {selectedAnalyst && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-100 flex flex-col max-h-[90vh] overflow-hidden relative">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-800 flex items-center justify-center font-bold text-xl text-amber-500 shrink-0">
                    {selectedAnalyst.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{selectedAnalyst.nome}</h2>
                      {/* Média de Erros, TMO e Score formatados em blocos */}
                      <div className={`flex flex-col items-center justify-center w-[85px] py-1 rounded-sm border ${getScoreBadgeColor(selectedAnalyst.scoreFormatted)}`}>
                        <span className="text-[10px] uppercase font-bold">{selectedAnalyst.scoreFormatted.split(' - ')[0]}</span>
                        <span className="text-sm font-black">{selectedAnalyst.score} pts</span>
                      </div>

                      <span className="px-3 py-1.5 rounded-sm text-xs font-semibold text-zinc-300 bg-black border border-zinc-800 flex items-center gap-1.5">
                        <Activity size={13} className="text-amber-500" />
                        <span className="text-[10px] uppercase text-zinc-500">Média Erros:</span> <strong className="text-amber-500">{selectedAnalyst.mediaDiasEntreErros} dias</strong>
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
                        <span key={idx} className="text-[10px] font-semibold text-zinc-300 bg-black border border-zinc-800 px-2.5 py-0.5 rounded-md">
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

              {/* TOP KPI CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Produtividade</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-blue-500">{selectedAnalyst.totalProdutividade}</p>
                </div>

                <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Monitorias</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-white">{selectedAnalyst.totalMonitorias}</p>
                </div>

                <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Qualidade</p>
                  <p className={`text-xl sm:text-2xl font-extrabold ${getQualityColorClass(selectedAnalyst.qualidadePct)}`}>{selectedAnalyst.qualidadePct}%</p>
                </div>

                <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Erros</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-white">{selectedAnalyst.totalErros}</p>
                </div>

                <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">Reincidências</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-red-400">{selectedAnalyst.reincidencias}</p>
                </div>
                
                <div className="bg-black border border-zinc-800 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase font-bold tracking-wider">TMO</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-zinc-300">{selectedAnalyst.tmoMedio}m</p>
                </div>
              </div>


              {/* Visualização de Reincidências por tipos de erro e acompanhamento */}
              <div className="bg-black border border-zinc-800 p-6 rounded-sm space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-amber-500" />
                  Reincidências por tipos de erro e acompanhamento
                </h4>

                {selectedAnalyst.tagsDetalhadas.length > 0 ? (
                  <div className="space-y-3">
                    {selectedAnalyst.tagsDetalhadas.map((item, idx) => (
                      <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">{item.tag}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Erros acumulados nesta tag: <strong className="text-amber-500">{item.count} erro(s)</strong>
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
                <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3 uppercase">
                  <BarChart2 size={20} className="text-amber-500" />
                  DASH INDIVIDUAL DO ANALISTA
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Visual Erros por TAG */}
                  <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                        Erros por TAG
                      </h4>
                      <div className="flex items-center gap-2 bg-black/70 border border-zinc-800 px-3 py-1 rounded-md text-[10px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                        <span className="text-amber-500">Erros na TAG</span>
                      </div>
                    </div>

                    {selectedAnalyst.tagsDetalhadas.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={selectedAnalyst.tagsDetalhadas} margin={{ top: 20, right: 15, left: -15, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis dataKey="tag" stroke="#71717a" interval={0} tick={<CustomXAxisTick />} padding={{ left: 20, right: 20 }} />
                          <YAxis stroke="#71717a" tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                            itemStyle={{ color: '#FFFF00' }}
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                          />
                          <Bar dataKey="count" name="Quantidade" fill="#FFFF00" radius={[6, 6, 0, 0]}>
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
                      <PieChartIcon size={14} className="text-[#FFFF00]" />
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
                            itemStyle={{ color: '#FFFF00' }}
                          />
                          
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-zinc-500 py-10 text-center">Nenhum erro macro registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Histórico de Erros do Analista */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  Histórico de Erros do Analista ({selectedAnalyst.items.filter(isErrorItem).length})
                </h4>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedAnalyst.items.filter(isErrorItem).length > 0 ? (
                    selectedAnalyst.items.filter(isErrorItem).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-red-900/60 bg-red-950/20 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-zinc-400">{item.DataMonitoria}</span>
                          <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-red-950 border border-red-800 text-red-400">
                            NÃO CONFORME
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-zinc-300">
                          <p><strong className="text-zinc-500">Esteira:</strong> {item.Esteira}</p>
                          <p><strong className="text-zinc-500">TAG:</strong> {item.Tag}</p>
                          <p><strong className="text-zinc-500">Motivo Macro:</strong> {item.MotivoMacro}</p>
                          <p><strong className="text-zinc-500">Forma:</strong> {item.FormaMonitoria}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center border border-zinc-800/80 bg-zinc-950 rounded-xl space-y-1">
                      <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                      <p className="text-xs text-zinc-400 font-semibold">Analista 100% conforme! Nenhum erro registrado no período.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: Erros e Reincidências */}
      {popupAnalyst && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-zinc-100 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-500" />
                  Erros e reincidências
                </h2>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Analista: <strong className="text-white font-sans">{popupAnalyst.nome}</strong> ({popupAnalyst.codigo})
                </p>
              </div>

              
            </div>

            {/* Mini Gráfico de Erros por TAG */}
            <div className="bg-black border border-zinc-800 p-5 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={16} className="text-amber-500" />
                  Volume de Erros por TAG
                </h4>
                <div className="flex items-center gap-2 bg-black/70 border border-zinc-800 px-3 py-1 rounded-md text-[10px] font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                  <span className="text-amber-500">Erros na TAG</span>
                </div>
              </div>

              {popupAnalyst.tagsDetalhadas.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={popupAnalyst.tagsDetalhadas} margin={{ top: 20, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="tag" stroke="#71717a" tick={{ fontSize: 10 }} interval={0} padding={{ left: 15, right: 15 }} />
                    <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                      itemStyle={{ color: '#FFFF00' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    
                    <Bar dataKey="count" name="Erros na TAG" fill="#FFFF00" radius={[6, 6, 0, 0]} barSize={32}>
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
                <Layers size={15} className="text-amber-500" />
                Acompanhamento e Medidas por tipos de erro
              </h4>

              {popupAnalyst.tagsDetalhadas.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {popupAnalyst.tagsDetalhadas.map((item, idx) => (
                    <div key={idx} className="bg-black border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-white">{item.tag}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Quantidade: <strong className="text-amber-500">{item.count} erro(s)</strong>
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

      {/* Custom Dark Designed Hover Popover Tooltip for Diagram Analyst Dots */}
      {hoveredDiagramAnalyst && (
        <div 
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-zinc-900/95 backdrop-blur-md border border-amber-500/50 p-3.5 rounded-xl shadow-2xl text-xs space-y-2.5 w-64 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${hoveredDiagramAnalyst.mouseX}px`,
            top: `${hoveredDiagramAnalyst.mouseY - 8}px`
          }}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="overflow-hidden pr-2">
              <h5 className="font-extrabold text-white text-xs truncate">{hoveredDiagramAnalyst.analyst.nome}</h5>
              <span className="text-[10px] text-zinc-400 font-mono">{hoveredDiagramAnalyst.analyst.codigo}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${hoveredDiagramAnalyst.analyst.prodQuadrantBg}`}>
              {hoveredDiagramAnalyst.analyst.prodQuadrant}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-black/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 text-[9px] block font-semibold uppercase">Qualidade</span>
              <span className={`font-black text-xs ${getQualityColorClass(hoveredDiagramAnalyst.analyst.qualidadePct)}`}>
                {hoveredDiagramAnalyst.analyst.qualidadePct}%
              </span>
            </div>

            <div className="bg-black/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 text-[9px] block font-semibold uppercase">Produção</span>
              <span className="font-black text-xs text-blue-400">
                {hoveredDiagramAnalyst.analyst.totalProdutividade} un.
              </span>
            </div>

            <div className="bg-black/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 text-[9px] block font-semibold uppercase">Erros</span>
              <span className="font-black text-xs text-red-400">
                {hoveredDiagramAnalyst.analyst.totalErros}
              </span>
            </div>

            <div className="bg-black/70 p-2 rounded-lg border border-zinc-800">
              <span className="text-zinc-500 text-[9px] block font-semibold uppercase">Supervisor</span>
              <span className="font-bold text-zinc-300 truncate block text-[10px]" title={hoveredDiagramAnalyst.analyst.supervisor}>
                {hoveredDiagramAnalyst.analyst.supervisor}
              </span>
            </div>
          </div>

          <p className="text-[9px] text-amber-400 text-center font-semibold pt-0.5">
            Clique no ponto para selecionar a ficha
          </p>
        </div>
      )}
    </div>
  );
};
