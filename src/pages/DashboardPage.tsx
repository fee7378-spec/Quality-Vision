import { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, LabelList 
} from 'recharts';
import { AlertCircle, CheckCircle2, Award, Briefcase, BarChart3, PieChart as PieIcon, Filter, Calendar, Eye, Target } from 'lucide-react';
import { useStore, matchesFilter } from '../store/useStore';
import { AnalystModal } from '../components/AnalystModal';

const MACRO_COLORS = ['#001E62', '#001E62', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#001E62'];

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = payload.value || '';

  const words = value.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word: string) => {
    if ((currentLine + ' ' + word).trim().length <= 11) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="middle" fill="#a1a1aa" fontSize={10} fontWeight="500">
        {lines.slice(0, 3).map((line, index) => (
          <tspan x={0} dy={index === 0 ? 10 : 12} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};


const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : undefined;
};

export const DashboardPage = () => {
  const { 
    data, 
    monitorias,
    monitoriaErros,
    productivityData,
    volumetria,
    startDate, 
    endDate, 
    selectedTag, 
    selectedMacro, 
    selectedEsteira,
    selectedForma
  } = useStore();

  const [selectedAnalystForModal, setSelectedAnalystForModal] = useState<{ code: string | null; name: string | null } | null>(null);

  const hasActiveFilters = useMemo(() => {
    return selectedEsteira !== 'TODAS' || selectedForma !== 'TODAS' || selectedTag !== 'TODAS' || selectedMacro !== 'TODOS';
  }, [selectedEsteira, selectedForma, selectedTag, selectedMacro]);

  // 1. Unfiltered Data (Date Range only) for global KPI totals
  const baseDateData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      return true;
    });
  }, [data, startDate, endDate]);

  // 2. Filtered Data (Date + Forma, Esteira, Tag, Macro) for specific dashboard sections
  const filteredData = useMemo(() => {
    return baseDateData.filter(item => {
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFilter(selectedForma, item.FormaMonitoria, 'TODAS')) return false;
      if (!matchesFilter(selectedTag, item.Tag, 'TODAS')) return false;
      if (!matchesFilter(selectedMacro, item.MotivoMacro, 'TODOS')) return false;
      return true;
    });
  }, [baseDateData, selectedEsteira, selectedForma, selectedTag, selectedMacro]);

