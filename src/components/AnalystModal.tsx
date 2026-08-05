import React from 'react';
import { X, User, AlertTriangle, CheckCircle2, FileText, TrendingUp, Calendar, Tag } from 'lucide-react';
import { useStore, getTabuladorName } from '../store/useStore';

interface AnalystModalProps {
  analystCode: string | null;
  analystName: string | null;
  onClose: () => void;
}

export const AnalystModal: React.FC<AnalystModalProps> = ({ analystCode, analystName, onClose }) => {
  const { data, esteiraMappings, startDate, endDate } = useStore();

  if (!analystCode && !analystName) return null;

  // Find all records for this analyst within date range or overall
  const analystItems = data.filter(i => {
    if (startDate && i.DataMonitoria < startDate) return false;
    if (endDate && i.DataMonitoria > endDate) return false;

    const matchCode = analystCode && i.CodigoAnalista === analystCode;
    const matchName = analystName && i.NomeAnalista?.toUpperCase() === analystName.toUpperCase();
    return matchCode || matchName;
  }).sort((a, b) => b.DataMonitoria.localeCompare(a.DataMonitoria));

  const totalMonitorias = analystItems.length;
  const isErrorItem = (item: typeof data[0]) => {
    const errStr = (item.Erro || '').toString().trim().toLowerCase();
    return errStr === '0' || errStr === 'erro' || errStr === 'reprovado' || errStr === 'nc' || errStr === 'n/c' || errStr === 'nok';
  };

  const totalErros = analystItems.filter(i => isErrorItem(i)).length;
  const qualidadeNum = totalMonitorias > 0 ? ((totalMonitorias - totalErros) / totalMonitorias) * 100 : 100;
  const qualidadeStr = qualidadeNum.toFixed(1);

  // Tag frequency breakdown
  const tagBreakdown: Record<string, number> = {};
  analystItems.filter(i => isErrorItem(i)).forEach(i => {
    const t = i.Tag || 'Geral';
    tagBreakdown[t] = (tagBreakdown[t] || 0) + 1;
  });

  const sortedTags = Object.entries(tagBreakdown).sort((a, b) => b[1] - a[1]);
  const primarySupervisor = analystItems[0]?.NomeSupervisor || analystItems[0]?.Supervisor || 'Não informado';
  const primaryEsteira = getTabuladorName(analystItems[0]?.Esteira || '', esteiraMappings) || 'Geral';
  const nameDisplay = analystName || analystItems[0]?.NomeAnalista || 'Analista';
  const codeDisplay = analystCode || analystItems[0]?.CodigoAnalista || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-gray-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
                <span>Supervisor: {primarySupervisor}</span>
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
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {analystItems.filter(isErrorItem).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                        Nenhum erro encontrado no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    analystItems.filter(isErrorItem).map((item, idx) => {
                      const isErr = isErrorItem(item);
                      return (
                        <tr key={idx} className="hover:bg-gray-100/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700">{item.DataMonitoria}</td>
                          <td className="py-2.5 px-3 text-gray-800">{getTabuladorName(item.Esteira, esteiraMappings)}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[11px]">
                              {item.Tag || 'Geral'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 text-[11px]">{item.MotivoMacro || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isErr ? 'bg-red-500/20 text-red-600 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                            }`}>
                              {isErr ? '0% Erro' : '100% OK'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-500 font-mono text-[11px]">{item.DataFeedback || '-'}</td>
                          <td className="py-2.5 px-3 text-gray-700 max-w-xs truncate" title={item.Plano || ''}>{item.Plano || '-'}</td>
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
    </div>
  );
};
