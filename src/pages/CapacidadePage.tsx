import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Users, Target, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, Sliders, Calendar, Zap, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  Legend, LabelList, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { useStore, isValidAnalystName } from '../store/useStore';

export const CapacidadePage: React.FC = () => {
  const { productivityData } = useStore();

  // Configurable parameters for capacity estimation
  const [targetDailyPerAnalyst, setTargetDailyPerAnalyst] = useState<number>(45);
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState<number>(22);

  // 1. Month-over-Month Volume Comparison & Provision / Projection
  const momData = useMemo(() => {
    const monthVolumeMap: Record<string, { monthKey: string; monthLabel: string; volume: number; daysCount: Set<string> }> = {};

    productivityData.forEach(item => {
      const dateStr = item.DataProdutividade;
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

      const [year, month] = dateStr.split('-');
      const key = `${year}-${month}`;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthIndex = parseInt(month, 10) - 1;
      const label = `${monthNames[monthIndex] || month}/${year.slice(2)}`;

      if (!monthVolumeMap[key]) {
        monthVolumeMap[key] = { monthKey: key, monthLabel: label, volume: 0, daysCount: new Set() };
      }

      monthVolumeMap[key].volume += (item.Quantidade || 1);
      monthVolumeMap[key].daysCount.add(dateStr);
    });

    const sortedKeys = Object.keys(monthVolumeMap).sort();
    
    // Calculate Provisão for the latest month based on daily rate
    const list = sortedKeys.map((key, idx) => {
      const entry = monthVolumeMap[key];
      const prevEntry = sortedKeys[idx - 1] ? monthVolumeMap[sortedKeys[idx - 1]] : null;
      const momGrowth = prevEntry && prevEntry.volume > 0 
        ? (((entry.volume - prevEntry.volume) / prevEntry.volume) * 100).toFixed(1) 
        : '0';

      const daysWorked = entry.daysCount.size || 1;
      const avgDailyRate = entry.volume / daysWorked;
      const projectedVolume = Math.round(avgDailyRate * workingDaysInMonth);

      return {
        key: entry.monthKey,
        label: entry.monthLabel,
        volumeRealizado: entry.volume,
        provisaoProjetada: Math.max(entry.volume, projectedVolume),
        daysWorked,
        momGrowth
      };
    });

    return list;
  }, [productivityData, workingDaysInMonth]);

  const latestMonth = momData[momData.length - 1] || { volumeRealizado: 0, provisaoProjetada: 0, momGrowth: '0' };
  const prevMonth = momData[momData.length - 2] || { volumeRealizado: 0 };

  // 2. Active Analysts list & Individual Capacity Calculation
  const analystCapacityList = useMemo(() => {
    const analystMap: Record<string, { name: string; totalVolume: number; daysWorked: Set<string>; esteiras: Set<string> }> = {};

    productivityData.forEach(p => {
      const name = p.NomeAnalista;
      if (!isValidAnalystName(name)) return;

      if (!analystMap[name]) {
        analystMap[name] = { name, totalVolume: 0, daysWorked: new Set(), esteiras: new Set() };
      }

      analystMap[name].totalVolume += (p.Quantidade || 1);
      if (p.DataProdutividade) analystMap[name].daysWorked.add(p.DataProdutividade);
      if (p.Esteira) analystMap[name].esteiras.add(p.Esteira);
    });

    const monthlyTarget = targetDailyPerAnalyst * workingDaysInMonth;

    return Object.values(analystMap).map(a => {
      const activeDays = a.daysWorked.size || 1;
      const expectedTarget = targetDailyPerAnalyst * activeDays;
      const volume = a.totalVolume;
      const gapSobra = volume - expectedTarget;
      const utilizationPercent = Math.round((volume / expectedTarget) * 100);

      let status = 'Equilibrado';
      let statusColor = 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      if (utilizationPercent > 110) {
        status = 'Sobrecarga / Alta Demanda';
        statusColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      } else if (utilizationPercent < 80) {
        status = 'Sobra de Capacidade';
        statusColor = 'text-blue-400 bg-blue-950/60 border-blue-800';
      }

      return {
        name: a.name,
        totalVolume: volume,
        activeDays,
        expectedTarget,
        gapSobra,
        utilizationPercent,
        status,
        statusColor,
        esteirasCount: a.esteiras.size
      };
    }).sort((a, b) => b.totalVolume - a.totalVolume);
  }, [productivityData, targetDailyPerAnalyst, workingDaysInMonth]);

  // 3. Overall Team Capacity Summary
  const teamCapacitySummary = useMemo(() => {
    const activeAnalystsCount = analystCapacityList.length;
    const teamMonthlyCapacity = activeAnalystsCount * targetDailyPerAnalyst * workingDaysInMonth;
    const teamCurrentVolume = latestMonth.volumeRealizado;
    const teamProjectedVolume = latestMonth.provisaoProjetada;

    const capacityGap = teamMonthlyCapacity - teamProjectedVolume; // Positive = Sobra, Negative = Déficit
    const teamUtilization = teamMonthlyCapacity > 0 ? Math.round((teamProjectedVolume / teamMonthlyCapacity) * 100) : 0;

    return {
      activeAnalystsCount,
      teamMonthlyCapacity,
      teamCurrentVolume,
      teamProjectedVolume,
      capacityGap,
      teamUtilization
    };
  }, [analystCapacityList, latestMonth, targetDailyPerAnalyst, workingDaysInMonth]);

  return (
    <div className="p-6 md:p-8 bg-black text-zinc-100 min-h-screen space-y-8 overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="text-amber-400" size={26} />
            Capacidade & Projeção
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Projeção mensal de volumetria, comparação MoM e dimensionamento de capacidade (Capacity & FTE Gap)
          </p>
        </div>

        {/* Capacity Parameters Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sliders size={15} className="text-amber-400" />
            <span className="font-semibold text-zinc-300">Parâmetros de Capacidade:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-zinc-400">Meta/Dia Analista:</label>
            <input 
              type="number" 
              value={targetDailyPerAnalyst} 
              onChange={(e) => setTargetDailyPerAnalyst(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-black border border-zinc-800 rounded px-2 py-1 text-white text-xs text-center font-bold outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-zinc-400">Dias Úteis Mês:</label>
            <input 
              type="number" 
              value={workingDaysInMonth} 
              onChange={(e) => setWorkingDaysInMonth(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-black border border-zinc-800 rounded px-2 py-1 text-white text-xs text-center font-bold outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Volume Realizado x MoM */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-400/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Volume Mês Atual</span>
            <Calendar size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-white">{latestMonth.volumeRealizado.toLocaleString('pt-BR')}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
              parseFloat(latestMonth.momGrowth) >= 0 
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' 
                : 'text-red-400 bg-red-950/60 border-red-800'
            }`}>
              {parseFloat(latestMonth.momGrowth) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {latestMonth.momGrowth}% MoM
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Mês anterior: {prevMonth.volumeRealizado.toLocaleString('pt-BR')} itens
          </p>
        </div>

        {/* KPI 2: Provisão / Projeção Final do Mês */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-400/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Provisão de Fechamento</span>
            <Zap size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-amber-400">{latestMonth.provisaoProjetada.toLocaleString('pt-BR')}</h3>
            <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              Projeção 100%
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Volume estimado para o fim do mês mantendo o ritmo atual
          </p>
        </div>

        {/* KPI 3: Capacidade Nominal Total */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-400/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Capacidade Nominal Equipe</span>
            <Target size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-white">{teamCapacitySummary.teamMonthlyCapacity.toLocaleString('pt-BR')}</h3>
            <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              {teamCapacitySummary.activeAnalystsCount} Analistas
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Calculado com base em {targetDailyPerAnalyst} itens/dia x {workingDaysInMonth} dias úteis
          </p>
        </div>

        {/* KPI 4: Gap / Sobra de Capacidade */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-400/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>Balanço de Capacidade (FTE)</span>
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className={`text-2xl font-extrabold ${teamCapacitySummary.capacityGap >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {teamCapacitySummary.capacityGap >= 0 ? `+${teamCapacitySummary.capacityGap.toLocaleString('pt-BR')}` : teamCapacitySummary.capacityGap.toLocaleString('pt-BR')}
            </h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
              teamCapacitySummary.capacityGap >= 0
                ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                : 'text-red-400 bg-red-950/60 border-red-800'
            }`}>
              {teamCapacitySummary.capacityGap >= 0 ? 'Sobra de Capacidade' : 'Déficit / Sobrecarga'}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Taxa de Ocupação da Equipe: <span className="text-white font-bold">{teamCapacitySummary.teamUtilization}%</span>
          </p>
        </div>
      </div>

      {/* SECTION 1: Comparação Volume Mês a Mês e Provisão */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-400" />
              Comparativo Histórico Mês a Mês & Provisão de Fechamento
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Volume real tratado em meses anteriores versus provisão projetada para o período atual
            </p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={momData} margin={{ top: 20, right: 25, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#fff', paddingTop: '10px' }} />
              <Bar dataKey="volumeRealizado" name="Volume Realizado" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="volumeRealizado" position="top" offset={8} fill="#f59e0b" fontSize={11} fontWeight="bold" />
              </Bar>
              <Line type="monotone" dataKey="provisaoProjetada" name="Provisão (Projeção Mês)" stroke="#10b981" strokeWidth={3} strokeDasharray="4 4" dot={{ fill: '#10b981', r: 5 }}>
                <LabelList dataKey="provisaoProjetada" position="top" offset={10} fill="#10b981" fontSize={11} fontWeight="bold" />
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 2: Capacity, Gap e Sobra por Analista */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Users size={18} className="text-amber-400" />
              Capacity / Gap ou Sobra por Analista
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Capacidade esperada versus produções realizadas com cálculo automático de gap ou sobra individual
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/30 border border-blue-500"></span> Sobra (&lt;80%)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400/30 border border-amber-400"></span> Equilibrado (80-110%)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500"></span> Alta Carga (&gt;110%)</span>
          </div>
        </div>

        {/* Capacity Analyst Table */}
        <div className="overflow-x-auto border border-zinc-800 rounded-md">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-black text-zinc-400 font-bold uppercase border-b border-zinc-800">
                <th className="p-3">Analista Operacional</th>
                <th className="p-3 text-center">Dias Ativos</th>
                <th className="p-3 text-center">Produção Realizada</th>
                <th className="p-3 text-center">Capacidade Esperada</th>
                <th className="p-3 text-center">Balanço (Gap / Sobra)</th>
                <th className="p-3 text-center">Utilização (%)</th>
                <th className="p-3 text-center">Status Operacional</th>
              </tr>
            </thead>
            <tbody>
              {analystCapacityList.map((analyst, index) => (
                <tr key={index} className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-amber-400 flex items-center justify-center text-[10px] font-mono">
                      {index + 1}
                    </span>
                    {analyst.name}
                  </td>
                  <td className="p-3 text-center text-zinc-300 font-semibold">{analyst.activeDays} dia(s)</td>
                  <td className="p-3 text-center font-bold text-amber-400">{analyst.totalVolume} itens</td>
                  <td className="p-3 text-center text-zinc-400 font-medium">{analyst.expectedTarget} itens</td>
                  <td className={`p-3 text-center font-bold ${analyst.gapSobra >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {analyst.gapSobra >= 0 ? `+${analyst.gapSobra}` : analyst.gapSobra} itens
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700">
                        <div 
                          className={`h-full rounded-full ${
                            analyst.utilizationPercent > 110 ? 'bg-emerald-400' :
                            analyst.utilizationPercent < 80 ? 'bg-blue-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${Math.min(100, analyst.utilizationPercent)}%` }}
                        />
                      </div>
                      <span className="font-bold text-white text-[11px]">{analyst.utilizationPercent}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold ${analyst.statusColor}`}>
                      {analyst.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
