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
  parseHHMMSSToSeconds,
  matchesFilter
} from '../store/useStore';

const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : undefined;
};

export const CapacidadePage: React.FC = () => {
  const { 
    productivityData, 
    esteiraParams, 
    selectedEsteira,
    startDate,
    endDate,
    volumetria,
    volumetriaPrioridades
  } = useStore();

  const [activeTab, setActiveTab] = useState<'projecao' | 'parametros'>('projecao');
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState<number>(22);

  const filteredVolumetria = useMemo(() => {
    return (volumetria || []).filter(item => {
      const itemDate = getVal(item, 'data');
      if (itemDate && typeof itemDate === 'string' && itemDate.trim() !== '') {
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }
      if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
      return true;
    });
  }, [volumetria, startDate, endDate, selectedEsteira]);

  const totalProdutividade = useMemo(() => {
    return filteredVolumetria.reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || 0), 0);
  }, [filteredVolumetria]);

  const prioVolume = useMemo(() => {
    return (volumetriaPrioridades || [])
      .filter(item => {
        const itemDate = getVal(item, 'data');
        if (itemDate && typeof itemDate === 'string' && itemDate.trim() !== '') {
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
        }
        if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
        return true;
      })
      .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || 0), 0);
  }, [volumetriaPrioridades, startDate, endDate, selectedEsteira]);

  const filaVolume = Math.max(0, totalProdutividade - prioVolume);

  const diasUteisPassados = useMemo(() => {
    const uniqueDates = Array.from(new Set(
      filteredVolumetria
        .map(item => getVal(item, 'data'))
        .filter(d => d && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
    ));
    const weekdays = uniqueDates.filter(dStr => {
      const dt = new Date(dStr + 'T12:00:00');
      const day = dt.getDay();
      return day >= 1 && day <= 5;
    });
    return weekdays.length || 1;
  }, [filteredVolumetria]);

  const diasUteisCompleto = useMemo(() => {
    const selectedKey = Array.isArray(selectedEsteira) 
      ? (selectedEsteira.length === 1 ? selectedEsteira[0] : 'TODAS') 
      : selectedEsteira;
    const esteiraParam = selectedKey !== 'TODAS' ? esteiraParams[selectedKey] : null;
    return esteiraParam?.diasUteisMes || workingDaysInMonth || 22;
  }, [selectedEsteira, esteiraParams, workingDaysInMonth]);

  const mediaDiariaUtil = totalProdutividade / (diasUteisPassados || 1);
  const provisaoFechamento = Math.round(mediaDiariaUtil * diasUteisCompleto);

  // 1. Capacity Table matching user print
  const capacityTableData = useMemo(() => {
    const setE = new Set<string>();
    productivityData.forEach(p => { if (p.Esteira) setE.add(p.Esteira); });
    Object.keys(esteiraParams).forEach(e => { if (e !== 'Geral') setE.add(e); });
    
    let esteiraList = Array.from(setE).sort();
    esteiraList = esteiraList.filter(e => matchesFilter(selectedEsteira, e, 'TODAS'));

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
  // Gráfico COMPARATIVO DE PRODUÇÃO MoM: Eixo X em Mês/Semana/Dia dependendo do período
  const momData = useMemo(() => {
    const rawProd = (volumetria && volumetria.length > 0)
      ? volumetria.map(i => ({
          DataProdutividade: getVal(i, 'data'),
          Esteira: getVal(i, 'esteira'),
          Quantidade: Number(getVal(i, 'quantidade')) || 0
        }))
      : productivityData;

    const filteredProd = rawProd.filter(item => {
      const d = item.DataProdutividade;
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      return true;
    });

    const uniqueDates = Array.from(new Set(filteredProd.map(i => i.DataProdutividade))).sort();
    
    let spanDays = 0;
    if (uniqueDates.length > 0) {
      const minD = new Date(uniqueDates[0]);
      const maxD = new Date(uniqueDates[uniqueDates.length - 1]);
      spanDays = Math.ceil((maxD.getTime() - minD.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    const map: Record<string, { label: string; volume: number; daysCount: Set<string> }> = {};

    if (spanDays > 0 && spanDays <= 7) {
      // Group by Day
      filteredProd.forEach(item => {
        const dateStr = item.DataProdutividade;
        const [y, m, day] = dateStr.split('-');
        const label = `${day}/${m}`;
        if (!map[dateStr]) map[dateStr] = { label, volume: 0, daysCount: new Set() };
        map[dateStr].volume += (Number(item.Quantidade) || 1);
        map[dateStr].daysCount.add(dateStr);
      });
    } else if (spanDays > 7 && spanDays <= 30) {
      // Group by Week
      filteredProd.forEach(item => {
        const dateStr = item.DataProdutividade;
        const [y, m, dayStr] = dateStr.split('-');
        const dayNum = parseInt(dayStr, 10);
        let weekKey = 'Semana 1';
        if (dayNum >= 1 && dayNum <= 7) weekKey = 'Semana 1';
        else if (dayNum >= 8 && dayNum <= 14) weekKey = 'Semana 2';
        else if (dayNum >= 15 && dayNum <= 21) weekKey = 'Semana 3';
        else if (dayNum >= 22) weekKey = 'Semana 4';

        const label = `${weekKey} (${m}/${y.slice(2)})`;
        const key = `${y}-${m}-${weekKey}`;
        if (!map[key]) map[key] = { label, volume: 0, daysCount: new Set() };
        map[key].volume += (Number(item.Quantidade) || 1);
        map[key].daysCount.add(dateStr);
      });
    } else {
      // Group by Month
      filteredProd.forEach(item => {
        const dateStr = item.DataProdutividade;
        const [y, m] = dateStr.split('-');
        const key = `${y}-${m}`;
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mIdx = parseInt(m, 10) - 1;
        const label = `${monthNames[mIdx] || m}/${y.slice(2)}`;
        if (!map[key]) map[key] = { label, volume: 0, daysCount: new Set() };
        map[key].volume += (Number(item.Quantidade) || 1);
        map[key].daysCount.add(dateStr);
      });
    }

    const sortedKeys = Object.keys(map).sort();
    
    return sortedKeys.map((key, idx) => {
      const entry = map[key];
      const prevEntry = sortedKeys[idx - 1] ? map[sortedKeys[idx - 1]] : null;
      const momGrowth = prevEntry && prevEntry.volume > 0 
        ? (((entry.volume - prevEntry.volume) / prevEntry.volume) * 100).toFixed(1) 
        : '0';

      const daysWorked = entry.daysCount.size || 1;
      const avgDailyRate = entry.volume / daysWorked;
      
      const selectedKey = Array.isArray(selectedEsteira) 
        ? (selectedEsteira.length === 1 ? selectedEsteira[0] : 'TODAS') 
        : selectedEsteira;
      const esteiraParam = selectedKey !== 'TODAS' ? esteiraParams[selectedKey] : null;
      const daysInMonth = esteiraParam?.diasUteisMes || workingDaysInMonth;
      const projectedVolume = Math.round(avgDailyRate * daysInMonth);

      return {
        key,
        label: entry.label,
        volumeRealizado: entry.volume,
        provisaoProjetada: Math.max(entry.volume, projectedVolume),
        daysWorked,
        avgDailyRate: Math.round(avgDailyRate),
        momGrowth
      };
    });
  }, [volumetria, productivityData, startDate, endDate, workingDaysInMonth, selectedEsteira, esteiraParams]);

  const latestMonth = momData[momData.length - 1] || { volumeRealizado: 0, provisaoProjetada: 0, momGrowth: '0', daysWorked: 1, avgDailyRate: 0 };
  const prevMonth = momData[momData.length - 2] || { volumeRealizado: 0 };

  const capacidadeNominal = Math.round(capacityTableData.totals.capDia * diasUteisPassados);

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
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{totalProdutividade.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium text-[11px]">Fila: {filaVolume.toLocaleString('pt-BR')} | Prio: {prioVolume.toLocaleString('pt-BR')}</span>
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

            {/* KPI 2: Previsão de Fechamento */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">PREVISÃO DE FECHAMENTO</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <Zap size={18} className="text-[#001E62]" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-[#001E62] tracking-tight">{provisaoFechamento.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium text-[11px]">Projeção ({diasUteisPassados}d úteis passados / {diasUteisCompleto}d úteis)</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[#001E62] font-bold text-[11px]">
                  <span>{Math.round(mediaDiariaUtil).toLocaleString('pt-BR')} / dia útil</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Capacidade Nominal */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">CAPACIDADE NOMINAL</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <Target size={18} className="text-[#001E62]" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{capacidadeNominal.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium text-[11px]">Capacidade no período ({capacityTableData.totals.capDia.toLocaleString('pt-BR')}/dia)</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#001E62] font-bold text-[11px]">
                  <span>{capacityTableData.totals.contratados} Contratados</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Balanço Diário */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">BALANÇO DIÁRIO</span>
                <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <ShieldCheck size={18} className="text-[#001E62]" />
                </div>
              </div>
              {(() => {
                const gap = totalProdutividade - capacidadeNominal;
                const isPositive = gap >= 0;
                return (
                  <>
                    <div>
                      <h3 className={`text-2xl font-black tracking-tight ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isPositive ? `+${gap.toLocaleString('pt-BR')}` : gap.toLocaleString('pt-BR')}
                      </h3>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium text-[11px]">Volume produzido - Cap. nominal</span>
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
                <h3 className="text-brand-blue font-bold text-base flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand-blue" />
                  COMPARATIVO DE PRODUÇÃO MoM
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
                  <span>Previsão Projetada</span>
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
                  <Line type="monotone" dataKey="provisaoProjetada" name="Previsão (Projeção Fechamento)" stroke="#10b981" strokeWidth={3} strokeDasharray="4 4" dot={{ fill: '#10b981', r: 5 }}>
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
