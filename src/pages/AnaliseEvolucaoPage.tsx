import { useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, LabelList 
} from 'recharts';
import { TrendingUp, Grid } from 'lucide-react';
import { useStore } from '../store/useStore';

export const AnaliseEvolucaoPage = () => {
  const { 
    data, 
    startDate, 
    endDate, 
    selectedTag, 
    selectedMacro, 
    selectedEsteira
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

  // 1. Índice de Evolução e Tendência Mensal
  const tendenciaMensalData = useMemo(() => {
    const monthMap: Record<string, { total: number; erros: number }> = {};

    filteredData.forEach(item => {
      const monthStr = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : 'Sem Data'; // YYYY-MM
      if (!monthMap[monthStr]) {
        monthMap[monthStr] = { total: 0, erros: 0 };
      }
      monthMap[monthStr].total += 1;
      if (item.Erro === '0') {
        monthMap[monthStr].erros += 1;
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, vals]) => {
        const qualidade = vals.total > 0 ? Number((((vals.total - vals.erros) / vals.total) * 100).toFixed(1)) : 100;
        const taxaErro = vals.total > 0 ? Number(((vals.erros / vals.total) * 100).toFixed(1)) : 0;
        
        const [y, m] = mes.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mIdx = parseInt(m, 10) - 1;
        const mesFormatted = monthNames[mIdx] ? `${monthNames[mIdx]}/${y?.slice(2) || ''}` : mes;

        return {
          mes,
          mesFormatted,
          qualidade,
          taxaErro,
          erros: vals.erros,
          total: vals.total
        };
      });
  }, [filteredData]);

  // 2. Heatmap de Reincidência de Erros (Alternável: Por Esteira vs Por Analista)
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

    filteredData.filter(d => d.Erro === '0').forEach(item => {
      const catKey = isEsteiraMode ? item.Esteira : item.NomeAnalista;
      const colKey = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : '2026-07';

      if (matrix[catKey] && matrix[catKey][colKey] !== undefined) {
        matrix[catKey][colKey] += 1;
      }
    });

    return { categories, columns, matrix, isEsteiraMode };
  }, [filteredData, heatmapViewMode]);

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-black text-zinc-600 border-zinc-800';
    if (count === 1) return 'bg-yellow-950/40 text-yellow-300 border-yellow-800/80 font-bold';
    if (count === 2) return 'bg-[#ffff00]/30 text-[#ffff00] border-[#ffff00]/60 font-bold';
    return 'bg-[#ffff00] text-black font-extrabold border-[#ffff00] shadow-sm shadow-[#ffff00]/20';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-black p-8 space-y-8 text-zinc-100">
      {/* Section 1: Índice de Evolução Mensal */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <TrendingUp size={20} className="text-[#ffff00]" />
              Índice de Evolução e Tendência Mensal
            </h3>
            <p className="text-xs text-zinc-400 mt-1">Evolução do percentual de qualidade (%) ao longo dos meses</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={tendenciaMensalData} margin={{ top: 20, right: 15, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="qualidadeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffff00" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#ffff00" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="mesFormatted" stroke="#71717a" tick={{ fontSize: 11 }} />
            <YAxis stroke="#71717a" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
            />
            <Area type="monotone" dataKey="qualidade" name="Qualidade %" stroke="#ffff00" strokeWidth={3} fillOpacity={1} fill="url(#qualidadeGrad)">
              <LabelList dataKey="qualidade" position="top" fill="#ffff00" fontSize={10} fontWeight="bold" formatter={(v: any) => `${v}%`} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grid Section 2: Heatmap ocupando 100% da área horizontal com filtro por Esteira / Analista */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Grid size={20} className="text-[#ffff00]" />
              Heatmap de Reincidência e Ocorrências
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Matriz de calor de volume de erros {heatmapData.isEsteiraMode ? 'dividida por Esteira Operacional' : 'dividida por Analista'} no tempo
            </p>
          </div>

          {/* Filtro inline no próprio quadro */}
          <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setHeatmapViewMode('esteira')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                heatmapViewMode === 'esteira'
                  ? 'bg-[#ffff00] text-black shadow-sm shadow-[#ffff00]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Por Esteira
            </button>
            <button
              onClick={() => setHeatmapViewMode('analista')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                heatmapViewMode === 'analista'
                  ? 'bg-[#ffff00] text-black shadow-sm shadow-[#ffff00]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Por Analista
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto my-2 custom-scrollbar border border-zinc-800 rounded-xl">
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
                          <div className={`py-2 px-3 rounded-lg border text-xs font-bold transition-transform hover:scale-105 ${getHeatmapColor(count)}`}>
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
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-black border border-zinc-800"></span> 0 Erros</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-yellow-950/40 border border-yellow-800"></span> 1 Erro</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-[#ffff00]/30 border border-[#ffff00]/60"></span> 2 Erros</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-[#ffff00] border border-[#ffff00]"></span> 3+ Erros</span>
        </div>
      </div>
    </div>
  );
};

