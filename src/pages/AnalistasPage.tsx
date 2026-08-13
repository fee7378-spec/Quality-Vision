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
import { useStore, MonitoringItem, ProductivityItem, normalizeName, isValidAnalystName, matchesFilter, matchesFormaFilter, formatDateToBR, getTabuladorName, getSupervisorCode, getAnalystCode } from '../store/useStore';
import { useTokenStore } from '../store/useTokenStore';
import { ErrorDetailModal } from '../components/ErrorDetailModal';

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
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-300'
    };
  }
  if (count === 1) {
    return {
      nivel: 1,
      titulo: '1º Feedback',
      descricao: '1º Feedback',
      colorClass: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
    };
  }
  if (count === 2) {
    return {
      nivel: 2,
      titulo: '2º Quadrante',
      descricao: '2º Análise de reincidência + lado a lado',
      colorClass: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
    };
  }
  if (count === 3) {
    return {
      nivel: 3,
      titulo: '3º Quadrante',
      descricao: '3º Feedback formal + Medida disciplinar',
      colorClass: 'bg-orange-50 text-orange-700 border-orange-300'
    };
  }
  if (count === 4) {
    return {
      nivel: 4,
      titulo: '4º Quadrante',
      descricao: '4º Avaliação de gestão + Medidas administrativas',
      colorClass: 'bg-red-50 text-red-700 border-red-300'
    };
  }
  return {
    nivel: 5,
    titulo: 'Persistência',
    descricao: '+ de 4 erros Persistência',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold'
  };
};

export const getQualityColorClass = (pct: number) => {
  if (pct >= 97) return 'text-emerald-600';
  if (pct >= 95) return 'text-brand-blue';
  if (pct >= 92) return 'text-orange-600';
  return 'text-red-600';
};

export const getQualityBadgeClass = (pct: number) => {
  if (pct >= 97) return 'bg-emerald-50 text-emerald-700 border-emerald-300';
  if (pct >= 95) return 'bg-blue-50/70 text-brand-blue border-gray-300/80';
  if (pct >= 92) return 'bg-orange-50 text-orange-700 border-orange-300';
  return 'bg-red-50 text-red-700 border-red-300';
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
  id: string;
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
  metaDiaria: number;
  items: MonitoringItem[];
  prodItems: ProductivityItem[];
}


const DONUT_PALETTE = ['#001E62', '#001E62', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#001E62'];

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

export const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : undefined;
};

export const getQuadranteForAnalyst = (maxErrorsInSingleTag: number, distinctTagsCount: number, totalErros: number): QuadranteInfo => {
  if (totalErros <= 0) {
    return {
      nivel: 0,
      titulo: 'Conforme',
      descricao: 'Conforme - Sem erros',
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-300'
    };
  }
  if (distinctTagsCount >= 3) {
    return {
      nivel: 4,
      titulo: '4º Quadrante',
      descricao: '4º Quadrante - Erros em 3 ou mais tags diferentes',
      colorClass: 'bg-red-50 text-red-700 border-red-300'
    };
  }
  if (maxErrorsInSingleTag >= 3) {
    return {
      nivel: 3,
      titulo: '3º Quadrante',
      descricao: '3º Quadrante - 3 ou mais erros na mesma tag',
      colorClass: 'bg-orange-50 text-orange-700 border-orange-300'
    };
  }
  if (maxErrorsInSingleTag === 2) {
    return {
      nivel: 2,
      titulo: '2º Quadrante',
      descricao: '2º Quadrante - Reincidente na mesma tag',
      colorClass: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
    };
  }
  return {
    nivel: 1,
    titulo: '1º Quadrante',
    descricao: '1º Quadrante - 1 erro por tag',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-300'
  };
};

export const getQuadranteForTag = (tagCount: number, distinctTagsCount: number): QuadranteInfo => {
  if (distinctTagsCount >= 3) {
    return {
      nivel: 4,
      titulo: '4º Quadrante',
      descricao: '4º Quadrante - Erros em 3 ou mais tags diferentes',
      colorClass: 'bg-red-50 text-red-700 border-red-300'
    };
  }
  if (tagCount >= 3) {
    return {
      nivel: 3,
      titulo: '3º Quadrante',
      descricao: '3º Quadrante - 3 ou mais erros nesta tag',
      colorClass: 'bg-orange-50 text-orange-700 border-orange-300'
    };
  }
  if (tagCount === 2) {
    return {
      nivel: 2,
      titulo: '2º Quadrante',
      descricao: '2º Quadrante - Reincidente nesta tag',
      colorClass: 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
    };
  }
  return {
    nivel: 1,
    titulo: '1º Quadrante',
    descricao: '1º Quadrante - 1 erro nesta tag',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-300'
  };
};

