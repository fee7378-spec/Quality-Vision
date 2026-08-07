import React, { useMemo } from 'react';
import { useStore, getTabuladorName } from '../store/useStore';
import { Sliders, Calculator, Edit3, Clock, Info } from 'lucide-react';

export const MetricasPage = () => {
  const { 
    data,
    productivityData,
    esteirasMetrics, 
    setEsteiraMetric, 
    tmoMode, 
    setTmoMode,
    dailyWorkingHours,
    setDailyWorkingHours,
    esteiraMappings 
  } = useStore();

  // List of all unique esteiras
  const allEsteiras = useMemo(() => {
    const setE = new Set<string>();
    Object.keys(esteirasMetrics).forEach(e => setE.add(e));
    data.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    productivityData.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    return Array.from(setE).sort();
  }, [data, productivityData, esteirasMetrics]);

  // Calculate base-calculated TMO for each esteira from productivityData
  const baseCalculatedTMO = useMemo(() => {
    const map: Record<string, number> = {};
    const countMap: Record<string, { totalItems: number, totalMinutes: number }> = {};

    productivityData.forEach(item => {
      const eName = item.Esteira;
      if (!eName) return;
      if (item.TmoMinutos === undefined || item.TmoMinutos <= 0) return; // Ignore if column has no time data
      if (!countMap[eName]) countMap[eName] = { totalItems: 0, totalMinutes: 0 };
      const qty = item.Quantidade || 1;
      countMap[eName].totalItems += qty;
      countMap[eName].totalMinutes += item.TmoMinutos * qty;
    });

    Object.keys(countMap).forEach(e => {
      const { totalItems, totalMinutes } = countMap[e];
      map[e] = totalItems > 0 ? Math.round(totalMinutes / totalItems) : 25;
    });

    return map;
  }, [productivityData]);

  // Totals calculations
  const totals = useMemo(() => {
    let sumContratados = 0;
    let sumTmo = 0;
    let countTmo = 0;
    let sumCapacidade = 0;
    let sumFila = 0;
    let sumPrioridade = 0;
    let sumTotal = 0;

    allEsteiras.forEach(e => {
      const m = esteirasMetrics[e] || {
        contratados: 0,
        tmo: 25,
        capacidadeDia: 0,
        produzidoFila: 0,
        produzidoPrioridade: 0,
        totalProduzido: 0
      };

      const currentTmo = tmoMode === 'base' && baseCalculatedTMO[e] !== undefined 
        ? baseCalculatedTMO[e] 
        : (m.tmo || 25);

      const calcCapacidade = currentTmo > 0 
        ? Math.round(((m.contratados || 0) * (dailyWorkingHours || 8) * 60) / currentTmo)
        : 0;

      sumContratados += (m.contratados || 0);
      sumTmo += currentTmo;
      if (currentTmo > 0) countTmo++;
      sumCapacidade += calcCapacidade;
      sumFila += (m.produzidoFila || 0);
      sumPrioridade += (m.produzidoPrioridade || 0);
      sumTotal += (m.produzidoFila || 0) + (m.produzidoPrioridade || 0);
    });

    return {
      sumContratados,
      avgTmo: countTmo > 0 ? Math.round(sumTmo / countTmo) : 0,
      sumCapacidade,
      sumFila,
      sumPrioridade,
      sumTotal
    };
  }, [allEsteiras, esteirasMetrics, tmoMode, baseCalculatedTMO, dailyWorkingHours]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-900">
      {/* Top Banner & Settings Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 border border-gray-200 p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue-light rounded-lg">
            <Sliders size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-blue tracking-wide uppercase">Cadastramento de Métricas por Esteira</h2>
            <p className="text-xs text-gray-500 mt-0.5">Defina TMO, Contratados, Horas Diárias e Produções por Esteira</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Horas Diarias (Global for all esteiras) */}
          <div className="flex items-center gap-2.5 bg-gray-50 p-2 px-3 rounded-lg border border-brand-blue/40">
            <Clock size={16} className="text-brand-blue-light" />
            <span className="text-xs font-semibold text-gray-700">Horas Diárias:</span>
            <input
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={dailyWorkingHours || ''}
              onChange={(e) => setDailyWorkingHours(parseFloat(e.target.value) || 0)}
              className="w-16 bg-white border border-gray-300 focus:border-brand-blue rounded px-2 py-1 text-center font-bold text-brand-blue-light text-xs outline-none"
            />
            <span className="text-[11px] font-medium text-gray-500">h / dia</span>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 pl-2">Modo TMO:</span>
            <button
              onClick={() => setTmoMode('manual')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                tmoMode === 'manual'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Edit3 size={13} />
              Manual
            </button>
            <button
              onClick={() => setTmoMode('base')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                tmoMode === 'base'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Calculator size={13} />
              Calculado da Base
            </button>
          </div>
        </div>
      </div>

      {/* Formula Explanation Callout */}
      <div className="bg-white/60 border border-gray-200/80 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-brand-blue-light flex-shrink-0" />
          <span>
            <strong className="text-gray-800">Fórmula da Capacidade Diária:</strong> (Contratados × {dailyWorkingHours || 8} horas × 60 min) / TMO (minutos)
          </span>
        </div>
        <span className="text-[11px] text-brand-blue-light/90 font-medium hidden sm:inline-block">
          Cálculo automático padronizado para todas as esteiras
        </span>
      </div>

      {/* Metrics Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-white text-gray-500 uppercase font-extrabold tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Esteira (Tabulador)</th>
                <th className="py-3.5 px-4 text-center">Contratados</th>
                <th className="py-3.5 px-4 text-center">
                  TMO (min)
                  {tmoMode === 'base' && <span className="text-[10px] text-brand-blue-light font-normal ml-1">(Auto)</span>}
                </th>
                <th className="py-3.5 px-4 text-center">
                  Capacidade Dia
                  <span className="block text-[10px] text-brand-blue-light/80 font-normal lowercase tracking-normal">
                    ({dailyWorkingHours || 8}h x Contratados / TMO)
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">Produzido Fila</th>
                <th className="py-3.5 px-4 text-center">Produzido Prioridade</th>
                <th className="py-3.5 px-4 text-center text-brand-blue-light font-black bg-white/80">Total Produzido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {allEsteiras.map((esteira) => {
                const tabuladorName = getTabuladorName(esteira, esteiraMappings);
                const metric = esteirasMetrics[esteira] || {
                  contratados: 0,
                  tmo: 25,
                  capacidadeDia: 0,
                  produzidoFila: 0,
                  produzidoPrioridade: 0,
                  totalProduzido: 0
                };

                const currentTmo = tmoMode === 'base' && baseCalculatedTMO[esteira] !== undefined
                  ? baseCalculatedTMO[esteira]
                  : metric.tmo;

                const calcCapacidadeDia = currentTmo > 0 
                  ? Math.round(((metric.contratados || 0) * (dailyWorkingHours || 8) * 60) / currentTmo)
                  : 0;

                const totalProd = (metric.produzidoFila || 0) + (metric.produzidoPrioridade || 0);

                return (
                  <tr key={esteira} className="hover:bg-gray-100/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {tabuladorName}
                      {tabuladorName !== esteira && (
                        <span className="block text-[10px] text-gray-400 font-normal">{esteira}</span>
                      )}
                    </td>

                    {/* Contratados */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={metric.contratados || ''}
                        onChange={(e) => setEsteiraMetric(esteira, { contratados: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center text-gray-900 focus:border-brand-blue outline-none font-bold"
                      />
                    </td>

                    {/* TMO */}
                    <td className="py-2 px-3 text-center">
                      {tmoMode === 'base' ? (
                        <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded text-brand-blue-light font-bold">
                          {currentTmo}m
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={metric.tmo || ''}
                          onChange={(e) => setEsteiraMetric(esteira, { tmo: parseInt(e.target.value) || 0 })}
                          className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center text-brand-blue-light focus:border-brand-blue outline-none font-bold"
                        />
                      )}
                    </td>

                    {/* Capacidade Dia (Calculada Automaticamente) */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center justify-center min-w-[80px] px-3 py-1.5 bg-gray-50 border border-brand-blue/30 rounded text-brand-blue-light font-black text-sm shadow-inner">
                        {calcCapacidadeDia.toLocaleString('pt-BR')}
                      </div>
                    </td>

                    {/* Produzido Fila */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={metric.produzidoFila || ''}
                        onChange={(e) => setEsteiraMetric(esteira, { produzidoFila: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center text-gray-900 focus:border-brand-blue outline-none font-bold"
                      />
                    </td>

                    {/* Produzido Prioridade */}
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={metric.produzidoPrioridade || ''}
                        onChange={(e) => setEsteiraMetric(esteira, { produzidoPrioridade: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-center text-gray-900 focus:border-brand-blue outline-none font-bold"
                      />
                    </td>

                    {/* Total Produzido (Calculado: Fila + Prioridade) */}
                    <td className="py-3 px-4 text-center font-extrabold text-brand-blue-light text-sm bg-white/40">
                      {totalProd.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Footer Row */}
            <tfoot className="bg-white text-gray-900 font-extrabold uppercase border-t-2 border-gray-200 tracking-wide text-xs">
              <tr>
                <td className="py-4 px-4 text-brand-blue-light">TOTAL / MÉDIA GERAL</td>
                <td className="py-4 px-3 text-center text-brand-blue-light text-sm">{totals.sumContratados}</td>
                <td className="py-4 px-3 text-center text-brand-blue-light text-sm">{totals.avgTmo}m <span className="text-[10px] text-gray-400 font-normal">(Média)</span></td>
                <td className="py-4 px-3 text-center text-brand-blue-light text-sm">{totals.sumCapacidade.toLocaleString('pt-BR')}</td>
                <td className="py-4 px-3 text-center text-brand-blue-light text-sm">{totals.sumFila.toLocaleString('pt-BR')}</td>
                <td className="py-4 px-3 text-center text-brand-blue-light text-sm">{totals.sumPrioridade.toLocaleString('pt-BR')}</td>
                <td className="py-4 px-4 text-center text-brand-blue-light text-base bg-brand-blue/10 border-l border-brand-blue/20">{totals.sumTotal.toLocaleString('pt-BR')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