// Total Produtividade calculation
  const totalProdutividade = useMemo(() => {
    return volumetria
      .filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
        return true;
      })
      .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || 0), 0);
  }, [volumetria, startDate, endDate, selectedEsteira]);

  // Helper to test if item is an error
  const isErrorItem = (item: typeof data[0]) => {
    const errStr = (item.Erro || "").toString().trim().toLowerCase();
    return (
      errStr === "0" || 
      errStr === "erro" || 
      errStr === "reprovado" || 
      errStr === "nc" || 
      errStr === "n/c" || 
      errStr === "nok"
    );
  };

  // Executive KPIs (Affected by date and esteira/active filters)
  // Total Monitorias: sum of quantidade in table monitorias filtered by date and esteira
  const totalMonitorias = useMemo(() => {
    if (monitorias && monitorias.length > 0) {
      return monitorias
        .filter(item => {
          const itemDate = getVal(item, 'data');
          if (!itemDate || typeof itemDate !== 'string') return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          const itemEsteira = getVal(item, 'esteira');
          if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
          return true;
        })
        .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0), 0);
    }
    return filteredData.reduce((sum, item) => sum + (Number(item.Quantidade) || 1), 0);
  }, [monitorias, startDate, endDate, selectedEsteira, filteredData]);

  // Total Erros: count of rows in table monitoriaErros where macroTag is not null, filtered by date and esteira
  const totalErros = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0) {
      return monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        return true;
      }).length;
    }
    return filteredData.filter(d => isErrorItem(d)).length;
  }, [monitoriaErros, startDate, endDate, selectedEsteira, filteredData]);

  // Qualidade: (Total Monitorias - Total Erros) / Total Monitorias * 100
  const qualidadeNum = useMemo(() => {
    if (totalMonitorias <= 0) return 100;
    return Number((((totalMonitorias - totalErros) / totalMonitorias) * 100).toFixed(1));
  }, [totalMonitorias, totalErros]);

  const qualidade = qualidadeNum.toFixed(1).replace('.', ',') + '%';

  const getQualityColor = (pct: number) => {
    if (pct >= 97) return 'text-emerald-600';
    if (pct >= 95) return 'text-brand-blue';
    if (pct >= 92) return 'text-orange-600';
    return 'text-red-600';
  };

  // Ranking de Reincidentes (Calcula o analista mais reincidente e a tag em que ele é mais reincidente)
  const rankingReincidentes = useMemo(() => {
    const analystStats: Record<string, { analista: string; totalErros: number; tagsMap: Record<string, number> }> = {};
    const errorItems: Array<{ analista: string; tag: string }> = [];

    if (monitoriaErros && monitoriaErros.length > 0) {
      const filteredErros = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        return true;
      });

      filteredErros.forEach(item => {
        const name = getVal(item, 'analista') || "ANALISTA";
        const rawTag = getVal(item, 'tag');
        const tag = (rawTag && String(rawTag).trim()) ? String(rawTag).trim() : "Sem Tag";
        errorItems.push({ analista: name, tag });
      });
    } else {
      filteredData.filter(d => isErrorItem(d)).forEach(item => {
        const name = item.NomeAnalista || "ANALISTA";
        const tag = (item.Tag && item.Tag.trim()) ? item.Tag.trim() : "Sem Tag";
        errorItems.push({ analista: name, tag });
      });
    }

    errorItems.forEach(({ analista, tag }) => {
      if (!analystStats[analista]) {
        analystStats[analista] = { analista, totalErros: 0, tagsMap: {} };
      }
      analystStats[analista].totalErros += 1;
      analystStats[analista].tagsMap[tag] = (analystStats[analista].tagsMap[tag] || 0) + 1;
    });

    return Object.values(analystStats)
      .map(stat => {
        const sortedTags = Object.entries(stat.tagsMap).sort((a, b) => b[1] - a[1]);
        const topTag = sortedTags[0]?.[0] || 'N/A';
        const topTagCount = sortedTags[0]?.[1] || 0;

        let reincidencias = 0;
        Object.values(stat.tagsMap).forEach(cnt => {
          if (cnt > 1) reincidencias += (cnt - 1);
        });

        return {
          analista: stat.analista,
          totalErros: stat.totalErros,
          reincidencias,
          topTag,
          topTagCount
        };
      })
      .filter(s => s.totalErros > 0)
      .sort((a, b) => {
        if (b.reincidencias !== a.reincidencias) return b.reincidencias - a.reincidencias;
        return b.totalErros - a.totalErros;
      })
      .slice(0, 15);
  }, [monitoriaErros, startDate, endDate, selectedEsteira, filteredData]);

  // Timeline chart: Filtered Data
  const timelineData = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0 && monitorias && monitorias.length > 0) {
      const filteredErros = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        return true;
      });

      const filteredMonitorias = monitorias.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        return true;
      });

      const allDates = [
        ...filteredErros.map(i => getVal(i, 'data')),
        ...filteredMonitorias.map(i => getVal(i, 'data'))
      ].filter(Boolean).sort();

      let daysDiff = 0;
      if (allDates.length > 0) {
        const minD = new Date(allDates[0]);
        const maxD = new Date(allDates[allDates.length - 1]);
        daysDiff = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24));
      }

      const isDaily = daysDiff <= 31;
      const map: Record<string, { fullKey: string; label: string; erros: number; total: number }> = {};

      const getKeyAndLabel = (rawDate: string) => {
        let key = rawDate;
        let label = rawDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          if (isDaily) {
            key = rawDate;
            const parts = rawDate.split('-');
            label = `${parts[2]}/${parts[1]}`;
          } else {
            key = rawDate.slice(0, 7);
            const [y, m] = key.split('-');
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const mIdx = parseInt(m, 10) - 1;
            label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y.slice(2)}` : key;
          }
        }
        return { key, label };
      };

      filteredMonitorias.forEach(item => {
        const rawDate = getVal(item, 'data');
        if (!rawDate) return;
        const { key, label } = getKeyAndLabel(rawDate);
        if (!map[key]) {
          map[key] = { fullKey: key, label, erros: 0, total: 0 };
        }
        const qty = Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0;
        map[key].total += qty;
      });

      filteredErros.forEach(item => {
        const rawDate = getVal(item, 'data');
        if (!rawDate) return;
        const { key, label } = getKeyAndLabel(rawDate);
        if (!map[key]) {
          map[key] = { fullKey: key, label, erros: 0, total: 0 };
        }
        map[key].erros += 1;
      });

      const list = Object.values(map)
        .filter(item => item.total > 0 || item.erros > 0)
        .sort((a, b) => a.fullKey.localeCompare(b.fullKey));

      return { list, isDaily };
    }

    if (filteredData.length === 0) return { list: [], isDaily: true };

    const sortedDates = filteredData
      .map(i => i.DataMonitoria)
      .filter(Boolean)
      .sort();

    let daysDiff = 0;
    if (sortedDates.length > 0) {
      const minD = new Date(sortedDates[0]);
      const maxD = new Date(sortedDates[sortedDates.length - 1]);
      daysDiff = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24));
    }

    const isDaily = daysDiff <= 31;
    const map: Record<string, { fullKey: string; label: string; erros: number; total: number }> = {};

    filteredData.forEach(item => {
      const rawDate = item.DataMonitoria || 'Outros';
      let key = rawDate;
      let label = rawDate;

      if (rawDate !== 'Outros' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        if (isDaily) {
          key = rawDate;
          const parts = rawDate.split('-');
          label = `${parts[2]}/${parts[1]}`;
        } else {
          key = rawDate.slice(0, 7);
          const [y, m] = key.split('-');
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const mIdx = parseInt(m, 10) - 1;
          label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y.slice(2)}` : key;
        }
      }

      if (!map[key]) {
        map[key] = { fullKey: key, label, erros: 0, total: 0 };
      }
      map[key].total += 1;
      if (isErrorItem(item)) map[key].erros += 1;
    });

    const list = Object.values(map)
      .filter(item => item.erros > 0)
      .sort((a, b) => a.fullKey.localeCompare(b.fullKey));
    return { list, isDaily };
  }, [monitoriaErros, monitorias, startDate, endDate, selectedEsteira, filteredData]);

