import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, LabelList 
} from 'recharts';
import { AlertCircle, CheckCircle2, Award, Briefcase, BarChart3, PieChart as PieIcon, Filter, Calendar } from 'lucide-react';
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

export const DashboardPage = () => {
  const { 
    data, 
    productivityData,
    startDate, 
    endDate, 
    selectedTag, 
    selectedMacro, 
    selectedEsteira,
    selectedForma
  } = useStore();

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
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
      if (selectedForma !== 'TODAS' && item.FormaMonitoria !== selectedForma) return false;
      if (selectedTag !== 'TODAS' && item.Tag !== selectedTag) return false;
      if (selectedMacro !== 'TODOS' && item.MotivoMacro !== selectedMacro) return false;
      return true;
    });
  }, [baseDateData, selectedEsteira, selectedForma, selectedTag, selectedMacro]);

  // Total Produtividade calculation
  const totalProdutividade = useMemo(() => {
    return productivityData
      .filter(item => {
        if (startDate && item.DataProdutividade && item.DataProdutividade < startDate) return false;
        if (endDate && item.DataProdutividade && item.DataProdutividade > endDate) return false;
        if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
        return true;
      })
      .reduce((sum, item) => sum + (Number(item.Quantidade) || 1), 0);
  }, [productivityData, startDate, endDate, selectedEsteira]);

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

  // Executive KPIs (Affected by all active filters except Produtividade)
  const totalMonitorias = filteredData.length;
  const totalErros = filteredData.filter(d => isErrorItem(d)).length;
  const qualidadeNum = totalMonitorias > 0 
    ? Number((((totalMonitorias - totalErros) / totalMonitorias) * 100).toFixed(1))
    : 100;
  const qualidade = qualidadeNum.toFixed(1) + '%';

  const getQualityColor = (pct: number) => {
    if (pct >= 97) return 'text-emerald-400';
    if (pct >= 95) return 'text-amber-500';
    if (pct >= 92) return 'text-orange-400';
    return 'text-red-400';
  };

  // Identify recurrences based on the FULL monitora base (data)
  const errorIsRecurrence = useMemo(() => {
    const isRecurrenceMap = new Map<any, boolean>();
    const analystTagHistory: Record<string, Set<string>> = {};

    [...data]
      .filter(d => isErrorItem(d))
      .sort((a, b) => (a.DataMonitoria || "").localeCompare(b.DataMonitoria || ""))
      .forEach(item => {
        const name = item.NomeAnalista || "ANALISTA";
        const code = item.CodigoAnalista || name;
        const tag = (item.Tag && item.Tag.trim()) ? item.Tag.trim() : "Geral";

        if (!analystTagHistory[code]) {
          analystTagHistory[code] = new Set();
        }

        if (analystTagHistory[code].has(tag)) {
          isRecurrenceMap.set(item, true);
        } else {
          isRecurrenceMap.set(item, false);
          analystTagHistory[code].add(tag);
        }
      });
    return isRecurrenceMap;
  }, [data]);

  // Ranking de Reincidentes (Calculado por tag por analista na base full)
  const rankingReincidentes = useMemo(() => {
    const analystStats: Record<string, { nome: string; totalErros: number; reincidencias: number; tags: Record<string, number> }> = {};

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const name = item.NomeAnalista || "ANALISTA";
      const code = item.CodigoAnalista || name;
      const tag = (item.Tag && item.Tag.trim()) ? item.Tag.trim() : "Geral";

      if (!analystStats[code]) {
        analystStats[code] = { nome: name, totalErros: 0, reincidencias: 0, tags: {} };
      }
      
      analystStats[code].totalErros += 1;
      analystStats[code].tags[tag] = (analystStats[code].tags[tag] || 0) + 1;
      
      if (errorIsRecurrence.get(item)) {
        analystStats[code].reincidencias += 1;
      }
    });

    const result = Object.entries(analystStats).map(([code, stats]) => {
      let tagMaisErros = "Geral";
      let topTagCount = 0;
      
      Object.entries(stats.tags).forEach(([tag, count]) => {
        if (count > topTagCount) {
          topTagCount = count;
          tagMaisErros = tag;
        }
      });

      return {
        codigo: code,
        nome: stats.nome,
        totalErros: stats.totalErros,
        reincidencias: stats.reincidencias,
        tagMaisErros,
        topTagCount,
        tagsCount: Object.keys(stats.tags).length
      };
    })
    .filter(a => a.totalErros > 0)
    .sort((a, b) => b.reincidencias - a.reincidencias || b.totalErros - a.totalErros)
    .slice(0, 15);

    return result;
  }, [filteredData, errorIsRecurrence]);

  // Timeline chart: Filtered Data
  const timelineData = useMemo(() => {
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
  }, [filteredData]);

  // Evolução Diária da Produtividade
  const evolucaoDiaria = useMemo(() => {
    const map: Record<string, number> = {};
    productivityData
      .filter(item => {
        if (startDate && item.DataProdutividade && item.DataProdutividade < startDate) return false;
        if (endDate && item.DataProdutividade && item.DataProdutividade > endDate) return false;
        if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
        return true;
      })
      .forEach(p => {
        const d = p.DataProdutividade;
        if (d) {
          map[d] = (map[d] || 0) + (p.Quantidade || 1);
        }
      });

    return Object.keys(map).sort().map(d => {
      const [y, m, day] = d.split('-');
      return {
        dataRaw: d,
        label: `${day}/${m}`,
        volume: map[d]
      };
    });
  }, [productivityData, startDate, endDate, selectedEsteira]);

  return (
    <div className="w-full bg-black p-4 sm:p-6 md:p-8 space-y-8 text-zinc-100">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-600/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">PRODUTIVIDADE</p>
            <Briefcase size={18} className="text-amber-500" />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalProdutividade.toLocaleString('pt-BR')}</h3>
          <p className="text-[10px] text-zinc-500/80 mt-1">Produção de atividades tratadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-600/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">MONITORIAS</p>
            <BarChart3 size={18} className="text-amber-500" />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalMonitorias}</h3>
          <p className="text-[10px] text-zinc-500/80 mt-1">Total de monitorias no filtro</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-600/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">QUALIDADE</p>
            <CheckCircle2 size={18} className={getQualityColor(qualidadeNum)} />
          </div>
          <h3 className={`text-3xl font-bold ${getQualityColor(qualidadeNum)}`}>{qualidade}</h3>
          <p className="text-[10px] text-zinc-500/80 mt-1">Qualidade operacional no filtro</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-600/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">ERROS APONTADOS</p>
            <AlertCircle size={18} className="text-red-400" />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalErros}</h3>
          <p className="text-[10px] text-zinc-500/80 mt-1">Monitorias com não conformidade</p>
        </div>
      </div>

      {/* SECTION 3: Evolução Diária */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <Calendar size={18} className="text-amber-500" />
              EVOLUÇÃO DA PRODUTIVIDADE DIÁRIA
            </h3>
            <p className="text-[11px] text-zinc-500/80 mt-0.5">Distribuição do volume diário do período</p>
          </div>

        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucaoDiaria} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
              <Line type="monotone" dataKey="volume" name="Itens Tratados" stroke="#FFFF00" strokeWidth={3} dot={{ fill: '#FFFF00', r: 5 }}>
                <LabelList dataKey="volume" position="top" offset={10} fill="#FFFF00" fontSize={11} fontWeight="bold" />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Grid: Ranking de Reincidentes & Evolução de Erros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Ranking de Reincidentes (Filtered by Esteira/Tag/Macro) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-md flex flex-col h-[360px]">
          <div className="flex-shrink-0 mb-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <Award size={18} className="text-amber-500" />
              RANKING REINCIDENTES
            </h3>
            <p className="text-[11px] text-zinc-500/80 mt-0.5">Calculado pela repetição de tags por analista</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
            {rankingReincidentes.length > 0 ? (
              rankingReincidentes.map((item, idx) => (
                <div key={item.codigo + idx} className="bg-black border border-zinc-800 p-3 rounded-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-amber-500 flex-shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">{item.nome}</p>
                      <p className="text-[10px] text-amber-500/90 truncate mt-0.5">
                        Tag principal: <span className="font-semibold">{item.tagMaisErros}</span> ({item.topTagCount}x)
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="bg-red-950/60 border border-red-800/80 text-red-400 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {item.reincidencias} reincidência(s)
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {item.totalErros} erro(s) em {item.tagsCount} tag(s)
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma reincidência registrada no filtro atual.</p>
            )}
          </div>
        </div>

        {/* Evolução de Erros no Tempo */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 rounded-md flex flex-col h-[360px]">
          <div className="flex items-center justify-between flex-shrink-0 mb-3">
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-600"></span>
              EVOLUÇÃO DE ERROS
            </h3>

            {/* Fixed Legend opposite Title */}
            <div className="flex items-center gap-3 bg-black/70 border border-zinc-800 px-3 py-1 rounded-md text-xs font-bold">
              <div className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                <span>Erros</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block" />
                <span>Total Monitorias</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData.list} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} padding={{ left: 30, right: 30 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', color: '#fff' }} />
                <Line type="monotone" dataKey="erros" name="Erros" stroke="#FFFF00" strokeWidth={3} dot={{ fill: '#FFFF00', r: 4 }}>
                  <LabelList dataKey="erros" position="top" offset={10} fill="#FFFF00" fontSize={11} fontWeight="bold" />
                </Line>
                <Line type="monotone" dataKey="total" name="Total Monitorias" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};
