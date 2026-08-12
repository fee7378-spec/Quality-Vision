import { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LabelList, Legend, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Grid, PieChart as PieIcon, AlertTriangle } from 'lucide-react';
import { useStore, matchesFilter, matchesFormaFilter, getAnalystCode } from '../store/useStore';
import { AnalystModal } from '../components/AnalystModal';

const MACRO_COLORS = ['#001E62', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#3b82f6', '#eab308'];

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

export const AnaliseEvolucaoPage = () => {
  const { 
    data, 
    monitorias,
    monitoriaErros,
    volumetria,
    startDate, 
    endDate, 
    selectedTag, 
    selectedMacro, 
    selectedEsteira,
    selectedForma
  } = useStore();

  const [heatmapViewMode, setHeatmapViewMode] = useState<'esteira' | 'analista'>('esteira');
  const [selectedAnalystForModal, setSelectedAnalystForModal] = useState<{ name: string } | null>(null);

  const getVal = (obj: any, key: string) => {
    if (!obj) return undefined;
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return found ? obj[found] : undefined;
  };

  // Filter dataset by date and controls
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      if (!matchesFilter(selectedTag, item.Tag, 'TODAS')) return false;
      if (!matchesFilter(selectedMacro, item.MotivoMacro, 'TODOS')) return false;
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFormaFilter(selectedForma, item)) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedTag, selectedMacro, selectedEsteira, selectedForma]);

  // Helper to check if item is an error considering selectedForma filter
  const isErrorItem = (item: typeof data[0]) => {
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
    if (!matchesFilter(selectedForma, item.FormaMonitoria, 'TODAS')) return false;
    return true;
  };

  // 1. Índice de Evolução e Tendência (Mês / Semana / Dias)
  const tendenciaData = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0 && monitorias && monitorias.length > 0) {
      const isDoubleCheck = Array.isArray(selectedForma) 
        ? selectedForma.includes('Double Check') && selectedForma.length === 1 
        : selectedForma === 'Double Check';

      const filteredErros = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        if (!matchesFormaFilter(selectedForma, item)) return false;

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
        if (!matchesFormaFilter(selectedForma, item)) return false;
        return true;
      });
      
      const filteredVolumetria = volumetria.filter(item => {
        const itemDate = getVal(item, 'data') || getVal(item, 'DataProdutividade') || '';
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
        return true;
      });
      
      const baseDataForTotals = isDoubleCheck ? filteredVolumetria : filteredMonitorias;

      const allDates = [
        ...filteredErros.map(i => getVal(i, 'data')),
        ...baseDataForTotals.map(i => getVal(i, 'data') || getVal(i, 'DataProdutividade'))
      ].filter(Boolean).sort();

      let spanDays = 0;
      if (allDates.length > 0) {
        const minD = new Date(allDates[0]);
        const maxD = new Date(allDates[allDates.length - 1]);
        spanDays = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24)) + 1;
      }

      if (spanDays > 0 && spanDays < 7) {
        // Group by Days
        const dayMap: Record<string, { label: string; total: number; erros: number }> = {};
        
        baseDataForTotals.forEach(item => {
          const dStr = getVal(item, 'data') || getVal(item, 'DataProdutividade');
          if (!dStr) return;
          const parts = dStr.split('-');
          const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
          if (!dayMap[dStr]) dayMap[dStr] = { label, total: 0, erros: 0 };
          dayMap[dStr].total += (Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0);
        });

        filteredErros.forEach(item => {
          const dStr = getVal(item, 'data');
          if (!dStr) return;
          const parts = dStr.split('-');
          const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
          if (!dayMap[dStr]) dayMap[dStr] = { label, total: 0, erros: 0 };
          dayMap[dStr].erros += 1;
        });

        return Object.keys(dayMap).sort().map(dKey => {
          const vals = dayMap[dKey];
          const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
          return { label: vals.label, qualidade, erros: vals.erros, total: vals.total };
        });
      } else if (spanDays >= 7 && spanDays < 30) {
        // Group by Weeks
        const weekMap: Record<string, { label: string; total: number; erros: number }> = {};

        const getWeekKeyAndLabel = (dStr: string) => {
          const parts = dStr.split('-');
          const dayNum = parseInt(parts[2] || '1', 10);
          let weekKey = 'Semana 1';
          if (dayNum >= 1 && dayNum <= 7) weekKey = 'Semana 1';
          else if (dayNum >= 8 && dayNum <= 14) weekKey = 'Semana 2';
          else if (dayNum >= 15 && dayNum <= 21) weekKey = 'Semana 3';
          else if (dayNum >= 22) weekKey = 'Semana 4';
          return weekKey;
        };

        baseDataForTotals.forEach(item => {
          const dStr = getVal(item, 'data') || getVal(item, 'DataProdutividade');
          if (!dStr) return;
          const weekKey = getWeekKeyAndLabel(dStr);
          if (!weekMap[weekKey]) weekMap[weekKey] = { label: weekKey, total: 0, erros: 0 };
          weekMap[weekKey].total += (Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0);
        });

        filteredErros.forEach(item => {
          const dStr = getVal(item, 'data');
          if (!dStr) return;
          const weekKey = getWeekKeyAndLabel(dStr);
          if (!weekMap[weekKey]) weekMap[weekKey] = { label: weekKey, total: 0, erros: 0 };
          weekMap[weekKey].erros += 1;
        });

        return Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([week, vals]) => {
          const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
          return { label: vals.label, qualidade, erros: vals.erros, total: vals.total };
        });
      } else {
        // Group by Months
        const monthMap: Record<string, { label: string; total: number; erros: number }> = {};

        const getMonthKeyAndLabel = (dStr: string) => {
          const monthStr = dStr.slice(0, 7);
          const [y, m] = monthStr.split('-');
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const mIdx = parseInt(m, 10) - 1;
          const label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y?.slice(2) || ''}` : monthStr;
          return { key: monthStr, label };
        };

        baseDataForTotals.forEach(item => {
          const dStr = getVal(item, 'data') || getVal(item, 'DataProdutividade');
          if (!dStr) return;
          const { key, label } = getMonthKeyAndLabel(dStr);
          if (!monthMap[key]) monthMap[key] = { label, total: 0, erros: 0 };
          monthMap[key].total += (Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0);
        });

        filteredErros.forEach(item => {
          const dStr = getVal(item, 'data');
          if (!dStr) return;
          const { key, label } = getMonthKeyAndLabel(dStr);
          if (!monthMap[key]) monthMap[key] = { label, total: 0, erros: 0 };
          monthMap[key].erros += 1;
        });

        return Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([mes, vals]) => {
            const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
            return { label: vals.label, qualidade, erros: vals.erros, total: vals.total };
          });
      }
    }

    // fallback when no monitoriaErros
    const isDoubleCheck = Array.isArray(selectedForma) 
      ? selectedForma.includes('Double Check') && selectedForma.length === 1 
      : selectedForma === 'Double Check';
      
    if (filteredData.length === 0) return [];

    const dates = filteredData.map(d => d.DataMonitoria).filter(Boolean).sort();
    let spanDays = 0;
    if (dates.length > 0) {
      const minD = new Date(dates[0]);
      const maxD = new Date(dates[dates.length - 1]);
      spanDays = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    if (spanDays > 0 && spanDays <= 7) {
      // Group by Days
      const dayMap: Record<string, { label: string; total: number; erros: number }> = {};
      filteredData.forEach(item => {
        if (!item.DataMonitoria) return;
        const [y, m, day] = item.DataMonitoria.split('-');
        const label = `${day}/${m}`;
        if (!dayMap[item.DataMonitoria]) {
          dayMap[item.DataMonitoria] = { label, total: 0, erros: 0 };
        }
        dayMap[item.DataMonitoria].total += (Number(item.Quantidade) || 1);
        if (isErrorItem(item)) {
          dayMap[item.DataMonitoria].erros += 1;
        }
      });

      return Object.keys(dayMap).sort().map(dKey => {
        const vals = dayMap[dKey];
        const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
        return { label: vals.label, qualidade, erros: vals.erros, total: vals.total };
      });
    } else if (spanDays > 7 && spanDays <= 30) {
      // Group by Weeks
      const weekMap: Record<string, { label: string; total: number; erros: number }> = {};
      filteredData.forEach(item => {
        if (!item.DataMonitoria) return;
        const parts = item.DataMonitoria.split('-');
        const dayNum = parseInt(parts[2] || '1', 10);
        let weekKey = 'Semana 1';
        if (dayNum >= 1 && dayNum <= 7) weekKey = 'Semana 1';
        else if (dayNum >= 8 && dayNum <= 14) weekKey = 'Semana 2';
        else if (dayNum >= 15 && dayNum <= 21) weekKey = 'Semana 3';
        else if (dayNum >= 22) weekKey = 'Semana 4';

        if (!weekMap[weekKey]) {
          weekMap[weekKey] = { label: weekKey, total: 0, erros: 0 };
        }
        weekMap[weekKey].total += (Number(item.Quantidade) || 1);
        if (isErrorItem(item)) {
          weekMap[weekKey].erros += 1;
        }
      });

      return Object.entries(weekMap).map(([week, vals]) => {
        const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
        return { label: vals.label, qualidade, erros: vals.erros, total: vals.total };
      });
    } else {
      // Group by Months
      const monthMap: Record<string, { label: string; total: number; erros: number }> = {};
      filteredData.forEach(item => {
        const monthStr = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : 'Sem Data';
        if (!monthMap[monthStr]) {
          const [y, m] = monthStr.split('-');
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const mIdx = parseInt(m, 10) - 1;
          const label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y?.slice(2) || ''}` : monthStr;
          monthMap[monthStr] = { label, total: 0, erros: 0 };
        }
        monthMap[monthStr].total += (Number(item.Quantidade) || 1);
        if (isErrorItem(item)) {
          monthMap[monthStr].erros += 1;
        }
      });

      return Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, vals]) => {
          const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
          return { label: vals.label, qualidade, erros: vals.erros, total: vals.total };
        });
    }
  }, [monitoriaErros, monitorias, volumetria, startDate, endDate, selectedEsteira, filteredData, selectedForma]);

  // 2. Heatmap de Reincidência de Erros
  const heatmapData = useMemo(() => {
    const isEsteiraMode = heatmapViewMode === 'esteira';

    if (monitoriaErros && monitoriaErros.length > 0) {
      const filteredErros = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        if (!matchesFormaFilter(selectedForma, item)) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        return true;
      });

      const categories = Array.from(new Set(filteredErros.map(d => {
        if (isEsteiraMode) {
          const val = getVal(d, 'esteira');
          return (val && String(val).trim()) ? String(val).trim() : 'Outros';
        }
        return getAnalystCode(d);
      }))).sort((a, b) => a.localeCompare(b));

      const columns = Array.from(new Set(filteredErros.map(d => {
        const dStr = getVal(d, 'data');
        return dStr ? String(dStr).slice(0, 7) : '2026-01';
      }))).sort() as string[];

      const matrix: Record<string, Record<string, number>> = {};

      categories.forEach(cat => {
        matrix[cat] = {};
        columns.forEach(col => {
          matrix[cat][col] = 0;
        });
      });

      filteredErros.forEach(item => {
        const rawCat = isEsteiraMode ? getVal(item, 'esteira') : getAnalystCode(item);
        const catKey = (rawCat && String(rawCat).trim()) ? String(rawCat).trim() : 'Outros';
        const dStr = getVal(item, 'data');
        const colKey = dStr ? String(dStr).slice(0, 7) : '2026-01';

        if (matrix[catKey] && matrix[catKey][colKey] !== undefined) {
          matrix[catKey][colKey] += 1;
        }
      });

      return { categories, columns, matrix, isEsteiraMode };
    }

    const categories = isEsteiraMode
      ? (Array.from(new Set(filteredData.map(d => d.Esteira))).filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b))
      : (Array.from(new Set(filteredData.map(d => getAnalystCode(d)))).filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b));

    const columns = Array.from(new Set(filteredData.map(d => d.DataMonitoria ? d.DataMonitoria.slice(0, 7) : '2026-07'))).sort() as string[];

    const matrix: Record<string, Record<string, number>> = {};

    categories.forEach(cat => {
      matrix[cat] = {};
      columns.forEach(col => {
        matrix[cat][col] = 0;
      });
    });

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const catKey = isEsteiraMode ? item.Esteira : getAnalystCode(item);
      const colKey = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : '2026-07';

      if (matrix[catKey] && matrix[catKey][colKey] !== undefined) {
        matrix[catKey][colKey] += 1;
      }
    });

    return { categories, columns, matrix, isEsteiraMode };
  }, [monitoriaErros, startDate, endDate, selectedEsteira, heatmapViewMode, filteredData, selectedForma]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-white text-gray-400 border-gray-200';
    if (count === 1) return 'bg-blue-50/50 text-brand-blue border-gray-300/80 font-bold';
    if (count === 2) return 'bg-blue-100/60 text-brand-blue-light border-brand-blue-dark/80 font-bold';
    return 'bg-brand-blue-dark/20 text-brand-blue font-extrabold border-brand-blue-dark shadow-sm shadow-brand-blue/10';
  };

  // Erros por TAG
  const errorsByTagData = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0) {
      const filteredErros = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        if (!matchesFormaFilter(selectedForma, item)) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        return true;
      });

      const map: Record<string, number> = {};
      filteredErros.forEach(item => {
        const tagRaw = getVal(item, 'tag');
        const tag = (tagRaw && String(tagRaw).trim()) ? String(tagRaw).trim() : 'Geral';
        map[tag] = (map[tag] || 0) + 1;
      });

      return Object.entries(map)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    }

    const map: Record<string, number> = {};
    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const tag = item.Tag || 'Geral';
      map[tag] = (map[tag] || 0) + 1;
    });

    return Object.entries(map)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [monitoriaErros, startDate, endDate, selectedEsteira, selectedForma, filteredData]);

  // Erros por Motivo Macro (Enhanced & Intuitive)
  const errorsByMacroData = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0) {
      const filteredErros = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        if (!matchesFormaFilter(selectedForma, item)) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        return true;
      });

      const totalMacroErros = filteredErros.length;
      const map: Record<string, number> = {};

      filteredErros.forEach(item => {
        const rawMacro = getVal(item, 'macroTag');
        const macro = (rawMacro && String(rawMacro).trim()) ? String(rawMacro).trim() : 'Não Especificado';
        map[macro] = (map[macro] || 0) + 1;
      });

      return Object.entries(map)
        .map(([name, value], idx) => {
          const percent = totalMacroErros > 0 ? Math.round((value / totalMacroErros) * 100) : 0;
          return { 
            name, 
            value, 
            percent,
            color: MACRO_COLORS[idx % MACRO_COLORS.length]
          };
        })
        .sort((a, b) => b.value - a.value);
    }

    const map: Record<string, number> = {};
    const errItems = filteredData.filter(d => isErrorItem(d));
    const totalMacroErros = errItems.length;

    errItems.forEach(item => {
      const macro = item.MotivoMacro || 'Não Especificado';
      map[macro] = (map[macro] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value], idx) => {
        const percent = totalMacroErros > 0 ? Math.round((value / totalMacroErros) * 100) : 0;
        return { 
          name, 
          value, 
          percent,
          color: MACRO_COLORS[idx % MACRO_COLORS.length]
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [monitoriaErros, startDate, endDate, selectedEsteira, filteredData]);

  return (
    <div className="w-full bg-gray-50 p-4 sm:p-6 md:p-8 space-y-8 text-gray-900">


      {/* Section 1: Índice de Evolução e Tendência */}
      <div className="bg-white border border-gray-200 p-6 rounded-md space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <TrendingUp size={20} className="text-brand-blue" />
              ÍNDICE DE EVOLUÇÃO
            </h3>
            <p className="text-[11px] text-gray-400/80 mt-0.5">Evolução do percentual de qualidade (%) ao longo do período</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={tendenciaData} margin={{ top: 25, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="qualidadeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#001E62" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#001E62" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} padding={{ left: 35, right: 35 }} />
            <YAxis stroke="#6b7280" domain={[70, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip 
              cursor={{ stroke: '#001E62', strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
              itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
              labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
            />
            <Area type="monotone" dataKey="qualidade" name="Qualidade (%)" stroke="#001E62" strokeWidth={3} fillOpacity={1} fill="url(#qualidadeGrad)">
              <LabelList dataKey="qualidade" position="top" offset={10} fill="#001E62" fontSize={11} fontWeight="bold" formatter={(v: any) => `${v}%`} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grid: Erros por TAG & Motivo Macro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Erros por TAG com rolagem horizontal e rótulos de dados */}
        <div className="bg-white border border-gray-200 p-6 rounded-md">
          <h3 className="text-brand-blue font-bold text-base mb-4 flex items-center gap-2 uppercase">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#001E62]"></span>
            ERROS POR TAG
          </h3>
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(errorsByTagData.length * 130, 480) }}>
              <ResponsiveContainer width="100%" height="380">
                <BarChart data={errorsByTagData} margin={{ top: 20, right: 20, left: -10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tag" stroke="#6b7280" interval={0} tick={<CustomXAxisTick />} height={65} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                    itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                    labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="count" name="Quantidade de Erros" fill="#001E62" radius={[4, 4, 0, 0]} barSize={36}>
                    <LabelList dataKey="count" position="top" offset={6} fill="#001E62" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Intuitive and Visual Erros por Motivo Macro */}
        <div className="bg-white border border-gray-200 p-6 rounded-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <PieIcon size={18} className="text-brand-blue" />
              ERROS POR MOTIVOS MACRO
            </h3>
            <p className="text-[11px] text-gray-400/80 mt-0.5">Distribuição percentual e absoluta de falhas por motivo macro</p>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
            {errorsByMacroData.length > 0 ? (
              errorsByMacroData.map((item) => (
                <div key={item.name} className="bg-gray-50 border border-gray-200 p-3 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-900 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-brand-blue font-bold">
                      {item.value} erro(s) ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-gray-200">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">Nenhum erro por motivo macro no período selecionado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid Section 2: Heatmap ocupando 100% da área horizontal com filtro por Esteira / Analista */}
      <div className="bg-white border border-gray-200 p-6 rounded-md space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <Grid size={20} className="text-brand-blue" />
              HEATMAP DE OCORRÊNCIAS
            </h3>
            <p className="text-[11px] text-gray-400/80 mt-0.5">
              Matriz de calor de volume de erros {heatmapData.isEsteiraMode ? 'dividida por Esteira Operacional' : 'dividida por Analista'} no tempo
              {heatmapData.columns.length > 6 && (
                <span className="ml-1.5 text-brand-blue font-semibold">
                  (Exibindo 6 meses por visualização • Role para o lado para ver os demais)
                </span>
              )}
            </p>
          </div>

          {/* Filtro inline no próprio quadro */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-md border border-gray-200">
            <button
              onClick={() => setHeatmapViewMode('esteira')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                heatmapViewMode === 'esteira'
                  ? 'bg-brand-blue-dark text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Por Esteira
            </button>
            <button
              onClick={() => setHeatmapViewMode('analista')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                heatmapViewMode === 'analista'
                  ? 'bg-brand-blue-dark text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Por Analista
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto my-2 custom-scrollbar border border-gray-200 rounded-md">
          <table 
            className="w-full text-xs text-center border-collapse"
            style={{
              minWidth: heatmapData.columns.length > 6 
                ? `calc(220px + (${heatmapData.columns.length} * (100% - 220px) / 6))` 
                : '100%'
            }}
          >
            <thead className="sticky top-0 bg-white z-20 shadow-xs">
              <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                <th 
                  className="p-3 text-left bg-white sticky top-0 left-0 z-30 border-b border-r border-gray-200"
                  style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }}
                >
                  {heatmapData.isEsteiraMode ? 'Esteira Operacional' : 'Analista'}
                </th>
                {heatmapData.columns.map(c => {
                  const [y, m] = c.split('-');
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const mIdx = parseInt(m, 10) - 1;
                  const label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y?.slice(2) || ''}` : c;
                  return (
                    <th 
                      key={c} 
                      className="p-3 min-w-[110px] bg-white border-b border-gray-200"
                      style={{ width: heatmapData.columns.length > 6 ? 'calc((100% - 220px) / 6)' : 'auto' }}
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {heatmapData.categories.length > 0 ? (
                heatmapData.categories.map(cat => (
                  <tr key={cat} className="group border-b border-gray-200/40 hover:bg-gray-50 transition-colors">
                    <td 
                      className={`p-3 text-left font-semibold text-gray-900 truncate bg-white sticky left-0 z-10 border-r border-gray-200 group-hover:bg-gray-50 transition-colors ${
                        !heatmapData.isEsteiraMode ? 'cursor-pointer text-[#001E62] hover:underline' : ''
                      }`} 
                      style={{ width: '220px', minWidth: '220px', maxWidth: '220px' }}
                      title={!heatmapData.isEsteiraMode ? `Clique para ver erros e reincidências de ${cat}` : cat}
                      onClick={() => {
                        if (!heatmapData.isEsteiraMode) {
                          setSelectedAnalystForModal({ name: cat });
                        }
                      }}
                    >
                      {cat}
                    </td>
                    {heatmapData.columns.map(col => {
                      const count = heatmapData.matrix[cat]?.[col] || 0;
                      return (
                        <td 
                          key={col} 
                          className="p-2 min-w-[110px]"
                          style={{ width: heatmapData.columns.length > 6 ? 'calc((100% - 220px) / 6)' : 'auto' }}
                        >
                          <div className={`py-2 px-3 rounded-md border text-xs font-bold transition-transform hover:scale-105 ${getHeatmapColor(count)}`}>
                            {count} erro(s)
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={heatmapData.columns.length + 1} className="p-8 text-center text-gray-400">
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-4 text-[11px] text-gray-500 pt-3 border-t border-gray-200">
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-white border border-gray-200"></span> 0 Erros</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-blue-50/50 border border-gray-300/80"></span> 1 Erro</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-blue-100/60 border border-brand-blue-dark/80"></span> 2 Erros</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-brand-blue-dark/20 border border-brand-blue-dark text-brand-blue"></span> 3+ Erros</span>
        </div>
      </div>

      {/* Analyst Erros & Reincidências Modal */}
      {selectedAnalystForModal && (
        <AnalystModal
          analystCode={null}
          analystName={selectedAnalystForModal.name}
          onClose={() => setSelectedAnalystForModal(null)}
        />
      )}
    </div>
  );
};

