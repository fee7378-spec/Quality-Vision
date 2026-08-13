import React, { useMemo } from 'react';
import { 
  Layers, Clock, AlertTriangle, Calendar, CheckCircle2, 
  BarChart2, PieChart as PieIcon, ArrowUpRight, ShieldAlert, Activity, Filter, Target
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  Legend, LabelList, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { useStore, matchesFilter, getTabuladorName } from '../store/useStore';

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = payload.value || '';

  const words = value.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word: string) => {
    if ((currentLine + ' ' + word).trim().length <= 12) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="middle" fill="#001E62" fontSize={11} fontWeight="600">
        {lines.slice(0, 3).map((line, index) => (
          <tspan x={0} dy={index === 0 ? 10 : 13} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};


const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : undefined;
};
export const OperacaoPage: React.FC = () => {
  const { 
    productivityData, 
    data,
    monitorias,
    startDate, 
    endDate, 
    selectedEsteira,
    esteiraMappings,
    volumetriaTipoDeDemanda, volumetriaPrioridades, volumetriaPendencias, volumetriaReprovas, volumetria, volumetriaMediaTmo, volumetriaStatus,
    capacity
  } = useStore();

  const isSpecialEsteira = (e: string) => {
    const norm = (e || '').toUpperCase();
    return norm.includes('PREMIUM') || norm.includes('VINTAGE PJ') || norm.includes('ABERTURA PJ');
  };

  const filterSupabase = (arr: any[]) => {
    return (arr || []).filter(item => {
      const itemDate = getVal(item, 'data');
      if (itemDate && typeof itemDate === 'string' && itemDate.trim() !== '') {
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }
      
      const itemEsteira = getVal(item, 'esteira');
      
      // Special rule: if filtering by a special esteira, include all special ones
      if (Array.isArray(selectedEsteira)) {
        if (selectedEsteira.includes('TODAS')) return true;
        const hasSpecialInFilter = selectedEsteira.some(f => isSpecialEsteira(f));
        if (hasSpecialInFilter && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira.includes(itemEsteira);
      } else {
        if (selectedEsteira === 'TODAS') return true;
        if (isSpecialEsteira(selectedEsteira as string) && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira === itemEsteira;
      }
    });
  };

  const filteredProd = useMemo(() => {
    return productivityData.filter(item => {
      const itemDate = item.DataProdutividade;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      
      const itemEsteira = item.Esteira;
      if (Array.isArray(selectedEsteira)) {
        if (selectedEsteira.includes('TODAS')) return true;
        const hasSpecialInFilter = selectedEsteira.some(f => isSpecialEsteira(f));
        if (hasSpecialInFilter && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira.includes(itemEsteira);
      } else {
        if (selectedEsteira === 'TODAS') return true;
        if (isSpecialEsteira(selectedEsteira as string) && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira === itemEsteira;
      }
    });
  }, [productivityData, startDate, endDate, selectedEsteira]);

  const filteredMonitoring = useMemo(() => {
    if (monitorias && monitorias.length > 0) {
      return monitorias.filter(item => {
        const itemDate = getVal(item, 'data');
        if (startDate && itemDate && itemDate < startDate) return false;
        if (endDate && itemDate && itemDate > endDate) return false;
        
        const itemEsteira = getVal(item, 'esteira');
        if (Array.isArray(selectedEsteira)) {
          if (selectedEsteira.includes('TODAS')) return true;
          const hasSpecialInFilter = selectedEsteira.some(f => isSpecialEsteira(f));
          if (hasSpecialInFilter && isSpecialEsteira(itemEsteira)) return true;
          return selectedEsteira.includes(itemEsteira);
        } else {
          if (selectedEsteira === 'TODAS') return true;
          if (isSpecialEsteira(selectedEsteira as string) && isSpecialEsteira(itemEsteira)) return true;
          return selectedEsteira === itemEsteira;
        }
      });
    }
    return data.filter(item => {
      const itemDate = item.DataMonitoria;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      
      const itemEsteira = item.Esteira;
      if (Array.isArray(selectedEsteira)) {
        if (selectedEsteira.includes('TODAS')) return true;
        const hasSpecialInFilter = selectedEsteira.some(f => isSpecialEsteira(f));
        if (hasSpecialInFilter && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira.includes(itemEsteira);
      } else {
        if (selectedEsteira === 'TODAS') return true;
        if (isSpecialEsteira(selectedEsteira as string) && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira === itemEsteira;
      }
    });
  }, [monitorias, data, startDate, endDate, selectedEsteira]);

  const filterCapacity = (arr: any[], ignoreDate: boolean = false) => {
    return (arr || []).filter(item => {
      if (!ignoreDate) {
        const itemDate = getVal(item, 'data');
        if (itemDate && typeof itemDate === 'string' && itemDate.trim() !== '') {
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
        }
      }
      
      const itemEsteira = getVal(item, 'esteira');
      
      // Special rule: if filtering by a special esteira, include all special ones
      if (Array.isArray(selectedEsteira)) {
        if (selectedEsteira.includes('TODAS')) return true;
        const hasSpecialInFilter = selectedEsteira.some(f => isSpecialEsteira(f));
        if (hasSpecialInFilter && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira.includes(itemEsteira);
      } else {
        if (selectedEsteira === 'TODAS') return true;
        if (isSpecialEsteira(selectedEsteira as string) && isSpecialEsteira(itemEsteira)) return true;
        return selectedEsteira === itemEsteira;
      }
    });
  };

  const kpis = useMemo(() => {
    const filtVolumetria = filterSupabase(volumetria);
    const totalVolume = filtVolumetria.reduce((acc, curr) => acc + (Number(getVal(curr, 'quantidade')) || 0), 0);
    
    const filtPrio = filterSupabase(volumetriaPrioridades);
    const prioVolume = filtPrio.reduce((acc, curr) => acc + (Number(getVal(curr, 'quantidade')) || 0), 0);
    const prioPercent = totalVolume > 0 ? ((prioVolume / totalVolume) * 100).toFixed(1).replace('.', ',') : '0,0';

    const totalMonitorias = filteredMonitoring.reduce((acc, curr) => acc + (Number(getVal(curr, 'quantidade')) || Number(curr.Quantidade) || 1), 0);
    const prioMonitoriaPercent = prioVolume > 0 
      ? ((totalMonitorias / prioVolume) * 100).toFixed(1).replace('.', ',') 
      : '0,0';

    const filtPend = filterSupabase(volumetriaPendencias);
    const pendentesCount = filtPend.reduce((acc, curr) => acc + (Number(getVal(curr, 'quantidade')) || 0), 0);

    const filtReprova = filterSupabase(volumetriaReprovas);
    const reprovadosCount = filtReprova.reduce((acc, curr) => acc + (Number(getVal(curr, 'quantidade')) || 0), 0);

    const pendReprovTotal = pendentesCount + reprovadosCount;
    const pendReprovPercent = totalVolume > 0 
      ? ((pendReprovTotal / totalVolume) * 100).toFixed(1).replace('.', ',') 
      : '0,0';
    const reprovaPercent = totalVolume > 0 
      ? ((reprovadosCount / totalVolume) * 100).toFixed(1).replace('.', ',') 
      : '0,0';

    // Respect date filters for card as requested
    const filtCapacity = filterCapacity(capacity, false);
    const tmoTotalSum = filtCapacity.reduce((acc, curr) => acc + (Number(getVal(curr, 'tmoMinuto')) || 0), 0);
    const tmoCount = filtCapacity.length;
    const tmoAvg = tmoCount > 0 ? (tmoTotalSum / tmoCount).toFixed(1).replace('.', ',') : '0,0';

    const dayMap: Record<string, number> = {};
    filtVolumetria.forEach(p => {
      const d = getVal(p, 'data');
      if (d) {
        dayMap[d] = (dayMap[d] || 0) + (Number(getVal(p, 'quantidade')) || 0);
      }
    });

    let peakDay = 'N/D';
    let peakVol = 0;
    Object.entries(dayMap).forEach(([dateStr, vol]) => {
      if (vol > peakVol) {
        peakVol = vol;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const [y, m, day] = dateStr.split('-');
          peakDay = `${day}/${m}/${y}`;
        } else {
          peakDay = dateStr;
        }
      }
    });

    return { totalVolume, prioVolume, prioPercent, totalMonitorias, prioMonitoriaPercent, pendReprovTotal, pendReprovPercent, reprovaPercent, pendentesCount, reprovadosCount, tmoAvg, peakDay, peakVol };
  }, [volumetria, volumetriaPrioridades, volumetriaPendencias, volumetriaReprovas, capacity, filteredMonitoring, startDate, endDate, selectedEsteira]);

const esteiraPrioData = useMemo(() => {
    const map: Record<string, { esteira: string; sim: number; nao: number; total: number }> = {};
    const filtPrio = filterSupabase(volumetriaPrioridades);
    const filtVol = filterSupabase(volumetria);

    // Primeiro preenche com o total de volumetria
    filtVol.forEach(p => {
      const e = getVal(p, 'esteira') || 'Geral';
      if (!map[e]) map[e] = { esteira: e, sim: 0, nao: 0, total: 0 };
      const qty = Number(getVal(p, 'quantidade')) || 0;
      map[e].total += qty;
    });

    // Depois adiciona o que é prioridade (Sim)
    filtPrio.forEach(p => {
      const e = getVal(p, 'esteira') || 'Geral';
      if (!map[e]) map[e] = { esteira: e, sim: 0, nao: 0, total: 0 };
      const qty = Number(getVal(p, 'quantidade')) || 0;
      map[e].sim += qty;
    });

    // Calcula o que é Normal (Nao = Total - Sim) e previne números negativos se a base estiver inconsistente
    Object.values(map).forEach(v => {
      v.nao = Math.max(0, v.total - v.sim);
      // Ajusta o total real apenas para ordenação, garantindo que seja pelo menos a soma (caso sim > total base)
      v.total = v.sim + v.nao; 
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [volumetria, volumetriaPrioridades, startDate, endDate, selectedEsteira]);

  const statusDist = useMemo(() => {
    const concluidos = Math.max(0, kpis.totalVolume - (kpis.pendentesCount + kpis.reprovadosCount));
    return [
      { name: 'Concluídos', value: concluidos, color: '#14B8A6' },
      { name: 'Pendências', value: kpis.pendentesCount, color: '#F59E0B' },
      { name: 'Reprovas', value: kpis.reprovadosCount, color: '#EF4444' }
    ];
  }, [kpis.totalVolume, kpis.pendentesCount, kpis.reprovadosCount]);

  const topMotivos = useMemo(() => {
    const map: Record<string, number> = {};
    const filtStatus = filterSupabase(volumetriaStatus);

    filtStatus.forEach(p => {
      const mot = String(getVal(p, 'pendencia') || '').trim();
      if (mot && mot.toLowerCase() !== 'null' && mot.toLowerCase() !== 'nenhum') {
        map[mot] = (map[mot] || 0) + (Number(getVal(p, 'quantidade')) || 0);
      }
    });

    return Object.entries(map)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [volumetriaStatus, startDate, endDate, selectedEsteira]);

  const atividadeVolume = useMemo(() => {
    const map: Record<string, number> = {};
    const filteredVolumetria = filterSupabase(volumetriaTipoDeDemanda);
    filteredVolumetria.forEach(p => {
      const rawDemanda = String(getVal(p, 'tipoDeDemanda') || '').trim();
      const esteira = getVal(p, 'esteira') || 'Geral';
      const demanda = rawDemanda || esteira || 'Geral';
      const key = `${demanda} (${esteira})`;
      const qty = Number(getVal(p, 'quantidade')) || 0;
      map[key] = (map[key] || 0) + qty;
    });

    return Object.entries(map)
      .map(([atividade, volume]) => ({ atividade, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [volumetriaTipoDeDemanda, startDate, endDate, selectedEsteira]);

  const formatMinutesToTime = (min: number) => {
    if (min < 60) return `${Math.round(min)}m`;
    const h = Math.floor(min / 60);
    const m = Math.floor(min % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const tmoPorEsteira = useMemo(() => {
    // Ignore date filters, respect esteira filter
    const filtCapacity = filterCapacity(capacity, true);
    
    // Get all unique esteiras from capacity to ensure bars appear
    const allEsteiras = Array.from(new Set(capacity.map(p => getVal(p, 'esteira')))).filter(Boolean);
    
    const map: Record<string, { totalTmo: number; count: number }> = {};
    
    // Initialize map with all esteiras
    allEsteiras.forEach(e => {
        map[e] = { totalTmo: 0, count: 0 };
    });

    filtCapacity.forEach(p => {
      const e = getVal(p, 'esteira') || 'Geral';
      const tmoStr = getVal(p, 'tmoMinuto') || '00:00:00';
      
      // Parse HH:mm:ss
      let tmoMin = 0;
      if (typeof tmoStr === 'string' && tmoStr.includes(':')) {
        const parts = tmoStr.split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        const s = parseInt(parts[2], 10) || 0;
        tmoMin = h * 60 + m + s / 60;
      } else {
        tmoMin = Number(tmoStr) || 0;
      }
      
      if (!map[e]) map[e] = { totalTmo: 0, count: 0 };
      map[e].totalTmo += tmoMin;
      map[e].count += 1;
    });

    return Object.entries(map).map(([esteira, val]) => ({
      esteira,
      tmoMedio: val.count > 0 ? parseFloat((val.totalTmo / val.count).toFixed(1)) : 0
    })).sort((a, b) => b.tmoMedio - a.tmoMedio);
  }, [capacity, selectedEsteira]);

  const tmoMedioGeral = useMemo(() => {
    const filtCapacity = filterCapacity(capacity, true);
    if (filtCapacity.length === 0) return 0;
    
    const totalTmo = filtCapacity.reduce((acc, curr) => {
        const tmoStr = getVal(curr, 'tmoMinuto') || '00:00:00';
        let tmoMin = 0;
        if (typeof tmoStr === 'string' && tmoStr.includes(':')) {
            const parts = tmoStr.split(':');
            const h = parseInt(parts[0], 10) || 0;
            const m = parseInt(parts[1], 10) || 0;
            const s = parseInt(parts[2], 10) || 0;
            tmoMin = h * 60 + m + s / 60;
        } else {
            tmoMin = Number(tmoStr) || 0;
        }
        return acc + tmoMin;
    }, 0);
    
    return totalTmo / filtCapacity.length;
  }, [capacity, selectedEsteira]);

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 bg-gray-50 text-gray-900 space-y-8">


      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">PRIORIDADES</span>
            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100">
              <Target size={18} className="text-[#001E62]" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{kpis.prioVolume.toLocaleString('pt-BR')}</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Demanda prioritária ({kpis.prioPercent}% do volume total)</p>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">REPROVAS</span>
            <div className="p-1.5 rounded-lg bg-red-50 border border-red-100">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-[#001E62] tracking-tight">{kpis.reprovaPercent}%</h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">
              Quantidade de reprovas: <strong className="text-red-600 font-bold">{kpis.reprovadosCount.toLocaleString('pt-BR')}</strong>
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">PICO DE PRODUÇÃO</span>
            <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <Calendar size={18} className="text-[#001E62]" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">{kpis.peakDay}</h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">Volume no dia de pico</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
              <span>{kpis.peakVol.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-xl hover:border-[#001E62]/40 transition-all shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">TMO MÉDIO OPERACIONAL</span>
            <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <Clock size={18} className="text-[#001E62]" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{tmoMedioGeral.toFixed(1).replace('.', ',')} <span className="text-sm font-bold text-gray-500">min</span></h3>
          </div>
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium text-[11px]">Média por item tratado</span>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[#001E62] font-bold text-[11px]">
              <span>Média Operacional</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-gray-200 p-6 rounded-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
                <BarChart2 size={18} className="text-brand-blue" />
                VOLUMETRIA DE PRIORIDADES
              </h3>
            </div>
            <div className="flex items-center gap-4 bg-gray-50/70 border border-gray-200 px-3.5 py-1.5 rounded-md self-start sm:self-auto flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#001E62] inline-block" />
                <span className="text-xs font-bold text-gray-900">Prioridade (SIM)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#EEF2FF] border border-[#001E62] inline-block" />
                <span className="text-xs font-bold text-gray-900">Normal (NÃO)</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(800, esteiraPrioData.length * 160), height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={esteiraPrioData} margin={{ top: 25, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="esteira" 
                    stroke="#6b7280" 
                    interval={0}
                    tick={<CustomXAxisTick />}
                    height={55}
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                    itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                    labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="sim" name="Prioridade (SIM)" fill="#001E62" radius={[4, 4, 0, 0]} barSize={34}>
                    <LabelList dataKey="sim" position="top" offset={6} fill="#001E62" fontSize={11} fontWeight="bold" />
                  </Bar>
                  <Bar dataKey="nao" name="Normal (NÃO)" fill="#EEF2FF" stroke="#001E62" strokeWidth={1} radius={[4, 4, 0, 0]} barSize={34}>
                    <LabelList dataKey="nao" position="top" offset={6} fill="#001E62" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-gray-200 p-6 rounded-md space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <ShieldAlert size={18} className="text-brand-blue" />
              PRINCIPAIS MOTIVOS DE REPROVAS
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Top 10 motivos mais frequentes no período selecionado</p>
          </div>

          <div className="space-y-1.5 text-xs flex-1">
            {topMotivos.length > 0 ? (
              topMotivos.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-1.5 rounded text-gray-700 hover:border-brand-blue/30 transition-colors">
                  <span className="truncate pr-2 font-medium">{idx + 1}. {m.motivo}</span>
                  <span className="font-bold text-brand-blue bg-brand-blue-dark/10 px-2 py-0.5 rounded text-[11px] border border-brand-blue-dark/20 flex-shrink-0">
                    {m.count.toLocaleString('pt-BR')} ocorrência(s)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic py-4">Nenhum motivo de reprova registrado.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-gray-200 p-6 rounded-md space-y-4">
          <div>
            <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
              <Activity size={18} className="text-brand-blue" />
              VOLUMETRIA DE TIPOS DE DEMANDA
            </h3>
          </div>
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1.5">
            {atividadeVolume.length > 0 ? (
              atividadeVolume.map((item, index) => {
                const maxVol = atividadeVolume[0]?.volume || 1;
                const percent = Math.round((item.volume / maxVol) * 100);
                return (
                  <div key={index} className="bg-gray-50 border border-gray-200 p-3 rounded-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-gray-900 truncate max-w-[78%] flex items-center gap-1.5">
                        <span className="font-bold text-brand-blue bg-brand-blue-dark/10 border border-brand-blue-dark/20 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                          {index + 1}º
                        </span>
                        <span className="truncate">{item.atividade}</span>
                      </span>
                      <span className="font-bold text-brand-blue flex-shrink-0">{item.volume}</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-gray-200">
                      <div 
                        className="bg-brand-blue-dark h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">Nenhuma demanda registrada no filtro atual.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-gray-200 p-6 rounded-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-brand-blue font-bold text-base flex items-center gap-2 uppercase">
                <Clock size={18} className="text-brand-blue" />
                TEMPO MÉDIO DE OPERAÇÃO POR ESTEIRAS
              </h3>
            </div>
          </div>
          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(1000, tmoPorEsteira.length * 300), height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tmoPorEsteira} margin={{ top: 25, right: 20, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="esteira" 
                    stroke="#6b7280" 
                    interval={0}
                    tick={<CustomXAxisTick />}
                    height={55}
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} unit=" min" />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#001E62', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', color: '#001E62', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }} 
                    itemStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }} 
                    labelStyle={{ color: '#001E62', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(val: any) => [formatMinutesToTime(Number(val)), 'TMO Médio']}
                  />
                  <Bar dataKey="tmoMedio" name="TMO Médio (min)" fill="#001E62" radius={[4, 4, 0, 0]} barSize={40}>
                    <LabelList dataKey="tmoMedio" position="top" offset={6} fill="#001E62" fontSize={11} fontWeight="bold" formatter={(v: any) => formatMinutesToTime(Number(v))} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
