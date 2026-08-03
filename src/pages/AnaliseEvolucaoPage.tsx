import { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LabelList, Legend, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Grid, PieChart as PieIcon } from 'lucide-react';
import { useStore } from '../store/useStore';

const MACRO_COLORS = ['#FFFF00', '#FFFF00', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#FFFF00'];

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
    startDate, 
    endDate, 
    selectedTag, 
    selectedMacro, 
    selectedEsteira,
    selectedForma
  } = useStore();

  const [heatmapViewMode, setHeatmapViewMode] = useState<'esteira' | 'analista'>('esteira');

  // Filter dataset by date and controls
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      if (selectedTag !== 'TODAS' && item.Tag !== selectedTag) return false;
      if (selectedMacro !== 'TODOS' && item.MotivoMacro !== selectedMacro) return false;
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedTag, selectedMacro, selectedEsteira]);

  // Helper to check if item is an error considering selectedForma filter
  const isErrorItem = (item: typeof data[0]) => {
    if (item.Erro !== '0') return false;
    if (selectedForma !== 'TODAS' && item.FormaMonitoria !== selectedForma) return false;
    return true;
  };

  // 1. Índice de Evolução e Tendência (Mensal ou Semanal se <= 1 mês)
  const tendenciaData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const months = Array.from(new Set(filteredData.map(d => d.DataMonitoria ? d.DataMonitoria.slice(0, 7) : ''))).filter(Boolean);
    const isOneMonthOrLess = months.length <= 1;

    if (isOneMonthOrLess) {
      // Group by weeks
      const weekMap: Record<string, { total: number; erros: number }> = {
        'Semana 1': { total: 0, erros: 0 },
        'Semana 2': { total: 0, erros: 0 },
        'Semana 3': { total: 0, erros: 0 },
        'Semana 4': { total: 0, erros: 0 }
      };

      filteredData.forEach(item => {
        if (!item.DataMonitoria) return;
        const parts = item.DataMonitoria.split('-');
        const dayNum = parseInt(parts[2] || '1', 10);
        let weekKey = 'Semana 1';
        if (dayNum >= 1 && dayNum <= 7) weekKey = 'Semana 1';
        else if (dayNum >= 8 && dayNum <= 14) weekKey = 'Semana 2';
        else if (dayNum >= 15 && dayNum <= 21) weekKey = 'Semana 3';
        else if (dayNum >= 22) weekKey = 'Semana 4';

        weekMap[weekKey].total += 1;
        if (isErrorItem(item)) {
          weekMap[weekKey].erros += 1;
        }
      });

      return Object.entries(weekMap).map(([week, vals]) => {
        const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
        return {
          label: week,
          qualidade,
          erros: vals.erros,
          total: vals.total
        };
      });
    } else {
      // Group by months
      const monthMap: Record<string, { total: number; erros: number }> = {};

      filteredData.forEach(item => {
        const monthStr = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : 'Sem Data';
        if (!monthMap[monthStr]) {
          monthMap[monthStr] = { total: 0, erros: 0 };
        }
        monthMap[monthStr].total += 1;
        if (isErrorItem(item)) {
          monthMap[monthStr].erros += 1;
        }
      });

      return Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, vals]) => {
          const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
          const [y, m] = mes.split('-');
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const mIdx = parseInt(m, 10) - 1;
          const label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y?.slice(2) || ''}` : mes;

          return {
            label,
            qualidade,
            erros: vals.erros,
            total: vals.total
          };
        });
    }
  }, [filteredData, selectedForma]);

  // 2. Heatmap de Reincidência de Erros
  const heatmapData = useMemo(() => {
    const isEsteiraMode = heatmapViewMode === 'esteira';

    const categories = isEsteiraMode
      ? (Array.from(new Set(filteredData.map(d => d.Esteira))).filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b))
      : (Array.from(new Set(filteredData.map(d => d.NomeAnalista))).filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b));

    const columns = Array.from(new Set(filteredData.map(d => d.DataMonitoria ? d.DataMonitoria.slice(0, 7) : '2026-07'))).sort() as string[];

    const matrix: Record<string, Record<string, number>> = {};

    categories.forEach(cat => {
      matrix[cat] = {};
      columns.forEach(col => {
        matrix[cat][col] = 0;
      });
    });

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const catKey = isEsteiraMode ? item.Esteira : item.NomeAnalista;
      const colKey = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : '2026-07';

      if (matrix[catKey] && matrix[catKey][colKey] !== undefined) {
        matrix[catKey][colKey] += 1;
      }
    });

    return { categories, columns, matrix, isEsteiraMode };
  }, [filteredData, heatmapViewMode, selectedForma]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-zinc-950 text-zinc-600 border-zinc-800';
    if (count === 1) return 'bg-amber-950/50 text-amber-500 border-amber-800/80 font-bold';
    if (count === 2) return 'bg-amber-900/60 text-amber-200 border-amber-600/80 font-bold';
    return 'bg-amber-600/20 text-amber-500 font-extrabold border-amber-600 shadow-sm shadow-amber-500/10';
  };

  // Erros por TAG
  const errorsByTagData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const tag = item.Tag || 'Geral';
      map[tag] = (map[tag] || 0) + 1;
    });

    return Object.entries(map)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Erros por Motivo Macro (Enhanced & Intuitive)
  const errorsByMacroData = useMemo(() => {
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
  }, [filteredData]);

  return (
    <div className="w-full bg-black p-4 sm:p-6 md:p-8 space-y-8 text-zinc-100">
      {/* Section 1: Índice de Evolução e Tendência */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <TrendingUp size={20} className="text-amber-500" />
              ÍNDICE DE EVOLUÇÃO
            </h3>
            <p className="text-[11px] text-zinc-500/80 mt-0.5">Evolução do percentual de qualidade (%) ao longo do período</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={tendenciaData} margin={{ top: 25, right: 30, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="qualidadeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFFF00" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#FFFF00" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} padding={{ left: 35, right: 35 }} />
            <YAxis stroke="#71717a" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', color: '#fff' }} 
              itemStyle={{ color: '#FFFF00' }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            />
            <Area type="monotone" dataKey="qualidade" name="Qualidade (%)" stroke="#FFFF00" strokeWidth={3} fillOpacity={1} fill="url(#qualidadeGrad)">
              <LabelList dataKey="qualidade" position="top" offset={10} fill="#FFFF00" fontSize={11} fontWeight="bold" formatter={(v: any) => `${v}%`} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grid: Erros por TAG & Motivo Macro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Erros por TAG com rolagem horizontal e rótulos de dados */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md">
          <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2 uppercase">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FFFF00]"></span>
            ERROS POR TAG
          </h3>
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(errorsByTagData.length * 130, 480) }}>
              <ResponsiveContainer width="100%" height="380">
                <BarChart data={errorsByTagData} margin={{ top: 20, right: 20, left: -10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="tag" stroke="#71717a" interval={0} tick={<CustomXAxisTick />} height={65} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', color: '#fff' }} />
                  <Bar dataKey="count" name="Quantidade de Erros" fill="#FFFF00" radius={[4, 4, 0, 0]} barSize={36}>
                    <LabelList dataKey="count" position="top" fill="#ffffff" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Intuitive and Visual Erros por Motivo Macro */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <PieIcon size={18} className="text-amber-500" />
              ERROS POR MOTIVOS MACRO
            </h3>
            <p className="text-[11px] text-zinc-500/80 mt-0.5">Distribuição percentual e absoluta de falhas por motivo macro</p>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
            {errorsByMacroData.length > 0 ? (
              errorsByMacroData.map((item) => (
                <div key={item.name} className="bg-black border border-zinc-800 p-3 rounded-md space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="text-amber-500 font-bold">
                      {item.value} erro(s) ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 text-center py-8">Nenhum erro por motivo macro no período selecionado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Grid Section 2: Heatmap ocupando 100% da área horizontal com filtro por Esteira / Analista */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <Grid size={20} className="text-amber-500" />
              HEATMAP DE OCORRÊNCIAS
            </h3>
            <p className="text-[11px] text-zinc-500/80 mt-0.5">
              Matriz de calor de volume de erros {heatmapData.isEsteiraMode ? 'dividida por Esteira Operacional' : 'dividida por Analista'} no tempo
            </p>
          </div>

          {/* Filtro inline no próprio quadro */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-md border border-zinc-800">
            <button
              onClick={() => setHeatmapViewMode('esteira')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                heatmapViewMode === 'esteira'
                  ? 'bg-amber-600 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Por Esteira
            </button>
            <button
              onClick={() => setHeatmapViewMode('analista')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                heatmapViewMode === 'analista'
                  ? 'bg-amber-600 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Por Analista
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto my-2 custom-scrollbar border border-zinc-800 rounded-md">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="sticky top-0 bg-zinc-900 z-10 shadow-sm shadow-black">
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                <th className="p-3 text-left min-w-[200px] bg-zinc-900">
                  {heatmapData.isEsteiraMode ? 'Esteira Operacional' : 'Analista'}
                </th>
                {heatmapData.columns.map(c => {
                  const [y, m] = c.split('-');
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const mIdx = parseInt(m, 10) - 1;
                  const label = monthNames[mIdx] ? `${monthNames[mIdx]}/${y?.slice(2) || ''}` : c;
                  return (
                    <th key={c} className="p-3 min-w-[90px] bg-zinc-900">{label}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {heatmapData.categories.length > 0 ? (
                heatmapData.categories.map(cat => (
                  <tr key={cat} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                    <td className="p-3 text-left font-semibold text-white truncate max-w-[220px]" title={cat}>{cat}</td>
                    {heatmapData.columns.map(col => {
                      const count = heatmapData.matrix[cat]?.[col] || 0;
                      return (
                        <td key={col} className="p-2">
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
                  <td colSpan={heatmapData.columns.length + 1} className="p-8 text-center text-zinc-500">
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-4 text-[11px] text-zinc-400 pt-3 border-t border-zinc-800">
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-zinc-950 border border-zinc-800"></span> 0 Erros</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-amber-950/50 border border-amber-800/80"></span> 1 Erro</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-amber-900/60 border border-amber-600/80"></span> 2 Erros</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-amber-600/20 border border-amber-600 text-amber-500"></span> 3+ Erros</span>
        </div>
      </div>
    </div>
  );
};