// Evolução da Produtividade
  const evolucaoDiaria = useMemo(() => {
    const map = new Map<string, { key: string, label: string, volume: number }>();
    let mode: 'month' | 'week' | 'day' = 'month';

    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7) mode = 'day';
      else if (diffDays <= 31) mode = 'week';
    }

    const getGroup = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      if (mode === 'day') return { key: dateStr, label: `${d}/${m}/${y}` };
      if (mode === 'week') {
        const dateObj = new Date(Number(y), Number(m)-1, Number(d));
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(Number(y), Number(m)-1, diff);
        const wsY = weekStart.getFullYear();
        const wsM = String(weekStart.getMonth()+1).padStart(2, '0');
        const wsD = String(weekStart.getDate()).padStart(2, '0');
        return { key: `${wsY}-${wsM}-${wsD}`, label: `Sem. ${wsD}/${wsM}` };
      }
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return { key: `${y}-${m}`, label: `${months[Number(m)-1]}/${y}` };
    };

    volumetria
      .filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
        return true;
      })
      .forEach(p => {
        const d = getVal(p, 'data');
        if (d && typeof d === 'string') {
          const group = getGroup(d);
          const qty = Number(getVal(p, 'quantidade')) || 0;
          
          if (!map.has(group.key)) {
            map.set(group.key, { ...group, volume: 0 });
          }
          const entry = map.get(group.key)!;
          entry.volume += qty;
        }
      });

    const list = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
    if (list.length === 0) return [];

    const totalVolume = list.reduce((sum, item) => sum + item.volume, 0);
    const avgVolume = list.length > 0 ? totalVolume / list.length : 0;
    const targetMeta = Math.round((avgVolume * 1.05) / 10) * 10 || 100;

    return list.map(item => ({
      label: item.label,
      volume: item.volume,
      meta: targetMeta
    }));
  }, [volumetria, startDate, endDate, selectedEsteira]);

  return (
    <div className="w-full bg-gray-50 p-4 sm:p-6 md:p-8 space-y-8 text-gray-900">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">PRODUTIVIDADE</p>
            <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <Briefcase size={18} className="text-[#001E62]" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalProdutividade.toLocaleString('pt-BR')}</h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">Volume total no período</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#001E62] font-bold text-[11px]">
              <span>Casos tratados</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">MONITORIAS</p>
            <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <BarChart3 size={18} className="text-[#001E62]" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalMonitorias}</h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">Amostragem auditada</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#001E62] font-bold text-[11px]">
              <span>Avaliações</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">QUALIDADE</p>
            <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <CheckCircle2 size={18} className={getQualityColor(qualidadeNum)} />
            </div>
          </div>
          <div>
            <h3 className={`text-3xl font-black tracking-tight ${getQualityColor(qualidadeNum)}`}>{qualidade}</h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">Qualidade operacional</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[#001E62] font-bold text-[11px]">
              <Target size={12} className="text-[#001E62]" />
              <span>Meta: 95,0%</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">ERROS APONTADOS</p>
            <div className="p-1.5 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle size={18} className="text-red-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalErros}</h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">Desvios em auditoria</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-bold text-[11px]">
              <span>Não Conformidades</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Evolução Diária */}
      <div className="bg-white border border-gray-200 p-6 rounded-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <Calendar size={18} className="text-brand-blue" />
              EVOLUÇÃO DA PRODUTIVIDADE
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-brand-blue">
              <span className="w-3 h-3 rounded-full bg-[#001E62] inline-block" />
              <span>Casos Tratados</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-500 inline-block" />
              <span>Meta de Produção</span>
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucaoDiaria} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip 
                cursor={{ stroke: '#001E62', strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
              />
              <Line type="monotone" dataKey="volume" name="Casos Tratados" stroke="#001E62" strokeWidth={3} dot={{ fill: '#001E62', r: 5 }}>
                <LabelList dataKey="volume" position="top" offset={10} fill="#001E62" fontSize={11} fontWeight="bold" />
              </Line>
              <Line type="monotone" dataKey="meta" name="Meta de Produção" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#10b981', r: 3 }}>
                <LabelList dataKey="meta" position="bottom" offset={8} fill="#10b981" fontSize={10} fontWeight="semibold" />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Ranking de Reincidentes & Evolução de Erros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Ranking de Reincidentes (Filtered by Esteira/Tag/Macro) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 p-6 rounded-md flex flex-col h-[360px]">
          <div className="flex-shrink-0 mb-4">
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <Award size={18} className="text-brand-blue" />
              RANKING REINCIDENTES
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
            {rankingReincidentes.length > 0 ? (
              rankingReincidentes.map((item, idx) => (
                <div 
                  key={item.analista + idx} 
                  className="bg-gray-50 border border-gray-200 hover:border-brand-blue/60 p-3 rounded-md flex items-center justify-between gap-3 transition-all hover:bg-white group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-gray-100 border border-gray-300 group-hover:border-brand-blue flex items-center justify-center font-bold text-xs text-brand-blue flex-shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-brand-blue-light truncate">
                        {item.analista}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        Tag mais reincidente: <span className="font-semibold text-red-600">{item.topTag}</span> ({item.topTagCount}x)
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="bg-red-50 border border-red-300 text-red-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {item.reincidencias > 0 ? `${item.reincidencias} reincidência(s)` : `${item.totalErros} erro(s)`}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {item.totalErros} erro(s) total
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">Nenhum erro registrado no filtro atual.</p>
            )}
          </div>
        </div>

        {/* Evolução de Erros no Tempo */}
        <div className="lg:col-span-7 bg-white border border-gray-200 p-6 rounded-md flex flex-col h-[360px]">
          <div className="flex items-center justify-between flex-shrink-0 mb-3">
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand-blue-dark"></span>
              EVOLUÇÃO DE ERROS
            </h3>

            {/* Fixed Legend opposite Title */}
            <div className="flex items-center gap-3 bg-gray-50/70 border border-gray-200 px-3 py-1 rounded-md text-xs font-bold">
              <div className="flex items-center gap-1.5 text-brand-blue">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue-dark inline-block" />
                <span>Erros</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block" />
                <span>Total Monitorias</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData.list} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} padding={{ left: 30, right: 30 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip 
                  cursor={{ stroke: '#001E62', strokeDasharray: '3 3' }} 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                  itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                  labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                />
                <Line type="monotone" dataKey="erros" name="Erros" stroke="#001E62" strokeWidth={3} dot={{ fill: '#001E62', r: 4 }}>
                  <LabelList dataKey="erros" position="top" offset={10} fill="#001E62" fontSize={11} fontWeight="bold" />
                </Line>
                <Line type="monotone" dataKey="total" name="Total Monitorias" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analyst Modal */}
      {selectedAnalystForModal && (
        <AnalystModal
          analystCode={selectedAnalystForModal.code}
          analystName={selectedAnalystForModal.name}
          onClose={() => setSelectedAnalystForModal(null)}
        />
      )}

    </div>
  );
};
