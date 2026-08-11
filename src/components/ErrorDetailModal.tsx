import React from 'react';
import { AlertTriangle, X, Calendar, User, Shield, CheckCircle2 } from 'lucide-react';
import { useStore, getTabuladorName } from '../store/useStore';

interface ErrorDetailModalProps {
  item: any;
  onClose: () => void;
}

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({ item, onClose }) => {
  const { esteiraMappings } = useStore();

  if (!item) return null;

  const getVal = (obj: any, key: string) => {
    if (!obj) return undefined;
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return found ? obj[found] : undefined;
  };

  const formatDateBR = (dateStr: string | undefined): string => {
    if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '' || dateStr.trim().toLowerCase() === 'null') return '-';
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

  const isError = true; // Modal is opened for registered errors
  const rawEsteira = getVal(item, 'esteira') || item.Esteira || '';
  const esteiraLabel = getTabuladorName(rawEsteira, esteiraMappings) || rawEsteira || '-';

  const nomeAnalista = getVal(item, 'analista') || item.NomeAnalista || 'Analista';
  const codAnalista = getVal(item, 'codAnalista') || item.CodigoAnalista || '-';
  const supervisor = getVal(item, 'supervisor') || item.NomeSupervisor || '-';
  const monitor = getVal(item, 'monitor') || item.NomeMonitor || '-';
  const tag = getVal(item, 'tag') || item.Tag || 'Sem Tag';
  const macroTag = getVal(item, 'macroTag') || item.MotivoMacro || '-';
  const forma = getVal(item, 'forma') || item.FormaMonitoria || '-';
  const dataMonitoria = getVal(item, 'data') || item.DataMonitoria || '-';
  const dataFeedback = getVal(item, 'dataFeedback') || item.DataFeedback;
  const planoDeAcao = getVal(item, 'planoDeAcao') || item.Plano || item.plano;
  const dataPlano = getVal(item, 'dataPlano') || item.DataPlano;

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
              <h3 className="text-sm font-bold uppercase tracking-wide">Detalhes do Registro de Erro</h3>
              <p className="text-[11px] text-blue-200 flex items-center gap-1 mt-0.5">
                <Calendar size={12} />
                Monitoria em {formatDateBR(dataMonitoria)}
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
              <p className="text-sm font-extrabold text-gray-900 mt-0.5">{nomeAnalista}</p>
              <p className="text-[11px] font-mono text-gray-500">Matrícula/Código: {codAnalista}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs whitespace-nowrap bg-red-100 text-red-700 border border-red-300">
                Inconformidade / Erro
              </span>
            </div>
          </div>

          {/* Grid Metadata: Supervisor, Monitor, Esteira */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Supervisor</p>
              <p className="font-bold text-gray-800 mt-0.5">{supervisor}</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Monitor</p>
              <p className="font-bold text-gray-800 mt-0.5">{monitor}</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Esteira</p>
              <p className="font-bold text-gray-800 mt-0.5">{esteiraLabel}</p>
            </div>
          </div>

          {/* Inconsistência & Causa: Tag, Motivo Macro, Forma */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
              <p className="text-[10px] text-[#001E62] font-extrabold uppercase">Inconsistência / TAG</p>
              <p className="font-extrabold text-[#001E62] text-xs mt-1">{tag}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Motivo Causa / Macro</p>
              <p className="font-semibold text-gray-800 text-xs mt-1">{macroTag}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl">
              <p className="text-[10px] text-gray-500 font-bold uppercase">Forma de Monitoria</p>
              <p className="font-semibold text-gray-800 text-xs mt-1">{forma}</p>
            </div>
          </div>

          {/* Data Feedback */}
          {dataFeedback && String(dataFeedback).trim() !== '' && String(dataFeedback).toLowerCase() !== 'null' && (
            <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-800 font-bold uppercase">Data do Feedback Aplicado</p>
                <p className="text-xs font-bold text-emerald-900 mt-0.5">{formatDateBR(dataFeedback)}</p>
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
              {dataPlano && String(dataPlano).trim() !== '' && (
                <span className="text-[10px] text-amber-800 font-bold">
                  Data do Plano: {formatDateBR(dataPlano)}
                </span>
              )}
            </div>
            <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-wrap font-medium">
              {planoDeAcao && String(planoDeAcao).trim() !== '' && String(planoDeAcao).toLowerCase() !== 'null'
                ? planoDeAcao
                : 'Nenhum plano de ação detalhado registrado para este erro.'}
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
