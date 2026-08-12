import React, { useState } from 'react';
import { X, User, AlertTriangle, CheckCircle2, FileText, Tag } from 'lucide-react';
import { useStore, getTabuladorName, formatDateToBR, getSupervisorCode } from '../store/useStore';
import { useTokenStore } from '../store/useTokenStore';
import { ErrorDetailModal } from './ErrorDetailModal';

const getVal = (obj: any, key: string) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[key] !== undefined) return obj[key];
  const lowerKey = key.toLowerCase();
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
  return foundKey ? obj[foundKey] : undefined;
};

const normalizeName = (name: any) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
};

interface AnalystModalProps {
  analystCode: string | null;
  analystName: string | null;
  onClose: () => void;
}

export const AnalystModal: React.FC<AnalystModalProps> = ({ analystCode, analystName, onClose }) => {
  const { data, monitorias, monitoriaErros, volumetria, selectedForma, esteiraMappings, startDate, endDate } = useStore();
  const [selectedErrorDetail, setSelectedErrorDetail] = useState<any>(null);

  if (!analystCode && !analystName) return null;

  const codeMatch = analystCode ? analystCode.trim().toLowerCase() : '';
  const nameMatch = analystName ? normalizeName(analystName) : '';

  const matchesAnalyst = (item: any) => {
    const code = (getVal(item, 'codAnalista') || item.CodigoAnalista || '').toString().trim().toLowerCase();
    const name = normalizeName(getVal(item, 'analista') || item.NomeAnalista);
    if (codeMatch && code === codeMatch) return true;
    if (nameMatch && name === nameMatch) return true;
    return false;
  };

  // 1. Monitorias count
  const filteredMonitorias = monitorias.filter(m => {
    const d = getVal(m, 'data');
    if (d && typeof d === 'string') {
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
    }
    return matchesAnalyst(m);
  });

  // 2. Erros rows
  const filteredErros = monitoriaErros.filter(e => {
    const d = getVal(e, 'data');
    if (d && typeof d === 'string') {
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
    }
    return matchesAnalyst(e);
  });

  // Fallback to local uploaded data array if Supabase arrays are empty
  const analystItemsFromData = data.filter(i => {
    if (startDate && i.DataMonitoria < startDate) return false;
    if (endDate && i.DataMonitoria > endDate) return false;
    return matchesAnalyst(i);
  }).sort((a, b) => (b.DataMonitoria || '').localeCompare(a.DataMonitoria || ''));

  // 3. Volumetria (Produtividade)
  const filteredVolumetria = volumetria.filter(v => {
    const d = getVal(v, 'data') || getVal(v, 'DataProdutividade') || '';
    if (d && typeof d === 'string') {
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
    }
    return matchesAnalyst(v);
  });
  const totalProdutividade = filteredVolumetria.reduce((sum, v) => sum + (Number(getVal(v, 'quantidade')) || 0), 0);

  const isErrorFromData = (item: any) => {
    const errStr = (item.Erro || '').toString().trim().toLowerCase();
    return errStr === '0' || errStr === 'erro' || errStr === 'reprovado' || errStr === 'nc' || errStr === 'n/c' || errStr === 'nok';
  };

  const totalMonitorias = filteredMonitorias.length > 0 
    ? filteredMonitorias.reduce((sum, m) => sum + (Number(getVal(m, 'quantidade')) || Number(m.quantidade) || 1), 0)
    : analystItemsFromData.length;

  const effectiveErrorList = (filteredErros.length > 0 || filteredMonitorias.length > 0)
    ? filteredErros
    : analystItemsFromData.filter(isErrorFromData);

  const totalErros = effectiveErrorList.length;
  
  const isDoubleCheck = Array.isArray(selectedForma) 
    ? selectedForma.includes('Double Check') && selectedForma.length === 1 
    : selectedForma === 'Double Check';
  
  const baseForQuality = isDoubleCheck ? totalProdutividade : totalMonitorias;

  const qualidadeNum = baseForQuality > 0 ? ((baseForQuality - totalErros) / baseForQuality) * 100 : 100;
  const qualidadeStr = qualidadeNum.toFixed(1);

  // Tag frequency breakdown
  const tagBreakdown: Record<string, number> = {};
  effectiveErrorList.forEach(i => {
    const t = getVal(i, 'tag') || i.Tag || 'Sem Tag';
    const tagStr = (t && String(t).trim() !== '' && String(t).toLowerCase() !== 'null') ? String(t).trim() : 'Sem Tag';
    tagBreakdown[tagStr] = (tagBreakdown[tagStr] || 0) + 1;
  });

  const { accessType } = useTokenStore();
  const isVisualizacao = accessType === 'visualizacao';

  const sortedTags = Object.entries(tagBreakdown).sort((a, b) => b[1] - a[1]);
  const primarySupervisor = getVal(effectiveErrorList[0], 'supervisor') || getVal(filteredMonitorias[0], 'supervisor') || analystItemsFromData[0]?.NomeSupervisor || analystItemsFromData[0]?.Supervisor || 'Não informado';
  const supervisorDisplay = isVisualizacao ? getSupervisorCode({ NomeSupervisor: primarySupervisor }) : primarySupervisor;
  const rawEsteira = getVal(effectiveErrorList[0], 'esteira') || getVal(filteredMonitorias[0], 'esteira') || analystItemsFromData[0]?.Esteira || '';
  const primaryEsteira = getTabuladorName(rawEsteira, esteiraMappings) || rawEsteira || 'Geral';
  const rawNameDisplay = analystName || getVal(effectiveErrorList[0], 'analista') || analystItemsFromData[0]?.NomeAnalista || 'Analista';
  const codeDisplay = analystCode || getVal(effectiveErrorList[0], 'codAnalista') || analystItemsFromData[0]?.CodigoAnalista || '';
  const nameDisplay = isVisualizacao ? (codeDisplay || 'Analista') : rawNameDisplay;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-white border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue-light rounded-xl">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-wide uppercase">{nameDisplay}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-brand-blue-light">{codeDisplay}</span>
                <span>•</span>
                <span>Supervisor: {supervisorDisplay}</span>
                <span>•</span>
                <span>Esteira: {primaryEsteira}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Executive Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/90 border border-gray-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Monitorias</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalMonitorias}</p>
              </div>
              <FileText size={28} className="text-gray-400" />
            </div>

            <div className="bg-white/90 border border-gray-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Total de Inconsistências</p>
                <p className="text-2xl font-black text-red-600 mt-1">{totalErros}</p>
              </div>
              <AlertTriangle size={28} className="text-red-500/40" />
            </div>

            <div className="bg-white/90 border border-gray-200 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Qualidade Atual</p>
                <p className={`text-2xl font-black mt-1 ${qualidadeNum >= 95 ? 'text-brand-blue-light' : 'text-red-600'}`}>
                  {qualidadeStr}%
                </p>
                <p className="text-[10px] text-gray-400">Meta: 95.0%</p>
              </div>
              <CheckCircle2 size={28} className={qualidadeNum >= 95 ? 'text-brand-blue/40' : 'text-red-500/40'} />
            </div>
          </div>

          {/* Error Tags Breakdown */}
          {sortedTags.length > 0 && (
            <div className="bg-white/70 border border-gray-200 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Tag size={14} className="text-brand-blue-light" />
                Ofensas por Tag
              </h3>
              <div className="flex flex-wrap gap-2">
                {sortedTags.map(([tag, count]) => (
                  <div key={tag} className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
                    <span className="text-gray-800 font-medium">{tag}:</span>
                    <span className="font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{count} erro(s)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Monitorings Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Histórico de Erros</h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-white text-gray-500 uppercase font-extrabold tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Esteira</th>
                    <th className="py-3 px-3">Tag</th>
                    <th className="py-3 px-3">Motivo Macro</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Data Feedback</th>
                    <th className="py-3 px-3">Plano de Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {effectiveErrorList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                        Nenhum erro encontrado no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    effectiveErrorList.map((item, idx) => {
                      const itemData = getVal(item, 'data') || item.DataMonitoria;
                      const rawEsteiraVal = getVal(item, 'esteira') || item.Esteira;
                      const itemEsteira = getTabuladorName(rawEsteiraVal, esteiraMappings) || rawEsteiraVal || '-';
                      const itemTag = getVal(item, 'tag') || item.Tag || 'Sem Tag';
                      const itemMacro = getVal(item, 'macroTag') || item.MotivoMacro || '-';
                      const itemFeedback = getVal(item, 'dataFeedback') || item.DataFeedback;
                      const itemPlano = getVal(item, 'planoDeAcao') || item.Plano || '-';

                      return (
                        <tr 
                          key={idx} 
                          onClick={() => setSelectedErrorDetail(item)}
                          className="hover:bg-blue-50/70 transition-colors cursor-pointer"
                          title="Clique para ver os detalhes deste registro"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700">{formatDateToBR(itemData)}</td>
                          <td className="py-2.5 px-3 text-gray-800">{itemEsteira}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[11px]">
                              {itemTag}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 text-[11px]">{itemMacro}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-extrabold whitespace-nowrap bg-red-50 text-red-600 border border-red-200">
                              0% • Erro
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-500 font-mono text-[11px]">{formatDateToBR(itemFeedback)}</td>
                          <td className="py-2.5 px-3 text-gray-700 max-w-xs truncate" title={itemPlano}>{itemPlano}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ErrorDetailModal
        item={selectedErrorDetail}
        onClose={() => setSelectedErrorDetail(null)}
      />
    </div>
  );
};
