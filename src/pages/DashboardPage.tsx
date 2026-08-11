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
    return productivityData
      .filter(item => {
        if (startDate && item.DataProdutividade && item.DataProdutividade < startDate) return false;
        if (endDate && item.DataProdutividade && item.DataProdutividade < endDate) return false;
        if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
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

  // Executive KPIs (Affected by date and esteira/active filters)
  // Total Monitorias: sum of quantidade in table monitorias
  const totalMonitorias = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + (Number(item.Quantidade) || 1), 0);
  }, [filteredData]);

  // Total Erros: count of rows in table monitoriaErros
  const totalErros = useMemo(() => {
    return filteredData.filter(d => isErrorItem(d)).length;
  }, [filteredData]);

  // Qualidade: (Total Monitorias - Total Erros) / Total Monitorias * 100
  const qualidadeNum = totalMonitorias > 0 
    ? Number((((totalMonitorias - totalErros) / totalMonitorias) * 100).toFixed(1))
    : 100;
  const qualidade = qualidadeNum.toFixed(1).replace('.', ',') + '%';

  const getQualityColor = (pct: number) => {
    if (pct >= 97) return 'text-emerald-600';
    if (pct >= 95) return 'text-brand-blue';
    if (pct >= 92) return 'text-orange-600';
    return 'text-red-600';
  };

  // Ranking de Reincidentes (Contagem de linhas na tabela monitoriaErros agrupadas por coluna Tag)
  const rankingReincidentes = useMemo(() => {
    const tagStats: Record<string, { tag: string; count: number; analistas: Map<string, number> }> = {};

    filteredData.filter(d => isErrorItem(d)).forEach(item => {
      const tag = (item.Tag && item.Tag.trim()) ? item.Tag.trim() : "Geral";
      const name = item.NomeAnalista || "ANALISTA";

      if (!tagStats[tag]) {
        tagStats[tag] = { tag, count: 0, analistas: new Map() };
      }
      
      tagStats[tag].count += 1; // Contagem de linhas na tabela monitoriaErros
      const currentAnalystCount = tagStats[tag].analistas.get(name) || 0;
      tagStats[tag].analistas.set(name, currentAnalystCount + 1);
    });

    return Object.values(tagStats)
      .map(stat => {
        const sortedAnalysts = Array.from(stat.analistas.entries()).sort((a, b) => b[1] - a[1]);
        return {
          tag: stat.tag,
          count: stat.count, // Quantidade de linhas em monitoriaErros
          analistasCount: stat.analistas.size,
          topAnalista: sortedAnalysts[0]?.[0] || 'N/A',
          topAnalistaErros: sortedAnalysts[0]?.[1] || 0
        };
      })
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [filteredData]);

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
        if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
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
              <span>Itens Tratados</span>
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
              EVOLUÇÃO DA PRODUTIVIDADE DIÁRIA
            </h3>
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
              <Line type="monotone" dataKey="volume" name="Itens Tratados" stroke="#001E62" strokeWidth={3} dot={{ fill: '#001E62', r: 5 }}>
                <LabelList dataKey="volume" position="top" offset={10} fill="#001E62" fontSize={11} fontWeight="bold" />
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
                  key={item.tag + idx} 
                  className="bg-gray-50 border border-gray-200 hover:border-brand-blue/60 p-3 rounded-md flex items-center justify-between gap-3 transition-all hover:bg-white group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-gray-100 border border-gray-300 group-hover:border-brand-blue flex items-center justify-center font-bold text-xs text-brand-blue flex-shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-brand-blue-light truncate">
                        {item.tag}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        Maior ofensor: <span className="font-semibold text-gray-700">{item.topAnalista}</span> ({item.topAnalistaErros}x)
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="bg-red-50 border border-red-300 text-red-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {item.count} erro(s)
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {item.analistasCount} analista(s)
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
