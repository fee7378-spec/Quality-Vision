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
    <div className="w-full p-4 sm:p-6 md:p-8 bg-gray-50 text-gray-900 space-y-8">
      {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Volume Realizado x MoM */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">VOLUME PRODUZIDO</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <Calendar size={18} className="text-[#001E62]" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{capacityTableData.totals.totalProd.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium text-[11px]">Fila: {capacityTableData.totals.prodFila.toLocaleString('pt-BR')} | Prio: {capacityTableData.totals.prodPrio.toLocaleString('pt-BR')}</span>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                  parseFloat(latestMonth.momGrowth) >= 0 
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-300' 
                    : 'text-red-700 bg-red-50 border-red-300'
                }`}>
                  {parseFloat(latestMonth.momGrowth) >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{latestMonth.momGrowth}% MoM</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Provisão de Fechamento */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">PROVISÃO DE FECHAMENTO</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <Zap size={18} className="text-[#001E62]" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#001E62] tracking-tight">{latestMonth.provisaoProjetada.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium text-[11px]">Projeção ({latestMonth.daysWorked}d trabalhados)</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[#001E62] font-bold text-[11px]">
                  <span>{latestMonth.avgDailyRate} / dia</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Capacidade Dia Nominal */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">CAPACIDADE DIA NOMINAL</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <Target size={18} className="text-[#001E62]" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{capacityTableData.totals.capDia.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium text-[11px]">Capacidade por TMO</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#001E62] font-bold text-[11px]">
                  <span>{capacityTableData.totals.contratados} Contratados</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Balanço de Capacidade */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">BALANÇO DIÁRIO</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <ShieldCheck size={18} className="text-[#001E62]" />
                </div>
              </div>
              {(() => {
                const gap = capacityTableData.totals.totalProd - capacityTableData.totals.capDia;
                const isPositive = gap >= 0;
                return (
                  <>
                    <div>
                      <h3 className={`text-2xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? `+${gap.toLocaleString('pt-BR')}` : gap.toLocaleString('pt-BR')}
                      </h3>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium text-[11px]">Saldo em relação à meta</span>
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                        isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-300' : 'text-red-700 bg-red-50 border-red-300'
                      }`}>
                        <span>{isPositive ? 'Meta Atingida' : 'Abaixo da Capacidade'}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* SECTION 1: Standard Capacity Table (Print exact layout) */}
          <div className="bg-white border border-gray-200 p-6 rounded-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
                  <TrendingUp size={18} className="text-brand-blue" />
                  COMPARATIVO DE PRODUÇÃO MOM
                </h3>
                <p className="text-[11px] text-gray-400/80 mt-0.5">Comparativo de volumetria total por mês, e projeção de fechamento para o mês atual</p>
              </div>

              {/* Fixed Legend opposite Title */}
              <div className="flex items-center gap-4 bg-gray-50/70 border border-gray-200 px-3.5 py-1.5 rounded-md self-start sm:self-auto flex-shrink-0 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-brand-blue">
                  <span className="w-3 h-3 rounded-sm bg-brand-blue-dark inline-block" />
                  <span>Volume Realizado</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span>Provisão Projetada</span>
                </div>
              </div>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={momData} margin={{ top: 25, right: 25, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                    itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                    labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="volumeRealizado" name="Volume Realizado" fill="#001E62" radius={[4, 4, 0, 0]}>
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
