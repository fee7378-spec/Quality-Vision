import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, LabelList 
} from 'recharts';
import { AlertCircle, CheckCircle2, TrendingUp, BarChart3, Award, Grid, Briefcase } from 'lucide-react';
import { useStore } from '../store/useStore';


const DONUT_PALETTE = ['#facc15', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];

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

  // Filter dataset
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

  // Helper to test if item is an error considering selectedForma

  const isErrorItem = (item: typeof data[0]) => {
    if (item.Erro !== '0') return false;
    if (selectedForma !== 'TODAS' && item.FormaMonitoria !== selectedForma) return false;
    return true;
  };

  // Executive KPIs
  const totalMonitorias = filteredData.length;
  const totalErros = filteredData.filter(d => isErrorItem(d)).length;
  const qualidadeNum = totalMonitorias > 0 
    ? Number((((totalMonitorias - totalErros) / totalMonitorias) * 100).toFixed(1))
    : 100;
  const qualidade = qualidadeNum.toFixed(1) + '%';

  const getQualityColor = (pct: number) => {
    if (pct >= 97) return 'text-emerald-400';
    if (pct >= 95) return 'text-amber-400';
    if (pct >= 92) return 'text-orange-400';
    return 'text-red-400';
  };

  // Reincidência calculation
  const reincidenciaRate = useMemo(() => {
    if (totalErros === 0) return '0%';
    const analystTagErrorCount: Record<string, number> = {};
    let repeatErrors = 0;

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const key = `${item.CodigoAnalista}_${item.Tag}`;
      analystTagErrorCount[key] = (analystTagErrorCount[key] || 0) + 1;
      if (analystTagErrorCount[key] > 1) {
        repeatErrors++;
      }
    });

    const rate = (repeatErrors / totalErros) * 100;
    return rate.toFixed(1) + '%';
  }, [filteredData, totalErros, selectedForma]);

  // Ranking de Reincidentes (Analistas com mais erros repetidos - Top 10)
  const rankingReincidentes = useMemo(() => {
    const map: Record<string, { nome: string; codigo: string; tagMaisErros: string; totalErros: number; reincidencias: number }> = {};
    const analystTagMap: Record<string, Record<string, number>> = {};

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const name = item.NomeAnalista || 'ANALISTA';
      const code = item.CodigoAnalista || name;
      const tag = item.Tag || 'Geral';

      if (!map[code]) {
        map[code] = { nome: name, codigo: code, tagMaisErros: tag, totalErros: 0, reincidencias: 0 };
        analystTagMap[code] = {};
      }

      map[code].totalErros += 1;
      analystTagMap[code][tag] = (analystTagMap[code][tag] || 0) + 1;
      if (analystTagMap[code][tag] > 1) {
        map[code].reincidencias += 1;
      }
    });

    // Find top tag for each analyst
    Object.keys(map).forEach(code => {
      let topTag = 'Geral';
      let max = 0;
      Object.entries(analystTagMap[code]).forEach(([t, count]) => {
        if (count > max) {
          max = count;
          topTag = t;
        }
      });
      map[code].tagMaisErros = topTag;
    });

    return Object.values(map)
      .filter(a => a.totalErros > 0)
      .sort((a, b) => b.reincidencias - a.reincidencias || b.totalErros - a.totalErros)
      .slice(0, 10);
  }, [filteredData, selectedForma]);

  // Timeline chart: > 31 days = Month, <= 31 days = Day
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
          key = rawDate; // YYYY-MM-DD
          const parts = rawDate.split('-');
          label = `${parts[2]}/${parts[1]}`; // DD/MM
        } else {
          key = rawDate.slice(0, 7); // YYYY-MM
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
  }, [filteredData, selectedForma]);

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
  }, [filteredData, selectedForma]);

  // Erros por Motivo Macro
  const errorsByMacroData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const macro = item.MotivoMacro || 'Geral';
      map[macro] = (map[macro] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, selectedForma]);

  // Heatmap de Esteiras x Mês
  const heatmapEsteiraMes = useMemo(() => {
    const esteiras = Array.from(new Set(filteredData.map(d => d.Esteira))).filter(Boolean) as string[];
    const meses = Array.from(new Set(filteredData.map(d => d.DataMonitoria ? d.DataMonitoria.slice(0, 7) : '2026-07'))).sort() as string[];

    const matrix: Record<string, Record<string, number>> = {};
    esteiras.forEach(e => {
      matrix[e] = {};
      meses.forEach(m => matrix[e][m] = 0);
    });

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const e = item.Esteira;
      const m = item.DataMonitoria ? item.DataMonitoria.slice(0, 7) : '2026-07';
      if (matrix[e] && matrix[e][m] !== undefined) {
        matrix[e][m] += 1;
      }
    });

    return { esteiras, meses, matrix };
  }, [filteredData, selectedForma]);

  return (
    <div className="flex-1 overflow-y-auto bg-black p-8 space-y-8 text-zinc-100">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Produtividade</p>
            <Briefcase size={18} className="text-amber-400" />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalProdutividade.toLocaleString('pt-BR')}</h3>
          <p className="text-xs text-zinc-500 mt-2">Produção de atividades</p>
        </div>


        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Monitorias</p>
            <BarChart3 size={18} className="text-amber-400" />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalMonitorias}</h3>
          <p className="text-xs text-zinc-500 mt-2">Total de monitorias realizadas</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Qualidade</p>
            <CheckCircle2 size={18} className={getQualityColor(qualidadeNum)} />
          </div>
          <h3 className={`text-3xl font-bold ${getQualityColor(qualidadeNum)}`}>{qualidade}</h3>
          <p className="text-xs text-zinc-500 mt-2">Qualidade operacional</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Erros apontados</p>
            <AlertCircle size={18} className="text-red-400" />
          </div>
          <h3 className="text-3xl font-bold text-white">{totalErros}</h3>
          <p className="text-xs text-zinc-500 mt-2">Monitorias com não conformidade</p>
        </div>
      </div>

      {/* Grid: Ranking de Reincidentes & Evolução de Erros */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Ranking de Reincidentes (Top 10 com barra de rolagem) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-md flex flex-col h-[340px]">
          <div className="flex-shrink-0 mb-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              Ranking Reincidentes
            </h3>
            <p className="text-xs text-zinc-400">Analistas com maior reincidência por tag</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 custom-scrollbar">
            {rankingReincidentes.length > 0 ? (
              rankingReincidentes.map((item, idx) => (
                <div key={item.codigo + idx} className="bg-black border border-zinc-800 p-3 rounded-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-amber-400">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{item.nome}</p>
                      <p className="text-[10px] text-zinc-500">{item.tagMaisErros}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-red-950/60 border border-red-800/80 text-red-400 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {item.reincidencias} reincidência(s)
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{item.totalErros} erros totais</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma reincidência registrada no período.</p>
            )}
          </div>
        </div>

        {/* Evolução de Erros no Tempo */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 rounded-md flex flex-col h-[340px]">
          <div className="flex items-center justify-between flex-shrink-0 mb-3">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
              Evolução de erros
            </h3>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData.list} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} padding={{ left: 30, right: 30 }} />
                <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', color: '#fff' }} />
                <Line type="monotone" dataKey="erros" name="Erros" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }}>
                  <LabelList dataKey="erros" position="top" offset={10} fill="#f59e0b" fontSize={11} fontWeight="bold" />
                </Line>
                <Line type="monotone" dataKey="total" name="Total Monitorias" stroke="#71717a" strokeWidth={1.5} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Erros por TAG & Motivo Macro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Erros por TAG com rolagem horizontal e rótulos de dados */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md">
          <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
            Erros por TAG
          </h3>
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(errorsByTagData.length * 130, 520) }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={errorsByTagData} margin={{ top: 20, right: 20, left: -10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="tag" stroke="#71717a" interval={0} tick={<CustomXAxisTick />} height={65} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', color: '#fff' }} />
                  <Bar dataKey="count" name="Quantidade de Erros" fill="#facc15" radius={[4, 4, 0, 0]} barSize={36}>
                    <LabelList dataKey="count" position="top" fill="#ffffff" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfico de Rosca com legenda vertical à direita e rótulo de dados */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md">
          <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
            Erros por motivo Macro
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={errorsByMacroData.length > 0 ? errorsByMacroData : [{ name: 'Sem Erros', value: 1 }]}
                dataKey="value"
                nameKey="name"
                cx="35%"
                cy="50%"
                outerRadius={80}
                innerRadius={42}
                paddingAngle={4}
                label={({ value }) => `${value}`}
                labelLine={false}
              >
                {errorsByMacroData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_PALETTE[index % DONUT_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', color: '#fff' }} />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle" 
                wrapperStyle={{ fontSize: '11px', color: '#ffffff', paddingLeft: '10px' }} 
                formatter={(value) => <span style={{ color: '#ffffff', fontWeight: 500 }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

