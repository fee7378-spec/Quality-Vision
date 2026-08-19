import React, { useMemo, useState } from 'react';
import { useStore, matchesFilter, matchesFormaFilter, getTabuladorName, getAnalystCode, getSupervisorCode, getMonitorCode, getVal } from '../store/useStore';
import { useTokenStore } from '../store/useTokenStore';
import { History, Download, AlertTriangle, CheckCircle, Calendar, MessageSquareCheck, Eye, X, ClipboardCheck } from 'lucide-react';
import { ErrorDetailModal } from '../components/ErrorDetailModal';

export const HistoryPage = () => {
  const { accessType } = useTokenStore();
  const isVisualizacao = accessType === 'visualizacao';

  const { 
    data, 
    monitorias,
    monitoriaErros,
    volumetria,
    startDate, 
    endDate, 
    selectedEsteira, 
    selectedForma, 
    analystSearchQuery,
    esteiraMappings 
  } = useStore();

  const [selectedModalItem, setSelectedModalItem] = useState<typeof data[0] | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);

  // Format Date to DD/MM/YYYY
  const formatDateBR = (dateStr?: string | null) => {
    if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return '-';
    const str = dateStr.trim();
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } else if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) return str;
        if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return str;
  };

  // Base monitorias filtered by active criteria (both errors and non-errors) to calculate overall quality matching Visão Geral
  const baseFilteredData = useMemo(() => {
    return data.filter(item => {
      if (startDate && item.DataMonitoria && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria && item.DataMonitoria > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFormaFilter(selectedForma, item)) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedEsteira, selectedForma]);

  const totalMonitoriasPeriod = useMemo(() => {
    return monitorias
      .filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        return true;
      })
      .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0), 0);
  }, [monitorias, startDate, endDate, selectedEsteira]);

  // Consolidate global KPI calculations to reduce redundant loops
  const globalKpis = useMemo(() => {
    let monTotal = 0;
    if (monitorias && monitorias.length > 0) {
      monTotal = monitorias
        .filter(item => {
          const itemDate = getVal(item, 'data');
          if (!itemDate || typeof itemDate !== 'string') return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          const itemEsteira = getVal(item, 'esteira');
          if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
          if (!matchesFormaFilter(selectedForma, item)) return false;
          return true;
        })
        .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || Number(item.quantidade) || 0), 0);
    } else {
      monTotal = baseFilteredData.length;
    }

    let errTotal = 0;
    if (monitoriaErros && monitoriaErros.length > 0) {
      errTotal = monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        if (!matchesFormaFilter(selectedForma, item)) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }
        return true;
      }).length;
    } else {
      errTotal = baseFilteredData.filter(item => {
        const errStr = String(item.Erro ?? '').trim().toLowerCase();
        return (
          errStr === '0' || 
          errStr === '0.0' || 
          errStr.startsWith('0') || 
          errStr.includes('erro') || 
          errStr.includes('não conforme') || 
          errStr.includes('nao conforme') || 
          errStr.includes('falha') || 
          errStr.includes('reprovad') || 
          errStr === 'nc' || 
          errStr === 'n/c' || 
          errStr === 'nok'
        );
      }).length;
    }

    let prodTotal = 0;
    if (volumetria) {
      prodTotal = volumetria
        .filter(item => {
          const itemDate = getVal(item, 'data') || getVal(item, 'DataProdutividade') || '';
          if (!itemDate || typeof itemDate !== 'string') return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
          return true;
        })
        .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || 0), 0);
    }

    const isDoubleCheck = Array.isArray(selectedForma) 
      ? selectedForma.includes('Double Check') && selectedForma.length === 1 
      : selectedForma === 'Double Check';
    
    const baseForQuality = isDoubleCheck ? prodTotal : monTotal;
    const qualityPct = baseForQuality > 0 ? Number((((baseForQuality - errTotal) / baseForQuality) * 100).toFixed(1)) : 100;

    return {
      totalMonitorias: monTotal,
      totalErros: errTotal,
      totalProdutividade: prodTotal,
      qualidadePct: qualityPct,
      qualidadeStr: qualityPct.toFixed(1) + '%'
    };
  }, [monitorias, monitoriaErros, volumetria, startDate, endDate, selectedEsteira, selectedForma, baseFilteredData]);

  const { 
    totalMonitorias: totalMonitoriasGeral, 
    totalErros: totalErrosGeral, 
    totalProdutividade: totalProdutividadeGeral, 
    qualidadePct: qualidadeGeralPct,
    qualidadeStr: qualidadeGeralStr 
  } = globalKpis;

  // Filter error items based on active criteria from monitoriaErros (with fallback)
  const filteredErrosTable = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0) {
      return monitoriaErros
        .filter(item => {
          const itemDate = getVal(item, 'data');
          if (!itemDate || typeof itemDate !== 'string') return false;
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;

          const itemEsteira = getVal(item, 'esteira');
          if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
          if (!matchesFormaFilter(selectedForma, item)) return false;

          const macroTag = getVal(item, 'macroTag');
          if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
            return false;
          }

          if (analystSearchQuery) {
            const q = analystSearchQuery.toLowerCase();
            const analista = String(getVal(item, 'analista') || '').toLowerCase();
            const tag = String(getVal(item, 'tag') || '').toLowerCase();
            const macro = String(getVal(item, 'macroTag') || '').toLowerCase();
            const plano = String(getVal(item, 'planoDeAcao') || '').toLowerCase();
            if (!analista.includes(q) && !tag.includes(q) && !macro.includes(q) && !plano.includes(q)) return false;
          }

          return true;
        })
        .sort((a, b) => String(getVal(b, 'data') || '').localeCompare(String(getVal(a, 'data') || '')));
    }

    return baseFilteredData.filter(item => {
      if (startDate && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFormaFilter(selectedForma, item)) return false;

      if (analystSearchQuery) {
        const q = analystSearchQuery.toLowerCase();
        const matchName = item.NomeAnalista?.toLowerCase().includes(q);
        const matchCode = item.CodigoAnalista?.toLowerCase().includes(q);
        const matchTag = item.Tag?.toLowerCase().includes(q);
        const matchMacro = item.MotivoMacro?.toLowerCase().includes(q);
        const matchPlano = item.Plano?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchTag && !matchMacro && !matchPlano) return false;
      }

      const errStr = String(item.Erro ?? '').trim().toLowerCase();
      return (
        errStr === '0' || 
        errStr === '0.0' || 
        errStr.startsWith('0') || 
        errStr.includes('erro') || 
        errStr.includes('não conforme') || 
        errStr.includes('nao conforme') || 
        errStr.includes('falha') || 
        errStr.includes('reprovad') || 
        errStr === 'nc' || 
        errStr === 'n/c' || 
        errStr === 'nok'
      );
    }).sort((a, b) => b.DataMonitoria.localeCompare(a.DataMonitoria));
  }, [monitoriaErros, data, startDate, endDate, selectedEsteira, selectedForma, analystSearchQuery, baseFilteredData]);

  // Feedbacks count based on filled planoDeAcao in monitoriaErros
  const feedbackCount = useMemo(() => {
    if (monitoriaErros && monitoriaErros.length > 0) {
      return monitoriaErros.filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;

        const itemEsteira = getVal(item, 'esteira');
        if (!matchesFilter(selectedEsteira, itemEsteira, 'TODAS')) return false;
        if (!matchesFormaFilter(selectedForma, item)) return false;

        const macroTag = getVal(item, 'macroTag');
        if (macroTag === null || macroTag === undefined || String(macroTag).trim() === '' || String(macroTag).toLowerCase() === 'null') {
          return false;
        }

        const plano = getVal(item, 'planoDeAcao');
        return plano !== null && plano !== undefined && String(plano).trim() !== '' && String(plano).toLowerCase() !== 'null';
      }).length;
    }

    return filteredErrosTable.filter(i => {
      const fb = String(i.DataFeedback ?? i.Plano ?? '').trim();
      return fb !== '' && fb !== '-' && fb !== 'null' && fb !== 'undefined';
    }).length;
  }, [monitoriaErros, startDate, endDate, selectedEsteira, selectedForma, filteredErrosTable]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredErrosTable.length === 0) return;
    const headers = ['Data', 'Código', 'Analista', 'Supervisor', 'Monitor', 'Esteira', 'Tag', 'Motivo Macro', 'Forma', 'Plano de Ação', 'Data Feedback'];
    const rows = filteredErrosTable.map(i => {
      const itemDate = getVal(i, 'data') || i.DataMonitoria || '';
      const itemCode = getAnalystCode(i);
      const itemAnalista = isVisualizacao ? getAnalystCode(i) : (getVal(i, 'analista') || i.NomeAnalista || '');
      const itemSup = isVisualizacao ? getSupervisorCode(i) : (getVal(i, 'supervisor') || i.NomeSupervisor || '');
      const itemMon = isVisualizacao ? getMonitorCode(i) : (getVal(i, 'monitor') || i.NomeMonitor || '');
      const rawEst = getVal(i, 'esteira') || i.Esteira || '';
      const itemEst = getTabuladorName(rawEst, esteiraMappings) || rawEst;
      const itemTag = getVal(i, 'tag') || i.Tag || '';
      const itemMacro = getVal(i, 'macroTag') || i.MotivoMacro || '';
      const itemForma = getVal(i, 'forma') || i.FormaMonitoria || '';
      const itemPlano = getVal(i, 'planoDeAcao') || i.Plano || '';
      const itemFbDate = getVal(i, 'dataFeedback') || i.DataFeedback || '';

      return [
        itemDate,
        itemCode,
        `"${itemAnalista}"`,
        `"${itemSup}"`,
        `"${itemMon}"`,
        `"${itemEst}"`,
        `"${itemTag}"`,
        `"${itemMacro}"`,
        `"${itemForma}"`,
        `"${itemPlano}"`,
        itemFbDate
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_erros_${startDate || 'todos'}_ate_${endDate || 'todos'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const errorCount = totalErrosGeral;

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-gray-50 text-gray-900 w-full max-w-full text-xs">
      {/* Header & Export */}
      <div className="flex justify-end">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1 bg-white text-[#001E62] border border-[#001E62] rounded-md text-[11px] font-bold hover:bg-[#001E62] hover:text-white active:scale-95 transition-all cursor-pointer shadow-2xs"
        >
          <Download size={13} className="stroke-[2.5]" />
          Exportar CSV
        </button>
      </div>

      {/* KPI Stats Bar - 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Card 1: Monitorias */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Monitorias</p>
            <p className="text-xl font-black text-brand-blue mt-0.5">{totalMonitoriasPeriod.toLocaleString('pt-BR')}</p>
          </div>
          <ClipboardCheck size={22} className="text-brand-blue/40" />
        </div>

        {/* Card 2: Erros Registrados */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Erros Registrados</p>
            <p className="text-xl font-black text-red-600 mt-0.5">{errorCount.toLocaleString('pt-BR')}</p>
          </div>
          <AlertTriangle size={22} className="text-red-500/40" />
        </div>

        {/* Card 3: Qualidade do Período */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Qualidade do Período</p>
            <p className={`text-xl font-black mt-0.5 ${qualidadeGeralPct >= 95 ? 'text-[#001E62]' : 'text-red-600'}`}>
              {qualidadeGeralStr}
            </p>
            <p className="text-[10px] text-gray-400 font-medium">Meta: 95.0%</p>
          </div>
          <CheckCircle size={22} className={qualidadeGeralPct >= 95 ? 'text-[#001E62]/40' : 'text-red-500/40'} />
        </div>

        {/* Card 4: Feedbacks Realizados */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Feedbacks Realizados</p>
            <p className="text-xl font-black text-[#001E62] mt-0.5">{feedbackCount.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-400 font-medium">Planos de ação tomados</p>
          </div>
          <MessageSquareCheck size={22} className="text-[#001E62]/40" />
        </div>
      </div>

      {/* Main Table - Compact */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-[11px] text-gray-700 min-w-[1000px] border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase font-bold tracking-wider border-b border-gray-200 select-none">
              <tr>
                <th className="py-2 px-2 text-center w-8"></th>
                <th className="py-2 px-2.5">Data</th>
                <th className="py-2 px-2.5">Analista</th>
                <th className="py-2 px-2.5">Supervisor</th>
                <th className="py-2 px-2.5">Monitor</th>
                <th className="py-2 px-2.5">Esteira</th>
                <th className="py-2 px-2.5">Tag</th>
                <th className="py-2 px-2.5">Motivo Macro</th>
                <th className="py-2 px-2.5 text-center">Status</th>
                <th className="py-2 px-2.5">Plano de Ação</th>
                <th className="py-2 px-2.5 text-center">Data Plano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium">
              {filteredErrosTable.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-400 italic">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredErrosTable.slice(0, visibleCount).map((item, idx) => {
                  const itemDate = getVal(item, 'data') || item.DataMonitoria || '-';
                  const itemCode = getAnalystCode(item);
                  const itemAnalista = isVisualizacao ? getAnalystCode(item) : (getVal(item, 'analista') || item.NomeAnalista || 'Analista');
                  const itemSup = isVisualizacao ? getSupervisorCode(item) : (getVal(item, 'supervisor') || item.NomeSupervisor || '-');
                  const itemMon = isVisualizacao ? getMonitorCode(item) : (getVal(item, 'monitor') || item.NomeMonitor || '-');
                  const rawEst = getVal(item, 'esteira') || item.Esteira || '';
                  const esteiraLabel = getTabuladorName(rawEst, esteiraMappings) || rawEst || '-';
                  const itemTag = getVal(item, 'tag') || item.Tag || 'Sem Tag';
                  const itemMacro = getVal(item, 'macroTag') || item.MotivoMacro || '-';
                  const itemPlano = getVal(item, 'planoDeAcao') || item.Plano || '-';
                  const itemFbDate = getVal(item, 'dataFeedback') || getVal(item, 'dataPlano') || item.DataPlano || '-';
                  const rowId = item.id || `${itemCode}-${idx}-${itemDate}`;

                  return (
                    <tr 
                      key={rowId}
                      onClick={() => setSelectedModalItem(item)}
                      className="hover:bg-blue-50/70 transition-colors cursor-pointer select-none even:bg-gray-50/40"
                      title="Clique para abrir os detalhes completos em um pop-up modal"
                    >
                      <td className="py-2 px-2 text-center text-gray-400">
                        <Eye size={14} className="text-[#001E62] hover:scale-110 transition-transform" />
                      </td>
                      <td className="py-2 px-2.5 text-gray-900 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#001E62] shrink-0" />
                          <span>{formatDateBR(itemDate)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap max-w-[150px] truncate" title={itemAnalista}>
                        {itemAnalista}
                        {!isVisualizacao && (
                          <span className="block text-[9px] text-gray-400 font-mono font-normal truncate">{itemCode}</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-gray-700 whitespace-nowrap max-w-[120px] truncate" title={itemSup}>{itemSup}</td>
                      <td className="py-2 px-2.5 text-gray-500 whitespace-nowrap max-w-[110px] truncate" title={itemMon}>{itemMon}</td>
                      <td className="py-2 px-2.5 text-gray-800 font-medium whitespace-nowrap max-w-[130px] truncate" title={esteiraLabel}>{esteiraLabel}</td>
                      <td className="py-2 px-2.5 max-w-[140px] truncate">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-semibold truncate max-w-[130px]">
                          {itemTag}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-gray-600 max-w-[130px] truncate" title={itemMacro}>{itemMacro}</td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap shadow-xs bg-red-50 text-red-600 border border-red-200">
                          0% • Erro
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-gray-700 max-w-[200px] truncate" title={itemPlano}>
                        {itemPlano}
                      </td>
                      <td className="py-2 px-2.5 text-center text-gray-700 font-medium whitespace-nowrap">
                        {formatDateBR(itemFbDate)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredErrosTable.length > visibleCount && (
          <div className="p-3 border-t border-gray-200 bg-gray-50/50 flex justify-center">
            <button
              onClick={() => setVisibleCount(prev => prev + 15)}
              className="px-4 py-1.5 bg-white border border-[#001E62]/30 text-[#001E62] rounded-md text-xs font-bold shadow-xs hover:bg-[#001E62]/5 hover:border-[#001E62] transition-colors"
            >
              Exibir mais 15 erros
            </button>
          </div>
        )}
      </div>

      {/* MODAL POP-UP: DETALHES COMPLETOS DO ERRO */}
      <ErrorDetailModal 
        item={selectedModalItem} 
        onClose={() => setSelectedModalItem(null)} 
      />
    </div>
  );
};

