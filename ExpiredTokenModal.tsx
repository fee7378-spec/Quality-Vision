import React, { useState } from 'react';
import { 
  AlertTriangle, 
  KeyRound, 
  RotateCcw, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useTokenStore, AccessType } from '../store/useTokenStore';

export const ExpiredTokenModal: React.FC = () => {
  const { 
    isExpired, 
    tokenRecord, 
    renewToken, 
    loginWithToken, 
    isLoading 
  } = useTokenStore();

  const [newTokenInput, setNewTokenInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  if (!isExpired) return null;

  // Renewal eligibility check
  const isRenovacaoPermitida = Boolean(tokenRecord?.renovacao);
  const renovacoesUtilizadas = Number(tokenRecord?.renovacoesUtilizadas || 0);
  const qtdRenovacoes = Number(tokenRecord?.qtdRenovacoes || 0);
  const temRenovacaoDisponivel = isRenovacaoPermitida && (renovacoesUtilizadas < qtdRenovacoes);

  const handleRenew = async () => {
    setFeedback(null);
    const res = await renewToken();
    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  const handleNewTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!newTokenInput.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor, informe o novo token.',
      });
      return;
    }

    const res = await loginWithToken(newTokenInput);
    if (!res.success) {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/85 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-amber-600 px-6 py-6 text-white flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white">
            <AlertTriangle size={28} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-100 block">
              Sessão Expirada
            </span>
            <h2 className="text-lg font-black tracking-tight uppercase">
              Validade do Token Atingida
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-gray-600 leading-relaxed">
            O tempo de validade do seu token atual expirou. Para continuar utilizando a plataforma, renove a sessão (caso haja renovações disponíveis) ou insira um novo token válido.
          </p>

          {/* Feedback message */}
          {feedback && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : feedback.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : feedback.type === 'info' ? (
                <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{feedback.message}</div>
            </div>
          )}

          {/* Renewal Section */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={15} />
                Renovação do Token Atual
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-800">
                {renovacoesUtilizadas} / {qtdRenovacoes} renovações
              </span>
            </div>

            <p className="text-[11px] text-amber-800/80 leading-relaxed">
              {!isRenovacaoPermitida ? (
                'Este token não possui permissão para renovação.'
              ) : !temRenovacaoDisponivel ? (
                'Todas as renovações disponíveis para este token já foram utilizadas.'
              ) : (
                'Você pode estender o prazo de utilização deste token utilizando uma renovação disponível.'
              )}
            </p>

            <button
              type="button"
              disabled={!temRenovacaoDisponivel || isLoading}
              onClick={handleRenew}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              <span>
                {temRenovacaoDisponivel ? 'Renovar Token Atual' : 'Renovação Indisponível'}
              </span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 absolute">
              OU INFORME UM NOVO TOKEN
            </span>
          </div>

          {/* Form to enter new token */}
          <form onSubmit={handleNewTokenLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700 uppercase">Novo Token de Acesso:</label>
              <input
                type="text"
                value={newTokenInput}
                onChange={(e) => setNewTokenInput(e.target.value)}
                placeholder="Cole o novo token..."
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-gray-900 outline-none focus:border-[#001E62]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#001E62] hover:bg-[#001648] text-white py-3 px-4 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              <span>Entrar com Novo Token</span>
            </button>

          </form>

        </div>
      </div>
    </div>
  );
};
