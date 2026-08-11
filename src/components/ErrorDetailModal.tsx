import React from 'react';
import { AlertTriangle, X, Calendar, User, Shield, CheckCircle2 } from 'lucide-react';
import { MonitoringItem, useStore, getTabuladorName } from '../store/useStore';

interface ErrorDetailModalProps {
  item: MonitoringItem | null;
  onClose: () => void;
}

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({ item, onClose }) => {
  const { esteiraMappings } = useStore();

  if (!item) return null;

  const formatDateBR = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const isError = item.Erro === '0' || Number(item.Erro) === 0 || item.Erro === '0%';
  const esteiraLabel = getTabuladorName(item.Esteira, esteiraMappings);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#001E62] text-white p-4 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isError ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              <AlertTriangle className={isError ? 'text-amber-400' : 'text-emerald-400'} size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">Detalhes do Registro</h3>
              <p className="text-[11px] text-blue-200 flex items-center gap-1 mt-0.5">
                <Calendar size={12} />
                Monitoria em {formatDateBR(item.DataMonitoria)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white transition-colors cursor-pointer"
            title="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 text-xs text-gray-800 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Analyst & Code */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Analista Avaliado</p>
              <p className="text-sm font-extrabold text-gray-900 mt-0.5">{item.NomeAnalista}</p>
              <p className="text-[11px] font-mono text-gray-500">Matrícula/Código: {item.CodigoAnalista || '-'}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs whitespace-nowrap ${
                isError 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}>
                {isError ? '0% (Inconformidade / Erro)' : '100% (Conforme / OK)'}
              </span>
            </div>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Supervisor / Gestor</p>
              <p className="font-bold text-gray-800 mt-0.5">{item.NomeSupervisor || '-'}</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Monitor / Avaliador</p>
              <p className="font-bold text-gray-800 mt-0.5">{item.NomeMonitor || '-'}</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Esteira / Processo</p>
              <p className="font-bold text-gray-800 mt-0.5">{esteiraLabel}</p>
            </div>
          </div>

          {/* Inconsistência & Causa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
              <p className="text-[10px] text-[#001E62] font-extrabold uppercase">Inconsistência / TAG</p>
              <p className="font-extrabold text-[#001E62] text-xs mt-1">{item.Tag || 'Sem Tag'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Motivo Causa / Macro</p>
              <p className="font-semibold text-gray-800 text-xs mt-1">{item.MotivoMacro || '-'}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Forma de Monitoria</p>
              <p className="font-semibold text-gray-800 text-xs mt-1">{item.FormaMonitoria || '-'}</p>
            </div>
          </div>

          {/* Data Feedback */}
          {item.DataFeedback && (
            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-800 font-bold uppercase">Data do Feedback Aplicado</p>
                <p className="text-xs font-bold text-emerald-900 mt-0.5">{formatDateBR(item.DataFeedback)}</p>
              </div>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
          )}

          {/* Plano de Ação */}
          <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-amber-900 font-extrabold uppercase text-[10px] tracking-wider">
                Plano de Ação Registrado
              </p>
              {item.DataPlano && (
                <span className="text-[10px] text-amber-800 font-bold">
                  Data do Plano: {formatDateBR(item.DataPlano)}
                </span>
              )}
            </div>
            <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
              {item.Plano || 'Nenhum plano de ação detalhado registrado para esta monitoria.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-3.5 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#001E62] text-white rounded-xl font-bold text-xs hover:bg-blue-900 transition-colors cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
