import React, { useMemo, useState } from 'react';
import { useStore, matchesFilter, getTabuladorName } from '../store/useStore';
import { History, Search, Download, AlertTriangle, CheckCircle, Calendar, FileText } from 'lucide-react';

export const HistoryPage = () => {
  const { 
    data, 
    startDate, 
    endDate, 
    selectedEsteira, 
    selectedForma, 
    selectedSupervisor,
    analystSearchQuery,
    esteiraMappings 
  } = useStore();

  

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

  // Filter items based on active criteria
  const filteredItems = useMemo(() => {
    return data.filter(item => {
      // Date range filter
      if (startDate && item.DataMonitoria < startDate) return false;
      if (endDate && item.DataMonitoria > endDate) return false;

      // Filter by Esteira, Forma, Supervisor
      if (!matchesFilter(selectedEsteira, item.Esteira, 'TODAS')) return false;
      if (!matchesFilter(selectedForma, item.FormaMonitoria, 'TODAS')) return false;
      if (!matchesFilter(selectedSupervisor, item.NomeSupervisor || item.Supervisor, 'TODOS')) return false;

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

      // Filter only errors option
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
  }, [data, startDate, endDate, selectedEsteira, selectedForma, selectedSupervisor, analystSearchQuery, true]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;
    const headers = ['Data', 'Código', 'Analista', 'Supervisor', 'Monitor', 'Esteira', 'Tag', 'Motivo Macro', 'Erro %', 'Data Feedback', 'Plano de Ação', 'Data do Plano'];
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
      i.DataFeedback || '',
      `"${i.Plano || ''}"`,
      i.DataPlano || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_monitorias_${startDate}_ate_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCount = filteredItems.length;
  const errorCount = filteredItems.filter(i => i.Erro === '0' || Number(i.Erro) === 0).length;
  const qualityPerc = totalCount > 0 ? (((totalCount - errorCount) / totalCount) * 100).toFixed(1) : '100.0';

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-900">
      {/* Header Banner & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 border border-gray-200 p-5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue-light rounded-lg">
            <History size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-blue tracking-wide uppercase">Histórico de Erros</h2>
            <p className="text-xs text-gray-500 mt-0.5">Visão consolidada das monitorias, planos de ação e inconsistências</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white text-brand-blue border border-brand-blue rounded-lg text-xs font-bold hover:bg-brand-blue hover:text-white active:scale-95 transition-all cursor-pointer shadow-md shadow-[#001E62]/10"
          >
            <Download size={14} className="stroke-[2.5]" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Total de Registros</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalCount.toLocaleString('pt-BR')}</p>
          </div>
          <FileText size={28} className="text-gray-400" />
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Ocorrências de Erro</p>
            <p className="text-2xl font-black text-red-600 mt-1">{errorCount.toLocaleString('pt-BR')}</p>
          </div>
          <AlertTriangle size={28} className="text-red-500/40" />
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase">Qualidade do Período</p>
            <p className={`text-2xl font-black mt-1 ${Number(qualityPerc) >= 95 ? 'text-brand-blue-light' : 'text-red-600'}`}>
              {qualityPerc}%
            </p>
            <p className="text-[10px] text-gray-400 font-medium">Meta: 95.0%</p>
          </div>
          <CheckCircle size={28} className={Number(qualityPerc) >= 95 ? 'text-brand-blue/40' : 'text-red-500/40'} />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-white text-gray-500 uppercase font-extrabold tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-3">Data</th>
                <th className="py-3.5 px-3">Analista</th>
                <th className="py-3.5 px-3">Supervisor</th>
                <th className="py-3.5 px-3">Monitor</th>
                <th className="py-3.5 px-3">Esteira</th>
                <th className="py-3.5 px-3">Tag</th>
                <th className="py-3.5 px-3">Motivo Macro</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3 text-center">Data Feedback</th>
                <th className="py-3.5 px-3">Plano de Ação</th>
                <th className="py-3.5 px-3 text-center">Data Plano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400 italic">
                    Nenhum registro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isError = item.Erro === '0' || Number(item.Erro) === 0;
                  const esteiraLabel = getTabuladorName(item.Esteira, esteiraMappings);

                  return (
                    <tr key={item.id || `${item.CodigoAnalista}-${idx}`} className="hover:bg-gray-100/40 transition-colors">
                      <td className="py-3 px-3 text-gray-900 font-semibold whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#001E62] shrink-0" />
                          <span>{formatDateBR(item.DataMonitoria)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900">
                        {item.NomeAnalista}
                        <span className="block text-[10px] text-gray-400 font-mono font-normal">{item.CodigoAnalista}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-700">{item.NomeSupervisor || '-'}</td>
                      <td className="py-3 px-3 text-gray-500">{item.NomeMonitor || '-'}</td>
                      <td className="py-3 px-3 text-gray-800 font-medium">{esteiraLabel}</td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[11px] max-w-[160px] truncate">
                          {item.Tag || 'Sem Tag'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-[11px]">{item.MotivoMacro || '-'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          isError 
                            ? 'bg-red-500/20 text-red-600 border border-red-500/30' 
                            : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                        }`}>
                          {isError ? '0% (Erro)' : '100% (OK)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700 font-medium text-[11px]">
                        {formatDateBR(item.DataFeedback)}
                      </td>
                      <td className="py-3 px-3 text-gray-700 max-w-xs truncate" title={item.Plano || ''}>
                        {item.Plano || '-'}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-700 font-medium text-[11px]">
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
    </div>
  );
};