export const AnalistasPage = () => {
  const { accessType } = useTokenStore();
  const isVisualizacao = accessType === 'visualizacao';

  const { 
    data, 
    productivityData,
    volumetriaAnalistas,
    monitorias,
    monitoriaErros,
    capacity,
    startDate, 
    endDate, 
    selectedEsteira, 
    selectedForma,
    analystSearchQuery,
    setAnalystSearchQuery,
    esteiraParams,
    esteiraMappings
  } = useStore();

  const [activeTab, setActiveTab] = useState<'individual' | 'dispersao'>('individual');
  const [selectedAnalyst, setSelectedAnalyst] = useState<AnalystSummary | null>(null);
  const [popupAnalyst, setPopupAnalyst] = useState<AnalystSummary | null>(null);
  const [displayLimit, setDisplayLimit] = useState(15);
  const [rankingLimit, setRankingLimit] = useState<number>(10);
  const [rankingCategory, setRankingCategory] = useState<'geral' | 'qualidade' | 'produtividade'>('geral');
  const [selectedDiagramAnalyst, setSelectedDiagramAnalyst] = useState<AnalystDispersalData | null>(null);
  const [hoveredDiagramAnalyst, setHoveredDiagramAnalyst] = useState<{ analyst: AnalystDispersalData; mouseX: number; mouseY: number } | null>(null);
  const [selectedErrorDetail, setSelectedErrorDetail] = useState<any | null>(null);

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(15);
    setRankingLimit(10);
  }, [startDate, endDate, selectedEsteira, selectedForma, analystSearchQuery]);

  // Ensure scroll stays at top when activeTab or page changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

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
  const isErrorItem = (item: any) => {
    if (!item) return false;
    if (getVal(item, 'macroTag') !== undefined || getVal(item, 'tag') !== undefined) {
      if (!matchesFormaFilter(selectedForma, item)) return false;
      return true;
    }
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
    if (!matchesFormaFilter(selectedForma, item)) return false;
    return true;
  };

  // Filter raw monitoria data by date and esteira
  const filteredRawData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFormaFilter(selectedForma, item)) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedEsteira, selectedForma]);

  // Filter raw productivity data by date and esteira
  const filteredProdData = useMemo(() => {
    return productivityData.filter(item => {
      if (startDate && item.DataProdutividade && item.DataProdutividade < startDate) return false;
      if (endDate && item.DataProdutividade && item.DataProdutividade > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      return true;
    });
  }, [productivityData, startDate, endDate, selectedEsteira]);

  // Filter Supabase tables by date and esteira
  const filteredVolumetria = useMemo(() => {
    return (volumetriaAnalistas || []).filter(v => {
      const d = getVal(v, 'data');
      if (startDate && d && d < startDate) return false;
      if (endDate && d && d > endDate) return false;
      const est = getVal(v, 'esteira');
      if (!matchesFilter(selectedEsteira, est, 'TODAS')) return false;
      return true;
    });
  }, [volumetriaAnalistas, startDate, endDate, selectedEsteira]);

  const filteredMonitorias = useMemo(() => {
    return (monitorias || []).filter(m => {
      const d = getVal(m, 'data');
      if (startDate && d && d < startDate) return false;
      if (endDate && d && d > endDate) return false;
      const est = getVal(m, 'esteira');
      if (!matchesFilter(selectedEsteira, est, 'TODAS')) return false;
      if (!matchesFormaFilter(selectedForma, m)) return false;
      return true;
    });
  }, [monitorias, startDate, endDate, selectedEsteira, selectedForma]);

  const filteredMonitoriaErros = useMemo(() => {
    return (monitoriaErros || []).filter(e => {
      const d = getVal(e, 'data');
      if (startDate && d && d < startDate) return false;
      if (endDate && d && d > endDate) return false;
      const est = getVal(e, 'esteira');
      if (!matchesFilter(selectedEsteira, est, 'TODAS')) return false;
      if (!matchesFormaFilter(selectedForma, e)) return false;
      const macroTag = getVal(e, 'macroTag');
      if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
        return false;
      }
      return true;
    });
  }, [monitoriaErros, startDate, endDate, selectedEsteira, selectedForma]);

  // Group all filtered data by Analyst name
  const analystsList = useMemo(() => {
    const analystNamesMap: Record<string, string> = {};

    // First pass: collect all analyst names
    filteredVolumetria.forEach(v => {
      const raw = getVal(v, 'analista');
      if (raw && isValidAnalystName(raw)) {
        const key = normalizeName(raw);
        if (key && !analystNamesMap[key]) analystNamesMap[key] = String(raw).trim().toUpperCase();
      }
    });

    filteredMonitorias.forEach(m => {
      const raw = getVal(m, 'analista');
      if (raw && isValidAnalystName(raw)) {
        const key = normalizeName(raw);
        if (key && !analystNamesMap[key]) analystNamesMap[key] = String(raw).trim().toUpperCase();
      }
    });

    filteredMonitoriaErros.forEach(e => {
      const raw = getVal(e, 'analista');
      if (raw && isValidAnalystName(raw)) {
        const key = normalizeName(raw);
        if (key && !analystNamesMap[key]) analystNamesMap[key] = String(raw).trim().toUpperCase();
      }
    });

    // Fallback if Supabase tables are empty
    if (Object.keys(analystNamesMap).length === 0) {
      filteredRawData.forEach(item => {
        const rawName = item.NomeAnalista ? item.NomeAnalista.trim() : '';
        if (!isValidAnalystName(rawName)) return;
        const key = normalizeName(rawName);
        if (!key) return;
        if (!analystNamesMap[key]) analystNamesMap[key] = rawName.toUpperCase();
      });
      filteredProdData.forEach(p => {
        const rawName = p.NomeAnalista ? p.NomeAnalista.trim() : '';
        if (!isValidAnalystName(rawName)) return;
        const key = normalizeName(rawName);
        if (!key) return;
        if (!analystNamesMap[key]) analystNamesMap[key] = rawName.toUpperCase();
      });
    }

    // Optimization: Group all data by key in one pass before mapping
    const volByAnalyst = new Map<string, any[]>();
    const monByAnalyst = new Map<string, any[]>();
    const errByAnalyst = new Map<string, any[]>();
    const rawByAnalyst = new Map<string, any[]>();
    const prodByAnalyst = new Map<string, any[]>();

    filteredVolumetria.forEach(v => {
      const k = normalizeName(getVal(v, 'analista'));
      if (k) {
        if (!volByAnalyst.has(k)) volByAnalyst.set(k, []);
        volByAnalyst.get(k)!.push(v);
      }
    });
    filteredMonitorias.forEach(m => {
      const k = normalizeName(getVal(m, 'analista'));
      if (k) {
        if (!monByAnalyst.has(k)) monByAnalyst.set(k, []);
        monByAnalyst.get(k)!.push(m);
      }
    });
    filteredMonitoriaErros.forEach(e => {
      const k = normalizeName(getVal(e, 'analista'));
      if (k) {
        if (!errByAnalyst.has(k)) errByAnalyst.set(k, []);
        errByAnalyst.get(k)!.push(e);
      }
    });
    filteredRawData.forEach(i => {
      const k = normalizeName(i.NomeAnalista);
      if (k) {
        if (!rawByAnalyst.has(k)) rawByAnalyst.set(k, []);
        rawByAnalyst.get(k)!.push(i);
      }
    });
    filteredProdData.forEach(p => {
      const k = normalizeName(p.NomeAnalista);
      if (k) {
        if (!prodByAnalyst.has(k)) prodByAnalyst.set(k, []);
        prodByAnalyst.get(k)!.push(p);
      }
    });

    const allAnalystKeys = Object.keys(analystNamesMap).sort((a, b) => analystNamesMap[a].localeCompare(analystNamesMap[b]));

    return allAnalystKeys.map((key): AnalystSummary => {
      const nome = analystNamesMap[key];

      // Volumetria rows for this analyst (from optimized map)
      const volRows = volByAnalyst.get(key) || [];
      const totalProdutividade = volRows.length > 0 
        ? volRows.reduce((sum, v) => sum + (Number(getVal(v, 'quantidade')) || Number(v.quantidade) || 0), 0)
        : ((prodByAnalyst.get(key) || []).reduce((sum, p) => sum + (Number(p.Quantidade) || 1), 0));

      // Monitoria rows for this analyst
      const monRows = monByAnalyst.get(key) || [];
      const totalMonitorias = monRows.length > 0
        ? monRows.reduce((sum, m) => sum + (Number(getVal(m, 'quantidade')) || Number(m.quantidade) || 0), 0)
        : ((rawByAnalyst.get(key) || []).length);

      // Errors rows for this analyst
      const errRows = errByAnalyst.get(key) || [];
      const fallbackErrRows = (rawByAnalyst.get(key) || []).filter(i => isErrorItem(i));
      
      const effectiveErrRows = (filteredMonitoriaErros.length > 0 || filteredMonitorias.length > 0) ? errRows : fallbackErrRows;
      const totalErros = effectiveErrRows.length;

      // Qualidade %
      const isDoubleCheck = Array.isArray(selectedForma) 
        ? selectedForma.includes('Double Check') && selectedForma.length === 1 
        : selectedForma === 'Double Check';
      
      const baseForQuality = isDoubleCheck ? totalProdutividade : totalMonitorias;
      
      const qualidadePct = baseForQuality > 0
        ? Number((((baseForQuality - totalErros) / baseForQuality) * 100).toFixed(1))
        : 100;

      // Tag breakdown & Reincidências
      const tagCount: Record<string, number> = {};
      effectiveErrRows.forEach(e => {
        const rawTag = getVal(e, 'tag') || (e as any).Tag;
        const tagStr = (rawTag && String(rawTag).trim() !== '' && String(rawTag).toLowerCase() !== 'null') ? String(rawTag).trim() : 'Sem Tag';
        tagCount[tagStr] = (tagCount[tagStr] || 0) + 1;
      });

      // Reincidências: para cada tag com count > 1, reincidências = count - 1
      let reincidencias = 0;
      Object.values(tagCount).forEach(cnt => {
        if (cnt > 1) {
          reincidencias += (cnt - 1);
        }
      });

      const distinctTagsCount = Object.keys(tagCount).length;
      let maxTagErrorCount = 0;
      Object.values(tagCount).forEach(cnt => {
        if (cnt > maxTagErrorCount) maxTagErrorCount = cnt;
      });

      // Quadrante do Analista
      const maxQuadrante = getQuadranteForAnalyst(maxTagErrorCount, distinctTagsCount, totalErros);

      // Tags detalhadas com quadrante por tag
      const tagsDetalhadas: TagErrorDetail[] = Object.entries(tagCount)
        .map(([tag, count]) => ({
          tag,
          count,
          quadrante: getQuadranteForTag(count, distinctTagsCount)
        }))
        .sort((a, b) => b.count - a.count);

      // Erros por Motivo Macro
      const macroCount: Record<string, number> = {};
      effectiveErrRows.forEach(e => {
        const rawMacro = getVal(e, 'macroTag') || (e as any).MotivoMacro;
        const macroStr = (rawMacro && String(rawMacro).trim() !== '' && String(rawMacro).toLowerCase() !== 'null') ? String(rawMacro).trim() : 'Outros';
        macroCount[macroStr] = (macroCount[macroStr] || 0) + 1;
      });
      const macrosDetalhados: MacroErrorDetail[] = Object.entries(macroCount)
        .map(([macro, count]) => ({ macro, count }))
        .sort((a, b) => b.count - a.count);

      // Supervisor, Código, Esteiras
      const sampleItem = errRows[0] || monRows[0] || volRows[0] || filteredRawData.find(i => normalizeName(i.NomeAnalista) === key) || nome;
      const rawSupervisor = getVal(errRows[0], 'supervisor') || getVal(monRows[0], 'supervisor') || (filteredRawData.find(i => normalizeName(i.NomeAnalista) === key)?.NomeSupervisor) || 'SUPERVISOR GERAL';
      const codigo = getAnalystCode(sampleItem);
      const supervisor = isVisualizacao ? getSupervisorCode({ supervisor: rawSupervisor, NomeSupervisor: rawSupervisor }) : rawSupervisor;
      const nomeDisplay = isVisualizacao ? codigo : nome;

      const estSet = new Set<string>();
      volRows.forEach(v => { const est = getVal(v, 'esteira'); if (est) estSet.add(String(est)); });
      monRows.forEach(m => { const est = getVal(m, 'esteira'); if (est) estSet.add(String(est)); });
      errRows.forEach(e => { const est = getVal(e, 'esteira'); if (est) estSet.add(String(est)); });
      if (estSet.size === 0) {
        filteredRawData.filter(i => normalizeName(i.NomeAnalista) === key).forEach(i => { if (i.Esteira) estSet.add(i.Esteira); });
      }
      const esteiras = Array.from(estSet);

      // --- Meta Diária Calculation ---
      // 1. Primary esteira
      const esteiraCounts: Record<string, number> = {};
      volRows.forEach(item => {
          const est = getVal(item, 'esteira') || item.Esteira;
          if (est) {
              esteiraCounts[est] = (esteiraCounts[est] || 0) + (Number(getVal(item, 'quantidade')) || 1);
          }
      });
      let primaryE = '';
      let maxCount = -1;
      Object.entries(esteiraCounts).forEach(([est, count]) => {
          if (count > maxCount) {
              maxCount = count;
              primaryE = est;
          }
      });

      let metaDiaria = 40; // Default
      if (primaryE) {
          const capItem = capacity.find(c => getVal(c, 'esteira') === primaryE);
          if (capItem) {
              const tmoStr = getVal(capItem, 'tmoMinuto') || '00:00:00';
              const horaStr = getVal(capItem, 'horaDiaria') || '08:00:00';
              
              const parseTime = (str: any) => {
                  if (typeof str !== 'string' || !str.includes(':')) return Number(str) || 0;
                  const parts = str.split(':');
                  const h = parseInt(parts[0], 10) || 0;
                  const m = parseInt(parts[1], 10) || 0;
                  const s = parseInt(parts[2], 10) || 0;
                  return h * 60 + m + s / 60;
              };

              const tmoMin = parseTime(tmoStr);
              const horaMin = parseTime(horaStr);
              
              if (tmoMin > 0) {
                  metaDiaria = horaMin / tmoMin;
              }
          }
      }
      // -------------------------------

      // Intervalo médio entre erros (dias)
      const errorDates = effectiveErrRows
        .map(e => getVal(e, 'data') || (e as any).DataMonitoria)
        .filter((d): d is string => Boolean(d) && typeof d === 'string')
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
      }

      const score = Math.round(qualidadePct);
      let categoria = 'Crítico';
      if (qualidadePct >= 97) categoria = 'Excelente';
      else if (qualidadePct >= 95) categoria = 'Bom';
      else if (qualidadePct >= 92) categoria = 'Regular';

      const scoreFormatted = `${categoria} - ${score}pts`;

      const tmoMedio = totalProdutividade > 0 ? (totalProdutividade > 50 ? "12.5" : "15.0") : "0.0";

      return {
        id: key,
        codigo,
        nome: nomeDisplay,
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
        metaDiaria,
        items: effectiveErrRows as any[],
        prodItems: volRows as any[]
      };
    });
  }, [filteredVolumetria, filteredMonitorias, filteredMonitoriaErros, filteredRawData, filteredProdData, capacity]);


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
      if (!analystSearchQuery.trim()) return true;
      const term = analystSearchQuery.toLowerCase();
      return (
        a.nome.toLowerCase().includes(term) || 
        a.codigo.toLowerCase().includes(term) ||
        a.supervisor.toLowerCase().includes(term) ||
        a.esteiras.some(e => e.toLowerCase().includes(term))
      );
    });
  }, [analystsList, analystSearchQuery]);

  // Calculate Polar Dispersal Data (Q1, Q2, Q3, Q4 Productivity based on Esteira Meta & Radial Quality)
  const dispersalData = useMemo(() => {
    if (filteredAnalysts.length === 0) return [];

    // Helper to calculate business days (Mon-Fri) in selected period
    const getBusinessDaysInPeriod = () => {
      if (!startDate || !endDate) return 22;
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 22;
      let count = 0;
      const cur = new Date(d1);
      while (cur <= d2) {
        const dayOfWeek = cur.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      return Math.max(1, count);
    };

    const businessDays = getBusinessDaysInPeriod();

    const analystsWithQuad = filteredAnalysts.map((analyst) => {
      // Determine analyst's daily target meta from their esteira(s)
      let metaDiaria = analyst.metaDiaria;
//       if (analyst.esteiras && analyst.esteiras.length > 0) {
//         const primaryE = analyst.esteiras[0];
//         if (esteiraParams[primaryE]?.metaDiaria) {
//           metaDiaria = esteiraParams[primaryE].metaDiaria;
//         }
//       }

      // Expected goal for the period
      const targetForPeriod = Math.max(1, metaDiaria * businessDays);
      const metaPercent = (analyst.totalProdutividade / targetForPeriod) * 100;

      let prodQuadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4' = 'Q4';
      let prodQuadrantName = 'Q4 • Pior (< 90% da Meta)';
      let prodQuadrantColor = '#ef4444';
      let prodQuadrantBg = 'bg-red-50 text-red-700 border-red-300';
      let prodQuadrantBorder = 'border-red-800';
      let angleMin = 190;
      let angleMax = 260; // Bottom-Left sector (180°..270°)

      if (metaPercent >= 110) {
        prodQuadrant = 'Q1';
        prodQuadrantName = 'Q1 • Excelente (>= 110% da Meta)';
        prodQuadrantColor = '#10b981';
        prodQuadrantBg = 'bg-emerald-50 text-emerald-700 border-emerald-300';
        prodQuadrantBorder = 'border-emerald-800';
        angleMin = 100;
        angleMax = 170; // Top-Left sector (90°..180°)
      } else if (metaPercent >= 100) {
        prodQuadrant = 'Q2';
        prodQuadrantName = 'Q2 • Meta Atingida (100% - 110%)';
        prodQuadrantColor = '#001E62';
        prodQuadrantBg = 'bg-blue-50/80 text-brand-blue-light border-gray-300';
        prodQuadrantBorder = 'border-gray-300';
        angleMin = 10;
        angleMax = 80; // Top-Right sector (0°..90°)
      } else if (metaPercent >= 90) {
        prodQuadrant = 'Q3';
        prodQuadrantName = 'Q3 • Abaixo da Meta (90% - 100%)';
        prodQuadrantColor = '#f97316';
        prodQuadrantBg = 'bg-orange-50 text-orange-700 border-orange-300';
        prodQuadrantBorder = 'border-orange-800';
        angleMin = 280;
        angleMax = 350; // Bottom-Right sector (270°..360°)
      }

      return {
        analyst,
        metaPercent,
        targetForPeriod,
        prodQuadrant,
        prodQuadrantName,
        prodQuadrantColor,
        prodQuadrantBg,
        prodQuadrantBorder,
        prodRatio: metaPercent / 100,
        angleMin,
        angleMax
      };
    });

    return analystsWithQuad.map(({ analyst, metaPercent, targetForPeriod, prodQuadrant, prodQuadrantName, prodQuadrantColor, prodQuadrantBg, prodQuadrantBorder, prodRatio, angleMin, angleMax }) => {
      const cx = 260;
      const cy = 260;
      const Rmax = 210;
      const Rmin = 18;

      const qualityFraction = Math.max(0, Math.min(100, analyst.qualidadePct - 50)) / 50;
      const r = Rmin + qualityFraction * (Rmax - Rmin);

      const quadrantGroup = analystsWithQuad
        .filter(item => item.prodQuadrant === prodQuadrant)
        .sort((a, b) => b.analyst.totalProdutividade - a.analyst.totalProdutividade);

      const subIndex = Math.max(0, quadrantGroup.findIndex(item => item.analyst.id === analyst.id));
      const subCount = Math.max(1, quadrantGroup.length);
      const subFraction = subCount > 1 ? subIndex / (subCount - 1) : 0.5;

      const angleDeg = angleMin + subFraction * (angleMax - angleMin);
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = cx + r * Math.cos(angleRad);
      const y = cy - r * Math.sin(angleRad);

      const quadrantPenalty = prodQuadrant === 'Q4' ? 400 : prodQuadrant === 'Q3' ? 300 : prodQuadrant === 'Q2' ? 200 : 100;
      const qualityLossPenalty = (100 - analyst.qualidadePct) * 10;
      const errorsPenalty = analyst.totalErros * 15;
      const reincidenciasPenalty = analyst.reincidencias * 20;

      const worstIndex = quadrantPenalty + qualityLossPenalty + errorsPenalty + reincidenciasPenalty;

      return {
        ...analyst,
        metaPercent,
        targetForPeriod,
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
      } as AnalystDispersalData & { metaPercent: number; targetForPeriod: number };
    });
  }, [filteredAnalysts, esteiraParams, startDate, endDate]);

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
    <div className="w-full bg-gray-50 p-4 sm:p-6 md:p-8 space-y-8 text-gray-900 relative">
      {/* Navigation Tabs Switcher & Top-Right Active Analysts counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        {/* Left: Tab Selector Switcher */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-xl shrink-0 shadow-lg">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'individual' 
                ? 'bg-brand-blue-dark text-white shadow-md shadow-brand-blue/20' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={15} />
            Análise Individual
          </button>
          <button
            onClick={() => setActiveTab('dispersao')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dispersao' 
                ? 'bg-brand-blue-dark text-white shadow-md shadow-brand-blue/20' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Activity size={15} />
            Diagrama de Dispersão
          </button>
        </div>

        {/* Right side: Active Analysts counter (placed on top right per prompt) */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-white/60 border border-gray-200 px-3.5 py-2 rounded-xl self-end sm:self-auto">
          <Users size={14} className="text-brand-blue" />
          <span><strong className="text-gray-900">{filteredAnalysts.length}</strong> analistas ativos nesta base</span>
        </div>
      </div>

      {activeTab === 'dispersao' ? (
        /* TAB 2: DIAGRAMA DE DISPERSÃO (QUADRANTES Q1..Q4 & QUALIDADE RADIAL) */
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Quadrant Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Q1 Positivo */}
            <div className="bg-white border border-emerald-300 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-300">
                  Q1 • 110%+ da Meta
                </span>
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q1').length} <span className="text-xs font-normal text-gray-500">analistas</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Alta Produtividade (&gt;= 110%)</p>
              </div>
            </div>

            {/* Q2 Mediano */}
            <div className="bg-white border border-blue-300 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-blue-50 text-brand-blue-light border border-gray-300">
                  Q2 • 100% - 110% da Meta
                </span>
                <BarChart2 size={18} className="text-brand-blue-light" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q2').length} <span className="text-xs font-normal text-gray-500">analistas</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Meta Batida (100% a 110%)</p>
              </div>
            </div>

            {/* Q3 Ruim */}
            <div className="bg-white border border-orange-300 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-orange-100 text-orange-700 border border-orange-300">
                  Q3 • 90% - 100% da Meta
                </span>
                <AlertTriangle size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q3').length} <span className="text-xs font-normal text-gray-500">analistas</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Abaixo da Meta (90% a 100%)</p>
              </div>
            </div>

            {/* Q4 Pior */}
            <div className="bg-white border border-red-300 p-4 rounded-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-300">
                  Q4 • &lt; 90% da Meta
                </span>
                <ShieldAlert size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">
                  {dispersalData.filter(d => d.prodQuadrant === 'Q4').length} <span className="text-xs font-normal text-gray-500">analistas</span>
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Produtividade Crítica (&lt; 90%)</p>
              </div>
            </div>
          </div>

          {/* DISPERSAL SCATTER CHART CARD */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-brand-blue flex items-center gap-2 uppercase">
                  <Activity className="text-brand-blue" size={20} />
                  DIAGRAMA DE DISPERSÃO — PRODUTIVIDADE X QUALIDADE
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mapeamento em 4 quadrantes de produtividade com raio radial representando a taxa de qualidade (Centro = 0% → Borda = 100%)
                </p>
              </div>

              {/* Chart Legend Summary */}
              <div className="flex items-center gap-3 text-xs flex-wrap bg-gray-50 border border-gray-200 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Q1 (&ge;110%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-brand-blue font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-blue inline-block" />
                  <span>Q2 (100% - 110%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-orange-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                  <span>Q3 (90% - 100%)</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Q4 (&lt;90%)</span>
                </div>
              </div>
            </div>

            {/* SVG Interactive Polar Scatter Chart Area */}
            <div className="flex flex-col lg:flex-row items-center justify-around gap-8 py-2">
              <div className="relative w-full max-w-[520px] aspect-square flex items-center justify-center bg-gray-50/90 border border-gray-200 rounded-2xl p-4 shadow-2xl overflow-hidden">
                <svg viewBox="0 0 520 520" className="w-full h-full select-none overflow-visible">
                  <defs>
                    <radialGradient id="polarGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="70%" stopColor="#f3f4f6" stopOpacity="1" />
                      <stop offset="100%" stopColor="#e5e7eb" stopOpacity="1" />
                    </radialGradient>
                    
                    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.3" />
                    </filter>

                    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
                    </marker>
                  </defs>

                  {/* Outer Main Circle (100% Quality Border) */}
                  <circle cx="260" cy="260" r="210" fill="url(#polarGrad)" stroke="#d1d5db" strokeWidth="2" />

                  {/* Concentric Dashed Quality Rings */}
                  {/* 62.5% Ring */}
                  <circle cx="260" cy="260" r="63.75" fill="none" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="260" y="193" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">62.5% Qualidade</text>

                  {/* 75% Ring */}
                  <circle cx="260" cy="260" r="112.5" fill="none" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="260" y="144" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">75.0% Qualidade</text>

                  {/* 87.5% Ring */}
                  <circle cx="260" cy="260" r="161.25" fill="none" stroke="#d1d5db" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="260" y="95" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="bold">87.5% Qualidade</text>

                  {/* Outer Quality Border Labels */}
                  <text x="260" y="44" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="extrabold">100% Qualidade (Borda)</text>
                  <text x="260" y="278" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="extrabold">50% Qualidade (Centro)</text>

                  {/* Crosshair Dividers (Q1, Q2, Q3, Q4 Axis) */}
                  <line x1="260" y1="50" x2="260" y2="470" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="6 4" />
                  <line x1="50" y1="260" x2="470" y2="260" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="6 4" />

                  {/* Quadrant Titles - Positioned in outer corners so they never overlap analyst dots */}
                  {/* Q1: Top-Left */}
                  <g transform="translate(65, 26)">
                    <rect x="-55" y="-13" width="110" height="26" rx="6" fill="#ecfdf5" stroke="#6ee7b7" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="extrabold">Q1 • &ge; 110%</text>
                  </g>

                  {/* Q2: Top-Right */}
                  <g transform="translate(455, 26)">
                    <rect x="-60" y="-13" width="120" height="26" rx="6" fill="#eff6ff" stroke="#93c5fd" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#001E62" fontSize="11" fontWeight="extrabold">Q2 • 100% - 110%</text>
                  </g>

                  {/* Q3: Bottom-Right */}
                  <g transform="translate(455, 494)">
                    <rect x="-60" y="-13" width="120" height="26" rx="6" fill="#fff7ed" stroke="#fdba74" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#c2410c" fontSize="11" fontWeight="extrabold">Q3 • 90% - 100%</text>
                  </g>

                  {/* Q4: Bottom-Left */}
                  <g transform="translate(65, 494)">
                    <rect x="-50" y="-13" width="100" height="26" rx="6" fill="#fef2f2" stroke="#fca5a5" strokeWidth="1" />
                    <text x="0" y="4" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="extrabold">Q4 • &lt; 90%</text>
                  </g>

                  {/* Analyst Dots (Bolinhas - Totalmente fixas e sem vibração no hover) */}
                  {dispersalData.map((item) => {
                    const isSelected = selectedDiagramAnalyst?.id === item.id;
                    const isSearched = analystSearchQuery.trim().length > 0 && (
                      item.nome.toLowerCase().includes(analystSearchQuery.toLowerCase()) || 
                      item.codigo.toLowerCase().includes(analystSearchQuery.toLowerCase())
                    );

                    return (
                      <g 
                        key={item.id}
                        onClick={() => setSelectedDiagramAnalyst(item)}
                        onMouseEnter={(e) => setHoveredDiagramAnalyst({ analyst: item, mouseX: e.clientX, mouseY: e.clientY })}
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
                              stroke={isSearched ? "#001E62" : item.prodQuadrantColor} 
                              strokeWidth="1.5" 
                              className="opacity-25" 
                            />
                            <circle 
                              cx={item.x} 
                              cy={item.y} 
                              r="16" 
                              fill="none" 
                              stroke={isSearched ? "#001E62" : item.prodQuadrantColor} 
                              strokeWidth="2" 
                              strokeDasharray="3 2"
                              className="opacity-90" 
                            />
                          </>
                        )}

                        {/* Outer thin black ring */}
                        <circle 
                          cx={item.x} 
                          cy={item.y} 
                          r={isSelected || isSearched ? "12" : "9.5"} 
                          fill="none"
                          stroke="#000000" 
                          strokeWidth="1"
                        />
                        {/* Inner circle with thin white border */}
                        <circle 
                          cx={item.x} 
                          cy={item.y} 
                          r={isSelected || isSearched ? "11" : "8.5"} 
                          fill={isSearched ? "#001E62" : item.prodQuadrantColor} 
                          stroke="#ffffff" 
                          strokeWidth="1.2"
                          className="transition-all duration-150"
                          filter="url(#dotGlow)"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Analyst Side Card */}
              <div className="w-full lg:w-[380px] bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-4 shadow-xl">
                {selectedDiagramAnalyst ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-300 flex items-center justify-center font-bold text-brand-blue text-sm shrink-0">
                          {selectedDiagramAnalyst.nome.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{selectedDiagramAnalyst.nome}</h4>
                          <p className="text-[11px] font-mono text-gray-500">{selectedDiagramAnalyst.codigo} • Sup: {selectedDiagramAnalyst.supervisor}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDiagramAnalyst(null)}
                        className="p-1 text-gray-400 hover:text-gray-900"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Quadrant Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Quadrante de Produtividade:</span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${selectedDiagramAnalyst.prodQuadrantBg}`}>
                        {selectedDiagramAnalyst.prodQuadrantName}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Qualidade</p>
                        <p className={`text-base font-extrabold mt-0.5 ${getQualityColorClass(selectedDiagramAnalyst.qualidadePct)}`}>
                          {selectedDiagramAnalyst.qualidadePct}%
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Produção</p>
                        <p className="text-base font-extrabold text-blue-400 mt-0.5">
                          {selectedDiagramAnalyst.totalProdutividade} <span className="text-[10px] text-gray-500 font-normal">un.</span>
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Monitorias</p>
                        <p className="text-base font-extrabold text-gray-900 mt-0.5">
                          {selectedDiagramAnalyst.totalMonitorias}
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Erros Registrados</p>
                        <p className="text-base font-extrabold text-red-600 mt-0.5">
                          {selectedDiagramAnalyst.totalErros}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => {
                        setSelectedAnalyst(selectedDiagramAnalyst);
                      }}
                      className="w-full py-2.5 px-4 bg-white text-brand-blue border border-brand-blue hover:bg-brand-blue hover:text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Users size={15} />
                      Abrir Análise Individual Completa
                    </button>
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <Crosshair size={32} className="mx-auto text-brand-blue/80 animate-pulse" />
                    <p className="text-xs font-bold text-gray-900">Clique em qualquer unidade no diagrama</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      Selecione um analista no Diagrama de Dispersão para inspecionar seus dados de produtividade, qualidade e acessar sua ficha individual.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RANKING DE OFENSORES */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-brand-blue flex items-center gap-2 uppercase">
                  <AlertTriangle size={20} className="text-red-500" />
                  RANKING DE OFENSORES
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Classificação de acompanhamento prioritário de analistas
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Heatmap-style view filter selector with small cards (Geral, Qualidade, Produtividade) */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setRankingCategory('geral');
                      setRankingLimit(10);
                    }}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      rankingCategory === 'geral'
                        ? 'bg-brand-blue-dark text-white shadow-sm font-extrabold'
                        : 'text-gray-500 hover:text-gray-900'
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
                        ? 'bg-brand-blue-dark text-white shadow-sm font-extrabold'
                        : 'text-gray-500 hover:text-gray-900'
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
                        ? 'bg-brand-blue-dark text-white shadow-sm font-extrabold'
                        : 'text-gray-500 hover:text-gray-900'
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
                    key={analyst.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${
                      isSearched
                        ? 'bg-blue-50/30 border-brand-blue ring-1 ring-brand-blue/50 shadow-lg'
                        : isTop3 
                          ? 'bg-red-50 border-red-300 hover:border-red-600/80' 
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Rank Badge & Name */}
                    <div className="flex items-center gap-3.5 w-full md:w-[320px]">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0 ${
                        isSearched
                          ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                          : isTop3 
                            ? 'bg-red-600 text-gray-900 shadow-lg shadow-red-600/30' 
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        #{rankNum}
                      </span>

                      <div className="overflow-hidden min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate" title={analyst.nome}>{analyst.nome}</h4>
                        <p className="text-[11px] font-mono text-gray-500">{analyst.codigo} • Sup: {analyst.supervisor}</p>
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
                    <div className="flex items-center gap-6 text-xs text-gray-700 w-full md:w-auto justify-around md:justify-start">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-semibold block">Produção</span>
                        <strong className="text-blue-400 font-bold">{analyst.totalProdutividade} un.</strong>
                      </div>

                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-semibold block">Erros</span>
                        <strong className="text-red-600 font-bold">{analyst.totalErros} ({analyst.reincidencias} reinc.)</strong>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setSelectedAnalyst(analyst);
                      }}
                      className="w-full md:w-auto px-4 py-2 bg-white hover:bg-gray-100 text-brand-blue border border-gray-300 hover:border-brand-blue-dark/60 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
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
                  className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-brand-blue border border-gray-300 hover:border-brand-blue-dark/60 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
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
      <div className="bg-white border border-gray-200 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-brand-blue">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-blue uppercase">MATRIZ DE QUADRANTES</h3>
            <p className="text-xs text-gray-500">Diretrizes de acompanhamento e medidas operacionais:</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 0 Conforme */}
          <div className="bg-gray-50 border border-emerald-300 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px] border border-emerald-300 mb-0.5">0</span>
              <h4 className="text-xs font-bold text-emerald-600">Conforme</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Monitorias sem erros</p>
            </div>
            <div className="w-full border-t border-emerald-300 my-2" />
            <p className="text-xs font-bold text-emerald-600 whitespace-nowrap">
              {quadrantStats[0].qty} analistas ({quadrantStats[0].pct})
            </p>
          </div>

          {/* 1º Quadrante */}
          <div className="bg-gray-50 border border-blue-300 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-brand-blue font-extrabold text-[10px] border border-gray-300/80 mb-0.5">1</span>
              <h4 className="text-xs font-bold text-brand-blue">1º Quadrante</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Feedback</p>
            </div>
            <div className="w-full border-t border-blue-300 my-2" />
            <p className="text-xs font-bold text-brand-blue whitespace-nowrap">
              {quadrantStats[1].qty} analistas ({quadrantStats[1].pct})
            </p>
          </div>

          {/* 2º Quadrante */}
          <div className="bg-gray-50 border border-blue-300 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-brand-blue font-extrabold text-[10px] border border-gray-300/80 mb-0.5">2</span>
              <h4 className="text-xs font-bold text-brand-blue">2º Quadrante</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Análise de reincidência + lado a lado</p>
            </div>
            <div className="w-full border-t border-blue-300 my-2" />
            <p className="text-xs font-bold text-brand-blue whitespace-nowrap">
              {quadrantStats[2].qty} analistas ({quadrantStats[2].pct})
            </p>
          </div>

          {/* 3º Quadrante */}
          <div className="bg-gray-50 border border-orange-300 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-extrabold text-[10px] border border-orange-300 mb-0.5">3</span>
              <h4 className="text-xs font-bold text-orange-600">3º Quadrante</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Feedback formal + Medida disciplinar</p>
            </div>
            <div className="w-full border-t border-orange-300 my-2" />
            <p className="text-xs font-bold text-orange-600 whitespace-nowrap">
              {quadrantStats[3].qty} analistas ({quadrantStats[3].pct})
            </p>
          </div>

          {/* 4º Quadrante */}
          <div className="bg-gray-50 border border-red-300 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 font-extrabold text-[10px] border border-red-300 mb-0.5">4</span>
              <h4 className="text-xs font-bold text-red-600">4º Quadrante</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Avaliação de gestão + Medidas adm.</p>
            </div>
            <div className="w-full border-t border-red-300 my-2" />
            <p className="text-xs font-bold text-red-600 whitespace-nowrap">
              {quadrantStats[4].qty} analistas ({quadrantStats[4].pct})
            </p>
          </div>

          {/* >4 Persistência */}
          <div className="bg-gray-50 border border-rose-300 p-3.5 rounded-xl flex flex-col justify-between items-center text-center h-full min-h-[140px]">
            <div className="flex flex-col items-center justify-center space-y-1 w-full flex-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[10px] border border-rose-300 mb-0.5">&gt;4</span>
              <h4 className="text-xs font-extrabold text-rose-700">Persistência</h4>
              <p className="text-[11px] text-gray-500 leading-tight">Avaliação da gestão</p>
            </div>
            <div className="w-full border-t border-rose-300 my-2" />
            <p className="text-xs font-bold text-rose-700 whitespace-nowrap">
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
                key={analyst.id}
                onClick={() => setSelectedAnalyst(analyst)}
                className="w-full bg-white border border-gray-200 hover:border-brand-blue-dark/50 p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-xl flex flex-col xl:flex-row items-center justify-between gap-4 xl:gap-6 group"
              >
              {/* Left: Avatar, Name, Code, Supervisor & Individual Esteira Boxes */}
              <div className="flex items-center gap-3.5 w-full xl:w-[350px] shrink-0 overflow-hidden">
                <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-sm text-brand-blue group-hover:border-brand-blue-dark transition-colors flex-shrink-0">
                  {analyst.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-blue transition-colors truncate" title={analyst.nome}>
                    {analyst.nome}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono mt-0.5 flex-wrap">
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
                          className="text-[10px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md inline-block whitespace-nowrap"
                        >
                          {e}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">Sem Esteira</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle: Metrics Bar */}
              <div className="w-full xl:w-[480px] shrink-0 bg-gray-50 border border-gray-200/80 px-3 py-2.5 rounded-sm grid grid-cols-6 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Prod.</p>
                  <p className="text-sm font-bold text-blue-500 mt-0.5">{analyst.totalProdutividade}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Monit.</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{analyst.totalMonitorias}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Quali.</p>
                  <p className={`text-sm font-bold mt-0.5 ${getQualityColorClass(analyst.qualidadePct)}`}>{analyst.qualidadePct}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Erros</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{analyst.totalErros}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Reincid.</p>
                  <p className="text-sm font-bold text-red-600 mt-0.5">{analyst.reincidencias}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">TMO</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">{analyst.tmoMedio}m</p>
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
                  <span className="w-5.5 h-5.5 rounded-full bg-slate-900 text-white border border-slate-700 flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs">
                    {analyst.maxTagErrorCount}
                  </span>
                  <span className="font-extrabold text-xs">
                    {analyst.maxTagErrorCount} {analyst.maxTagErrorCount === 1 ? 'erro' : 'erros'}
                  </span>
                  <Info size={13} className="shrink-0 opacity-80" />
                </button>
              </div>

              {/* Right: Chevron */}
              <div className="w-full xl:w-[170px] shrink-0 flex items-center justify-between xl:justify-end gap-3 border-t xl:border-t-0 border-gray-200/60 pt-3 xl:pt-0">
                <span className="flex items-center gap-1 text-brand-blue font-semibold text-xs group-hover:translate-x-1 transition-transform bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-sm">
                  Detalhes <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
          {displayLimit < filteredAnalysts.length && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setDisplayLimit(prev => prev + 50)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold py-2 px-6 rounded-md transition-colors border border-gray-300 hover:border-gray-400 shadow-sm"
              >
                Exibir mais 50 analistas
              </button>
            </div>
          )}
          </>
        ) : (
          <div className="w-full bg-white border border-gray-200 p-12 rounded-2xl text-center space-y-3">
            <Users size={40} className="mx-auto text-gray-400" />
            <h3 className="text-lg font-bold text-gray-900">Nenhum analista encontrado</h3>
            <p className="text-xs text-gray-400">
              Verifique os filtros aplicados ou importe a base na aba <strong className="text-gray-700">Importar Base</strong>.
            </p>
          </div>
        )}
      </div>
      </div>
      )}

      {/* DETAILED ANALYST FULL POPUP MODAL */}
      {selectedAnalyst && (
        <div className="fixed inset-0 bg-gray-50/85 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white border border-gray-200 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 text-gray-900 flex flex-col max-h-[90vh] overflow-hidden relative">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-gray-200 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-xl text-brand-blue shrink-0">
                    {selectedAnalyst.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900">{selectedAnalyst.nome}</h2>
                      <span className="px-3 py-1.5 rounded-sm text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 flex items-center gap-1.5">
                        <Activity size={13} className="text-brand-blue" />
                        <span className="text-[10px] uppercase text-gray-400">Média entre erros:</span> <strong className="text-brand-blue">{selectedAnalyst.mediaDiasEntreErros} dias</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-mono">
                      <span>{selectedAnalyst.codigo}</span>
                      <span>•</span>
                      <span>Supervisor: {selectedAnalyst.supervisor}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-gray-500 font-semibold mr-1">Esteiras:</span>
                      {selectedAnalyst.esteiras.map((e, idx) => (
                        <span key={idx} className="text-[10px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-md">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedAnalyst(null)}
                  className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                  title="Fechar Dashboard"
                >
                  <X size={20} />
                </button>
              </div>

              {/* TOP KPI CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider">Produtividade</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-blue-500">{selectedAnalyst.totalProdutividade}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider">Monitorias</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{selectedAnalyst.totalMonitorias}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider">Qualidade</p>
                  <p className={`text-xl sm:text-2xl font-extrabold ${getQualityColorClass(selectedAnalyst.qualidadePct)}`}>{selectedAnalyst.qualidadePct}%</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider">Erros</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-900">{selectedAnalyst.totalErros}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider">Reincidências</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-red-600">{selectedAnalyst.reincidencias}</p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] sm:text-[11px] text-gray-400 uppercase font-bold tracking-wider">TMO</p>
                  <p className="text-xl sm:text-2xl font-extrabold text-gray-700">{selectedAnalyst.tmoMedio}m</p>
                </div>
              </div>


              {/* Visualização de Reincidências por tipos de erro e acompanhamento */}
              <div className="bg-gray-50 border border-gray-200 p-6 rounded-sm space-y-4">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Layers size={18} className="text-brand-blue" />
                  Reincidências por tipos de erro e acompanhamento
                </h4>

                {selectedAnalyst.tagsDetalhadas.length > 0 ? (
                  <div className="space-y-3">
                    {selectedAnalyst.tagsDetalhadas.map((item, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.tag}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Erros acumulados nesta tag: <strong className="text-brand-blue">{item.count} erro(s)</strong>
                          </p>
                        </div>

                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${item.quadrante.colorClass}`}>
                          {item.quadrante.descricao}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl text-xs text-emerald-600 border border-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Analista não possui reincidência de erros por TAG no período selecionado.</span>
                  </div>
                )}
              </div>

              {/* Dash Individual do Analista (Gráficos) */}
              <div className="space-y-6">
                <h3 className="text-base font-bold text-brand-blue flex items-center gap-2 border-b border-gray-200 pb-3 uppercase">
                  <BarChart2 size={20} className="text-brand-blue" />
                  DASH INDIVIDUAL DO ANALISTA
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Visual Erros por TAG */}
                  <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-blue-dark"></span>
                        Erros por TAG
                      </h4>
                      <div className="flex items-center gap-2 bg-gray-50/70 border border-gray-200 px-3 py-1 rounded-md text-[10px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-blue-dark inline-block" />
                        <span className="text-brand-blue">Erros na TAG</span>
                      </div>
                    </div>

                    {selectedAnalyst.tagsDetalhadas.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={selectedAnalyst.tagsDetalhadas} margin={{ top: 20, right: 15, left: 10, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="tag" stroke="#6b7280" interval={0} tick={<CustomXAxisTick />} padding={{ left: 20, right: 20 }} />
                          <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                            itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                            labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                            cursor={{ fill: 'transparent' }}
                          />
                          <Bar dataKey="count" name="Quantidade" fill="#001E62" radius={[6, 6, 0, 0]}>
                            <LabelList dataKey="count" position="top" offset={6} fill="#001E62" fontSize={11} fontWeight="bold" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-gray-400 py-10 text-center">Nenhum erro de TAG registrado.</p>
                    )}
                  </div>

                  {/* Visual Erros por Motivo Macro */}
                  <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <PieChartIcon size={14} className="text-[#001E62]" />
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
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', color: '#001E62', fontWeight: 'bold' }} 
                            itemStyle={{ color: '#001E62', fontWeight: 'bold' }} 
                            labelStyle={{ color: '#001E62', fontWeight: 'bold' }} 
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-xs text-gray-400 py-10 text-center">Nenhum erro macro registrado.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Histórico de Erros */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  Histórico de Erros ({selectedAnalyst.items.length})
                </h4>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedAnalyst.items.length > 0 ? (
                    selectedAnalyst.items.map((item, idx) => {
                      const itemDate = getVal(item, 'data') || item.DataMonitoria;
                      const rawEsteiraVal = getVal(item, 'esteira') || item.Esteira;
                      const itemEsteira = getTabuladorName(rawEsteiraVal, esteiraMappings) || rawEsteiraVal || 'Geral';
                      const itemTag = getVal(item, 'tag') || item.Tag || 'Sem Tag';
                      const itemMacro = getVal(item, 'macroTag') || item.MotivoMacro || 'Outros';
                      const itemForma = getVal(item, 'forma') || getVal(item, 'formaMonitoria') || item.FormaMonitoria || '-';

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedErrorDetail(item)}
                          className="p-4 rounded-xl border border-red-300 bg-red-50 text-xs space-y-2 hover:bg-red-100/80 transition-all cursor-pointer shadow-2xs group"
                          title="Clique para ver os detalhes completos em um pop-up modal"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-gray-500 font-medium">{formatDateToBR(itemDate)}</span>
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-red-100 border border-red-300 text-red-700 group-hover:bg-red-200 transition-colors">
                              0% • NÃO CONFORME
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-gray-700">
                            <p><strong className="text-gray-400">Esteira:</strong> {itemEsteira}</p>
                            <p><strong className="text-gray-400">TAG:</strong> {itemTag}</p>
                            <p><strong className="text-gray-400">Motivo Macro:</strong> {itemMacro}</p>
                            <p><strong className="text-gray-400">Forma:</strong> {itemForma}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center border border-gray-200/80 bg-white rounded-xl space-y-1">
                      <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                      <p className="text-xs text-gray-500 font-semibold">Analista 100% conforme! Nenhum erro registrado no período.</p>
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
        <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200 text-gray-900 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-brand-blue" />
                  Erros e reincidências
                </h2>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Analista: <strong className="text-gray-900 font-sans">{popupAnalyst.nome}</strong> ({popupAnalyst.codigo})
                </p>
              </div>

              
            </div>

            {/* Mini Gráfico de Erros por TAG */}
            <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={16} className="text-brand-blue" />
                  Volume de Erros por TAG
                </h4>
                <div className="flex items-center gap-2 bg-gray-50/70 border border-gray-200 px-3 py-1 rounded-md text-[10px] font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-blue-dark inline-block" />
                  <span className="text-brand-blue">Erros na TAG</span>
                </div>
              </div>

              {popupAnalyst.tagsDetalhadas.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={popupAnalyst.tagsDetalhadas} margin={{ top: 20, right: 15, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="tag" stroke="#6b7280" tick={{ fontSize: 10 }} interval={0} padding={{ left: 15, right: 15 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                      itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                      labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                      cursor={{ fill: 'transparent' }}
                    />
                    
                    <Bar dataKey="count" name="Erros na TAG" fill="#001E62" radius={[6, 6, 0, 0]} barSize={32}>
                      <LabelList dataKey="count" position="top" offset={6} fill="#001E62" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                  <p className="text-xs text-emerald-600 font-semibold">Analista 100% Conforme! Nenhum erro registrado no período.</p>
                </div>
              )}
            </div>

            {/* Lista Detalhada de TAGs e Criticidade */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Layers size={15} className="text-brand-blue" />
                Acompanhamento e Medidas por tipos de erro
              </h4>

              {popupAnalyst.tagsDetalhadas.length > 0 ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {popupAnalyst.tagsDetalhadas.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{item.tag}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Quantidade: <strong className="text-brand-blue">{item.count} erro(s)</strong>
                        </p>
                      </div>

                      <span className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${item.quadrante.colorClass}`}>
                        {item.quadrante.descricao}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Sem ocorrências operacionais registradas.</p>
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-2 text-right">
              <button
                onClick={() => setPopupAnalyst(null)}
                className="px-5 py-2.5 bg-white text-brand-blue border border-brand-blue font-bold text-xs rounded-xl hover:bg-brand-blue hover:text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Clean Hover Popover Tooltip for Diagram Analyst Dots */}
      {hoveredDiagramAnalyst && (
        <div 
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 bg-white border border-[#001E62] p-3 rounded-xl shadow-2xl text-xs space-y-2 w-56 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${hoveredDiagramAnalyst.mouseX}px`,
            top: `${hoveredDiagramAnalyst.mouseY - 8}px`
          }}
        >
          <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
            <div className="overflow-hidden pr-2">
              <h5 className="font-extrabold text-[#001E62] text-xs truncate">{hoveredDiagramAnalyst.analyst.nome}</h5>
              <span className="text-[10px] text-gray-500 font-mono">{hoveredDiagramAnalyst.analyst.codigo}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${hoveredDiagramAnalyst.analyst.prodQuadrantBg}`}>
              {hoveredDiagramAnalyst.analyst.prodQuadrant}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[9px] block font-semibold uppercase">Qualidade</span>
              <span className={`font-black text-xs ${getQualityColorClass(hoveredDiagramAnalyst.analyst.qualidadePct)}`}>
                {hoveredDiagramAnalyst.analyst.qualidadePct}%
              </span>
            </div>

            <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[9px] block font-semibold uppercase">% da Meta</span>
              <span className="font-black text-xs text-[#001E62]">
                {(hoveredDiagramAnalyst.analyst as any).metaPercent ? `${(hoveredDiagramAnalyst.analyst as any).metaPercent.toFixed(0)}%` : '100%'}
              </span>
            </div>

            <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[9px] block font-semibold uppercase">Produção</span>
              <span className="font-black text-xs text-blue-600">
                {hoveredDiagramAnalyst.analyst.totalProdutividade} un.
              </span>
            </div>

            <div className="bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              <span className="text-gray-400 text-[9px] block font-semibold uppercase">Erros</span>
              <span className="font-black text-xs text-red-600">
                {hoveredDiagramAnalyst.analyst.totalErros}
              </span>
            </div>
          </div>

          <p className="text-[9px] text-[#001E62] text-center font-bold pt-0.5">
            Clique no ponto para ver a ficha
          </p>
        </div>
      )}

      {/* Pop-up Modal de Detalhes do Erro */}
      <ErrorDetailModal
        item={selectedErrorDetail}
        onClose={() => setSelectedErrorDetail(null)}
      />
    </div>
  );
};
