import React, { useMemo } from 'react';
import { 
  Layers, Clock, AlertTriangle, Calendar, CheckCircle2, 
  BarChart2, PieChart as PieIcon, ArrowUpRight, ShieldAlert, Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  Legend, LabelList, LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { useStore } from '../store/useStore';

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
      <text x={0} y={0} dy={4} textAnchor="middle" fill="#e4e4e7" fontSize={11} fontWeight="600">
        {lines.slice(0, 3).map((line, index) => (
          <tspan x={0} dy={index === 0 ? 10 : 13} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

export const OperacaoPage: React.FC = () => {
  const { 
    productivityData, 
    startDate, 
    endDate, 
    selectedEsteira 
  } = useStore();

  // Filter productivity items
  const filteredProd = useMemo(() => {
    return productivityData.filter(item => {
      const itemDate = item.DataProdutividade;
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      if (selectedEsteira !== 'TODAS' && item.Esteira !== selectedEsteira) return false;
      return true;
    });
  }, [productivityData, startDate, endDate, selectedEsteira]);

  // 1. KPI Totals
  const kpis = useMemo(() => {
    const totalVolume = filteredProd.reduce((acc, curr) => acc + (curr.Quantidade || 1), 0);
    const prioVolume = filteredProd.filter(p => p.Prioridade === 'Sim').reduce((acc, curr) => acc + (curr.Quantidade || 1), 0);
    const prioPercent = totalVolume > 0 ? ((prioVolume / totalVolume) * 100).toFixed(1) : '0';

    const pendentesCount = filteredProd.filter(p => p.PendenciaReprova === 'Pendência').length;
    const reprovadosCount = filteredProd.filter(p => p.PendenciaReprova === 'Reprovado').length;
    const pendReprovTotal = pendentesCount + reprovadosCount;
    const pendReprovPercent = totalVolume > 0 ? ((pendReprovTotal / totalVolume) * 100).toFixed(1) : '0';

    // Average TMO per analyst / item
    const tmoSum = filteredProd.reduce((acc, curr) => acc + (curr.TmoMinutos || 15), 0);
    const tmoAvg = filteredProd.length > 0 ? (tmoSum / filteredProd.length).toFixed(1) : '0.0';

    // Peak day calculated strictly by the day with highest tabulated demands
    const dayMap: Record<string, number> = {};
    filteredProd.forEach(p => {
      const d = p.DataProdutividade;
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        dayMap[d] = (dayMap[d] || 0) + (p.Quantidade || 1);
      }
    });

    let peakDay = 'N/D';
    let peakVol = 0;
    Object.entries(dayMap).forEach(([dateStr, vol]) => {
      if (vol > peakVol) {
        peakVol = vol;
        const [y, m, day] = dateStr.split('-');
        peakDay = `${day}/${m}/${y}`;
      }
    });

    return {
      totalVolume,
      prioVolume,
      prioPercent,
      pendReprovTotal,
      pendReprovPercent,
      pendentesCount,
      reprovadosCount,
      tmoAvg,
      peakDay,
      peakVol
    };
  }, [filteredProd]);

  // 2. Volumetria por Esteira e Prioridade (Sim vs Não) - Descending Order
  const esteiraPrioData = useMemo(() => {
    const map: Record<string, { esteira: string; sim: number; nao: number; total: number }> = {};
    filteredProd.forEach(p => {
      const e = p.Esteira || 'Geral';
      if (!map[e]) {
        map[e] = { esteira: e, sim: 0, nao: 0, total: 0 };
      }
      const qty = p.Quantidade || 1;
      if (p.Prioridade === 'Sim') {
        map[e].sim += qty;
      } else {
        map[e].nao += qty;
      }
      map[e].total += qty;
    });

    // Sort descending by total volume
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredProd]);

  // 3. Status Distribution & Top Motivos de Pendência / Reprova
  const statusDist = useMemo(() => {
    let aprovados = 0;
    let pendentes = 0;
    let reprovados = 0;

    filteredProd.forEach(p => {
      const st = p.PendenciaReprova || 'Aprovado';
      if (st === 'Pendência') pendentes++;
      else if (st === 'Reprovado') reprovados++;
      else aprovados++;
    });

    return [
      { name: 'Aprovados', value: aprovados, color: '#10b981' },
      { name: 'Pendências', value: pendentes, color: '#FFFF00' },
      { name: 'Reprovados', value: reprovados, color: '#ef4444' }
    ];
  }, [filteredProd]);

  const topMotivos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProd.forEach(p => {
      if (p.PendenciaReprova === 'Pendência' || p.PendenciaReprova === 'Reprovado') {
        const mot = p.MotivoPendencia && p.MotivoPendencia !== 'Nenhum' ? p.MotivoPendencia : 'Outros / Não Especificado';
        map[mot] = (map[mot] || 0) + 1;
      }
    });

    return Object.entries(map)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredProd]);

  // 4. Atividades com maior volume por Esteira (Tipo de Demanda - Todas as demandas)
  const atividadeVolume = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProd.forEach(p => {
      const key = `${p.TipoDemanda || 'Geral'} (${p.Esteira || 'Geral'})`;
      map[key] = (map[key] || 0) + (p.Quantidade || 1);
    });

    return Object.entries(map)
      .map(([atividade, volume]) => ({ atividade, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [filteredProd]);

  // 5. TMO por Esteira (Vertical Bars, Descending Order)
  const tmoPorEsteira = useMemo(() => {
    const map: Record<string, { count: number; sum: number }> = {};
    filteredProd.forEach(p => {
      const e = p.Esteira || 'Geral';
      if (!map[e]) map[e] = { count: 0, sum: 0 };
      map[e].count += 1;
      map[e].sum += (p.TmoMinutos || 15);
    });

    // Descending order of TMO with 1 decimal place
    return Object.entries(map).map(([esteira, val]) => ({
      esteira,
      tmoMedio: parseFloat((val.sum / val.count).toFixed(1))
    })).sort((a, b) => b.tmoMedio - a.tmoMedio);
  }, [filteredProd]);

  // 6. Evolução Diária e Destaque do Dia de Maior Volume
  const evolucaoDiaria = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProd.forEach(p => {
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
  }, [filteredProd]);

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 bg-black text-zinc-100 space-y-8">

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Volumetria Tratada */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>VOLUMETRIA TRATADA</span>
            <BarChart2 size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-white">{kpis.totalVolume.toLocaleString('pt-BR')}</h3>
            <span className="text-xs font-bold text-amber-500 bg-amber-600/10 px-2 py-0.5 rounded border border-amber-600/30">
              {kpis.prioPercent}% Prioritário
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {kpis.prioVolume} demandas marcadas como Prioridade SIM
          </p>
        </div>

        {/* KPI 2: Taxa de Pendência / Reprova */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>PENDÊNCIAS & REPROVAS</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-amber-500">{kpis.pendReprovPercent}%</h3>
            <span className="text-xs font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              {kpis.pendReprovTotal} ocorrências
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {kpis.pendentesCount} pendências e {kpis.reprovadosCount} reprovações no período
          </p>
        </div>

        {/* KPI 3: Dia de Maior Volume */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>PICO DO MÊS</span>
            <Calendar size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-white">{kpis.peakDay}</h3>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              {kpis.peakVol} itens
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Data com maior volume de demandas tabuladas
          </p>
        </div>

        {/* KPI 4: TMO Médio Operacional */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-md hover:border-amber-600/40 transition-colors space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
            <span>TMO MÉDIO OPERACIONAL</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-3xl font-extrabold text-white">{kpis.tmoAvg} <span className="text-sm font-normal text-zinc-400">min</span></h3>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              Média Geral
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Tempo Médio de Operação acumulado por demanda tratada
          </p>
        </div>
      </div>

      {/* SECTION 1: Volumetria Tratada x Prioridade & Pendências / Reprovas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Volumetria por Esteira e Prioridade (Vertical bars, Descending order, Scrollable) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
                <BarChart2 size={18} className="text-amber-500" />
                VOLUMETRIA DE PRIORIDADES
              </h3>
            </div>

            {/* Fixed Legend opposite Title */}
            <div className="flex items-center gap-4 bg-black/70 border border-zinc-800 px-3.5 py-1.5 rounded-md self-start sm:self-auto flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-amber-600 inline-block" />
                <span className="text-xs font-bold text-zinc-100">Prioridade (SIM)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                <span className="text-xs font-bold text-zinc-100">Normal (NÃO)</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(800, esteiraPrioData.length * 160), height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={esteiraPrioData} margin={{ top: 25, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis 
                    dataKey="esteira" 
                    stroke="#71717a" 
                    interval={0}
                    tick={<CustomXAxisTick />}
                    height={55}
                  />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="sim" name="Prioridade (SIM)" fill="#FFFF00" radius={[4, 4, 0, 0]} barSize={34}>
                    <LabelList dataKey="sim" position="top" offset={6} fill="#FFFF00" fontSize={11} fontWeight="bold" />
                  </Bar>
                  <Bar dataKey="nao" name="Normal (NÃO)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={34}>
                    <LabelList dataKey="nao" position="top" offset={6} fill="#10b981" fontSize={11} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Pendência & Reprova com Principais Motivos */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <ShieldAlert size={18} className="text-amber-500" />
              STATUS DAS ANÁLISES
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', color: '#fff', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="font-bold text-zinc-300 uppercase text-[10px] tracking-wider mb-2">Resumo de Qualidade:</p>
              {statusDist.map((s) => (
                <div key={s.name} className="flex items-center justify-between bg-black/60 border border-zinc-800 px-3 py-1.5 rounded">
                  <span className="flex items-center gap-2 text-zinc-300">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Motivos Table */}
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={14} /> PRINCIPAIS MOTIVOS DE PENDÊNCIA / REPROVA
            </h4>
            <div className="space-y-1.5 text-xs">
              {topMotivos.length > 0 ? (
                topMotivos.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black border border-zinc-800 px-3 py-1.5 rounded text-zinc-300">
                    <span className="truncate pr-2 font-medium">{idx + 1}. {m.motivo}</span>
                    <span className="font-bold text-amber-500 bg-amber-600/10 px-2 py-0.5 rounded text-[11px] border border-amber-600/20">
                      {m.count} ocorrência(s)
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic">Nenhum motivo de pendência ou reprova registrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Maior Volume por Atividade/Esteira & Visualização do TMO Vertical (Descrescente) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Atividade com maior volume por esteira */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
              <Activity size={18} className="text-amber-500" />
              VOLUMETRIA DE TIPOS DE DEMANDA
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1.5">
            {atividadeVolume.length > 0 ? (
              atividadeVolume.map((item, index) => {
                const maxVol = atividadeVolume[0]?.volume || 1;
                const percent = Math.round((item.volume / maxVol) * 100);

                return (
                  <div key={index} className="bg-black border border-zinc-800 p-3 rounded-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-white truncate max-w-[78%] flex items-center gap-1.5">
                        <span className="font-bold text-amber-500 bg-amber-600/10 border border-amber-600/20 px-1.5 py-0.5 rounded text-[11px] flex-shrink-0">
                          {index + 1}º
                        </span>
                        <span className="truncate">{item.atividade}</span>
                      </span>
                      <span className="font-bold text-amber-500 flex-shrink-0">{item.volume} itens</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div 
                        className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-6 text-center">Nenhuma demanda registrada no filtro atual.</p>
            )}
          </div>
        </div>

        {/* Visualização de TMO por esteira (VERTICAL BARS, DECRESCENTE, COM LEGENDA FIXADA E 1 CASA DECIMAL) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 rounded-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2 uppercase">
                <Clock size={18} className="text-amber-500" />
                TEMPO MÉDIO DE OPERAÇÃO POR ESTEIRAS
              </h3>
            </div>

            
          </div>

          <div className="overflow-x-auto pb-2 custom-scrollbar">
            <div style={{ minWidth: Math.max(1000, tmoPorEsteira.length * 300), height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tmoPorEsteira} margin={{ top: 25, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis 
                    dataKey="esteira" 
                    stroke="#71717a" 
                    interval={0}
                    tick={<CustomXAxisTick />}
                    height={55}
                  />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} unit=" min" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: any) => [`${Number(val).toFixed(1)} minutos`, 'TMO Médio']}
                  />
                  <Bar dataKey="tmoMedio" name="TMO Médio (min)" fill="#FFFF00" radius={[4, 4, 0, 0]} barSize={40}>
                    <LabelList dataKey="tmoMedio" position="top" offset={6} fill="#FFFF00" fontSize={11} fontWeight="bold" formatter={(v: any) => `${Number(v).toFixed(1)}m`} />
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
