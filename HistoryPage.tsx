import React, { useMemo, useState } from 'react';
import { useStore, matchesFilter, getTabuladorName } from '../store/useStore';
import { History, Download, AlertTriangle, CheckCircle, Calendar, MessageSquareCheck, Eye, X } from 'lucide-react';

export const HistoryPage = () => {
  const { 
    data, 
    startDate, 
    endDate, 
    selectedEsteira, 
    selectedForma, 
    analystSearchQuery,
    esteiraMappings 
  } = useStore();

  const [selectedModalItem, setSelectedModalItem] = useState<typeof data[0] | null>(null);

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
      if (!matchesFilter(selectedForma, item.FormaMonitoria, 'TODAS')) return false;
      return true;
    });
  }, [data, startDate, endDate, selectedEsteira, selectedForma]);

  const totalMonitoriasGeral = baseFilteredData.length;
  const totalErrosGeral = baseFilteredData.filter(item => {
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

  const qualidadeGeralNum = totalMonitoriasGeral > 0
    ? Number((((totalMonitoriasGeral - totalErrosGeral) / totalMonitoriasGeral) * 100).toFixed(1))
    : 100;
  const qualidadeGeralStr = qualidadeGeralNum.toFixed(1) + '%';

  // Filter error items based on active criteria
  const filteredItems = useMemo(() => {
    return data.filter(item => {
      // Date range filter
      if (startDate && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria > endDate) return false;

      // Filter by Esteira, Forma
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFilter(selectedForma, item.FormaMonitoria, 'TODAS')) return false;

      // Search Query
      if (analystSearchQuery) {
        const q = analystSearchQuery.toLowerCase();
        const matchName = item.NomeAnalista?.toLowerCase().includes(q);
        const matchCode = item.CodigoAnalista?.toLowerCase().includes(q);
        const matchTag = item.Tag?.toLowerCase().includes(q);
        const matchMacro = item.MotivoMacro?.toLowerCase().includes(q);
        const matchPlano = item.Plano?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchTag && !matchMacro && !matchPlano) return false;
      }

      // Filter only errors (always true now)
      const errStr = String(item.Erro ?? '').trim().toLowerCase();
      const isErr = 
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
        errStr === 'nok';

      if (!isErr) return false;

      return true;
    }).sort((a, b) => b.DataMonitoria.localeCompare(a.DataMonitoria));
  }, [data, startDate, endDate, selectedEsteira, selectedForma, analystSearchQuery]);

  // Feedbacks count based on filled feedback dates / rows
  const feedbackCount = useMemo(() => {
    return filteredItems.filter(i => {
      const fb = String(i.DataFeedback ?? '').trim();
      return fb !== '' && fb !== '-' && fb !== 'null' && fb !== 'undefined';
    }).length;
  }, [filteredItems]);

  // Export to CSV (without Data Feedback)
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = ['Data', 'Código', 'Analista', 'Supervisor', 'Monitor', 'Esteira', 'Tag', 'Motivo Macro', 'Status', 'Plano de Ação', 'Data do Plano'];
    const rows = filteredItems.map(i => [
      i.DataMonitoria,
      i.CodigoAnalista || '',
      `"${i.NomeAnalista || ''}"`,
      `"${i.NomeSupervisor || ''}"`,
      `"${i.NomeMonitor || ''}"`,
      `"${getTabuladorName(i.Esteira, esteiraMappings)}"`,
      `"${i.Tag || ''}"`,
      `"${i.MotivoMacro || ''}"`,
      i.Erro === '0' || Number(i.Erro) === 0 ? '0%' : '100%',
      `"${i.Plano || ''}"`,
      i.DataPlano || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_erros_${startDate}_ate_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const errorCount = filteredItems.length;

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-gray-50 text-gray-900 w-full max-w-full text-xs">
      {/* Header Banner & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 p-3.5 rounded-lg shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-blue/10 border border-brand-blue/20 text-[#001E62] rounded-md">
            <History size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#001E62] tracking-wide uppercase">Histórico de Erros</h2>
            <p className="text-[11px] text-gray-500">Visão compacta das monitorias, planos de ação e inconsistências</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1 bg-white text-[#001E62] border border-[#001E62] rounded-md text-[11px] font-bold hover:bg-[#001E62] hover:text-white active:scale-95 transition-all cursor-pointer shadow-2xs"
          >
            <Download size={13} className="stroke-[2.5]" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Bar - 3 Cards in requested layout order: Erros (Esquerda) | Qualidade (Meio) | Feedbacks (Direita) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* ESQUERDA: Erros Registrados */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Erros Registrados</p>
            <p className="text-xl font-black text-red-600 mt-0.5">{errorCount.toLocaleString('pt-BR')}</p>
          </div>
          <AlertTriangle size={22} className="text-red-500/40" />
        </div>

        {/* MEIO: Qualidade do Período (mesma fórmula da Visão Geral) */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Qualidade do Período</p>
            <p className={`text-xl font-black mt-0.5 ${qualidadeGeralNum >= 95 ? 'text-[#001E62]' : 'text-red-600'}`}>
              {qualidadeGeralStr}
            </p>
            <p className="text-[10px] text-gray-400 font-medium">Meta: 95.0%</p>
          </div>
          <CheckCircle size={22} className={qualidadeGeralNum >= 95 ? 'text-[#001E62]/40' : 'text-red-500/40'} />
        </div>

        {/* DIREITA: Quantidade de Feedbacks Realizados */}
        <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Feedbacks Realizados</p>
            <p className="text-xl font-black text-[#001E62] mt-0.5">{feedbackCount.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-gray-400 font-medium">Linhas preenchidas</p>
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
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-400 italic">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isError = item.Erro === '0' || Number(item.Erro) === 0;
                  const esteiraLabel = getTabuladorName(item.Esteira, esteiraMappings);
                  const rowId = item.id || `${item.CodigoAnalista}-${idx}-${item.DataMonitoria}`;

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
                          <span>{formatDateBR(item.DataMonitoria)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 font-bold text-gray-900 whitespace-nowrap max-w-[150px] truncate" title={item.NomeAnalista}>
                        {item.NomeAnalista}
                        <span className="block text-[9px] text-gray-400 font-mono font-normal truncate">{item.CodigoAnalista}</span>
                      </td>
                      <td className="py-2 px-2.5 text-gray-700 whitespace-nowrap max-w-[120px] truncate" title={item.NomeSupervisor || '-'}>{item.NomeSupervisor || '-'}</td>
                      <td className="py-2 px-2.5 text-gray-500 whitespace-nowrap max-w-[110px] truncate" title={item.NomeMonitor || '-'}>{item.NomeMonitor || '-'}</td>
                      <td className="py-2 px-2.5 text-gray-800 font-medium whitespace-nowrap max-w-[130px] truncate" title={esteiraLabel}>{esteiraLabel}</td>
                      <td className="py-2 px-2.5 max-w-[140px] truncate">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-semibold truncate max-w-[130px]">
                          {item.Tag || 'Sem Tag'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-gray-600 max-w-[130px] truncate" title={item.MotivoMacro || '-'}>{item.MotivoMacro || '-'}</td>
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isError 
                            ? 'bg-red-50 text-red-600 border border-red-200' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}>
                          {isError ? '0% (Erro)' : '100% (OK)'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-gray-700 max-w-[200px] truncate" title={item.Plano || 'Sem plano registrado'}>
                        {item.Plano || '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center text-gray-700 font-medium whitespace-nowrap">
                        {formatDateBR(item.DataPlano)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL POP-UP: DETALHES COMPLETOS DO ERRO */}
      {selectedModalItem && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setSelectedModalItem(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#001E62] text-white p-4 flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <AlertTriangle className="text-amber-400" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide">Detalhes do Registro</h3>
                  <p className="text-[11px] text-blue-200">
                    Monitoria em {formatDateBR(selectedModalItem.DataMonitoria)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedModalItem(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition-colors cursor-pointer"
                title="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs text-gray-800 max-h-[80vh] overflow-y-auto">
              {/* Analyst & Code */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Analista Avaliado</p>
                  <p className="text-sm font-extrabold text-gray-900 mt-0.5">{selectedModalItem.NomeAnalista}</p>
                  <p className="text-[11px] font-mono text-gray-500">Matrícula/Código: {selectedModalItem.CodigoAnalista || '-'}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedModalItem.Erro === '0' || Number(selectedModalItem.Erro) === 0
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  }`}>
                    {selectedModalItem.Erro === '0' || Number(selectedModalItem.Erro) === 0 ? '0% (Inconformidade)' : '100% (Conforme)'}
                  </span>
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Supervisor / Gestor</p>
                  <p className="font-bold text-gray-800 mt-0.5">{selectedModalItem.NomeSupervisor || '-'}</p>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Monitor / Avaliador</p>
                  <p className="font-bold text-gray-800 mt-0.5">{selectedModalItem.NomeMonitor || '-'}</p>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Esteira / Processo</p>
                  <p className="font-bold text-gray-800 mt-0.5">
                    {getTabuladorName(selectedModalItem.Esteira, esteiraMappings)}
                  </p>
                </div>
              </div>

              {/* Inconsistência & Causa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-lg">
                  <p className="text-[10px] text-[#001E62] font-extrabold uppercase">Inconsistência / TAG</p>
                  <p className="font-extrabold text-[#001E62] text-xs mt-1">{selectedModalItem.Tag || 'Sem Tag'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Motivo Causa / Macro</p>
                  <p className="font-semibold text-gray-800 text-xs mt-1">{selectedModalItem.MotivoMacro || '-'}</p>
                </div>
              </div>

              {/* Plano de Ação */}
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-amber-900 font-extrabold uppercase text-[10px] tracking-wider">
                    Plano de Ação Registrado
                  </p>
                  {selectedModalItem.DataPlano && (
                    <span className="text-[10px] text-amber-800 font-bold">
                      Data do Plano: {formatDateBR(selectedModalItem.DataPlano)}
                    </span>
                  )}
                </div>
                <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedModalItem.Plano || 'Nenhum plano de ação detalhado para este registro.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-3.5 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedModalItem(null)}
                className="px-4 py-1.5 bg-[#001E62] text-white rounded-lg font-bold text-xs hover:bg-blue-900 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

