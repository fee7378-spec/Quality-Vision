import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Users, Target, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, Calendar, Zap, Clock, Settings, AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  Legend, LabelList, Line, ComposedChart 
} from 'recharts';
import { 
  useStore, 
  isValidAnalystName, 
  formatSecondsToHHMMSS, 
  parseHHMMSSToSeconds 
} from '../store/useStore';

export const CapacidadePage: React.FC = () => {
  const { 
    productivityData, 
    esteiraParams, 
    selectedEsteira,
    startDate,
    endDate
  } = useStore();

  const [activeTab, setActiveTab] = useState<'projecao' | 'parametros'>('projecao');
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState<number>(22);

  // 1. Capacity Table matching user print
  const capacityTableData = useMemo(() => {
    const setE = new Set<string>();
    productivityData.forEach(p => { if (p.Esteira) setE.add(p.Esteira); });
    Object.keys(esteiraParams).forEach(e => { if (e !== 'Geral') setE.add(e); });
    
    let esteiraList = Array.from(setE).sort();
    if (selectedEsteira !== 'TODAS') {
      esteiraList = esteiraList.filter(e => e === selectedEsteira);
    }

    let totalCapDia = 0;
    let totalProdFila = 0;
    let totalProdPrio = 0;
    let totalContratados = 0;

    const rows = esteiraList.map(esteira => {
      const param = esteiraParams[esteira] || {
        esteira,
        contratados: 10,
        tmoAlvoSegundos: 1800,
        horasTrabalhoDia: 8,
        metaDiaria: 40,
        diasUteisMes: 22
      };

      const contratados = param.contratados ?? 10;
      const tmoSegs = param.tmoAlvoSegundos ?? 1800;
      const horasDia = param.horasTrabalhoDia ?? 8;
      const metaDiaria = param.metaDiaria ?? 40;

      const capDia = tmoSegs > 0 
        ? Math.round((contratados * horasDia * 3600) / tmoSegs)
        : contratados * metaDiaria;

      // Filter productivity data for this esteira
      const esteiraProds = productivityData.filter(p => {
        if (p.Esteira !== esteira) return false;
        if (startDate && p.DataProdutividade && p.DataProdutividade < startDate) return false;
        if (endDate && p.DataProdutividade && p.DataProdutividade > endDate) return false;
        return true;
      });

      let prodFila = 0;
      let prodPrio = 0;

      esteiraProds.forEach(p => {
        const isPrio = String(p.Prioridade || '').trim().toLowerCase() === 'sim';
        const qty = p.Quantidade || 1;
        if (isPrio) {
          prodPrio += qty;
        } else {
          prodFila += qty;
        }
      });

      const totalProd = prodFila + prodPrio;

      totalContratados += contratados;
      totalCapDia += capDia;
      totalProdFila += prodFila;
      totalProdPrio += prodPrio;

      return {
        esteira,
        contratados,
        tmoFormatted: formatSecondsToHHMMSS(tmoSegs),
        capDia,
        prodFila,
        prodPrio,
        totalProd,
        isAlert: totalProd < capDia
      };
    });

    return {
      rows,
      totals: {
        contratados: totalContratados,
        capDia: totalCapDia,
        prodFila: totalProdFila,
        prodPrio: totalProdPrio,
        totalProd: totalProdFila + totalProdPrio
      }
    };
  }, [productivityData, esteiraParams, selectedEsteira, startDate, endDate]);

  // 2. Month-over-Month Volume Comparison & Provisão calculation
  // Provisão formula: (Volume acumulado dos dias decorridos / Dias decorridos) * Dias úteis do mês
  const momData = useMemo(() => {
    const monthVolumeMap: Record<string, { monthKey: string; monthLabel: string; volume: number; daysCount: Set<string> }> = {};

    productivityData.forEach(item => {
      const dateStr = item.DataProdutividade;
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return;

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
    
    const list = sortedKeys.map((key, idx) => {
      const entry = monthVolumeMap[key];
      const prevEntry = sortedKeys[idx - 1] ? monthVolumeMap[sortedKeys[idx - 1]] : null;
      const momGrowth = prevEntry && prevEntry.volume > 0 
        ? (((entry.volume - prevEntry.volume) / prevEntry.volume) * 100).toFixed(1) 
        : '0';

      const daysWorked = entry.daysCount.size || 1;
      const avgDailyRate = entry.volume / daysWorked;
      
      const esteiraParam = selectedEsteira !== 'TODAS' ? esteiraParams[selectedEsteira] : null;
      const daysInMonth = esteiraParam?.diasUteisMes || workingDaysInMonth;
      const projectedVolume = Math.round(avgDailyRate * daysInMonth);

      return {
        key: entry.monthKey,
        label: entry.monthLabel,
        volumeRealizado: entry.volume,
        provisaoProjetada: Math.max(entry.volume, projectedVolume),
        daysWorked,
        avgDailyRate: Math.round(avgDailyRate),
        momGrowth
      };
    });

    return list;
  }, [productivityData, workingDaysInMonth, selectedEsteira, esteiraParams]);

  const latestMonth = momData[momData.length - 1] || { volumeRealizado: 0, provisaoProjetada: 0, momGrowth: '0', daysWorked: 1, avgDailyRate: 0 };
  const prevMonth = momData[momData.length - 2] || { volumeRealizado: 0 };

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 bg-black text-zinc-100 space-y-8">
      {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Volume Realizado x MoM */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span>VOLUME PRODUZIDO</span>
                <Calendar size={18} className="text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-extrabold text-white">{capacityTableData.totals.totalProd.toLocaleString('pt-BR')}</h3>
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
                {capacityTableData.totals.prodFila.toLocaleString('pt-BR')} Fila + {capacityTableData.totals.prodPrio.toLocaleString('pt-BR')} Prioritários
              </p>
            </div>

            {/* KPI 2: Provisão de Fechamento */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span>PROVISÃO DE FECHAMENTO</span>
                <Zap size={18} className="text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-extrabold text-amber-500">{latestMonth.provisaoProjetada.toLocaleString('pt-BR')}</h3>
                <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  {latestMonth.avgDailyRate} / dia
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                (Volume acumulado ÷ {latestMonth.daysWorked} dias) × 22 dias úteis
              </p>
            </div>

            {/* KPI 3: Capacidade Dia Nominal */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span>CAPACIDADE DIA NOMINAL</span>
                <Target size={18} className="text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-extrabold text-white">{capacityTableData.totals.capDia.toLocaleString('pt-BR')}</h3>
                <span className="text-xs font-bold text-amber-500 bg-amber-600/10 px-2 py-0.5 rounded border border-amber-600/30">
                  {capacityTableData.totals.contratados} Contratados
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Soma da capacidade diária calculada por TMO
              </p>
            </div>

            {/* KPI 4: Balanço de Capacidade */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
                <span>BALANÇO DIÁRIO</span>
                <ShieldCheck size={18} className="text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between">
                {(() => {
                  const gap = capacityTableData.totals.totalProd - capacityTableData.totals.capDia;
                  const isPositive = gap >= 0;
                  return (
                    <>
                      <h3 className={`text-2xl font-extrabold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isPositive ? `+${gap.toLocaleString('pt-BR')}` : gap.toLocaleString('pt-BR')}
                      </h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        isPositive ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' : 'text-red-400 bg-red-950/60 border-red-800'
                      }`}>
                        {isPositive ? 'Meta Atingida' : 'Abaixo da Capacidade'}
                      </span>
                    </>
                  );
                })()}
              </div>
              <p className="text-xs text-zinc-500">
                Diferença entre Total Produzido e Capacidade Dia
              </p>
            </div>
          </div>

          {/* SECTION 1: Standard Capacity Table (Print exact layout) */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
                  <TrendingUp size={18} className="text-amber-500" />
                  COMPARATIVO DE PRODUÇÃO MOM
                </h3>
                <p className="text-[11px] text-zinc-500/80 mt-0.5">Comparativo de volumetria total por mês, e projeção de fechamento para o mês atual</p>
              </div>

              {/* Fixed Legend opposite Title */}
              <div className="flex items-center gap-4 bg-black/70 border border-zinc-800 px-3.5 py-1.5 rounded-md self-start sm:self-auto flex-shrink-0 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <span className="w-3 h-3 rounded-sm bg-amber-600 inline-block" />
                  <span>Volume Realizado</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Provisão Projetada</span>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={momData} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="volumeRealizado" name="Volume Realizado" fill="#FFFF00" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="volumeRealizado" position="insideTop" offset={6} fill="#ffffff" fontSize={10} fontWeight="bold" />
                  </Bar>
                  <Line type="monotone" dataKey="provisaoProjetada" name="Provisão (Projeção Fechamento)" stroke="#10b981" strokeWidth={3} strokeDasharray="4 4" dot={{ fill: '#10b981', r: 5 }}>
                    <LabelList dataKey="provisaoProjetada" position="top" offset={14} fill="#10b981" fontSize={11} fontWeight="bold" />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* SECTION 2: Comparação Volume Mês a Mês e Provisão */}
    </div>
  );
};
