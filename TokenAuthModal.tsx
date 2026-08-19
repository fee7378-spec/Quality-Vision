import React, { useState } from 'react';
import { KeyRound, ShieldAlert, RefreshCw, LogOut, CheckCircle2, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';

export const TokenAuthModal: React.FC = () => {
  const { 
    isLoggedIn, 
    isExpired, 
    tokenRecord, 
    tokenString,
    renewalsUsed, 
    loginWithToken, 
    renewToken, 
    logout, 
    isLoading 
  } = useTokenStore();

  const [inputToken, setInputToken] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  // If logged in and NOT expired, do not show modal
  if (isLoggedIn && !isExpired) {
    return null;
  }

  const handleValidateInput = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorText(null);
    setSuccessText(null);

    if (!inputToken.trim()) {
      setErrorText('Por favor, informe o token de acesso.');
      return;
    }

    const res = await loginWithToken(inputToken.trim());
    if (res.success) {
      setSuccessText(res.message);
      setInputToken('');
    } else {
      setErrorText(res.message);
    }
  };

  const handleRenewSession = async () => {
    setErrorText(null);
    setSuccessText(null);

    const res = await renewToken();
    if (res.success) {
      setSuccessText('Sessão renovada com sucesso!');
    } else {
      setErrorText(res.message);
    }
  };

  const maxRenovacoes = tokenRecord?.qtdRenovacoes || 0;
  const isRenovacaoPermitida = Boolean(tokenRecord?.renovacao) && renewalsUsed < maxRenovacoes;
  const renovacoesRestantes = Math.max(0, maxRenovacoes - renewalsUsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header decoration bar */}
        <div className="h-2 bg-gradient-to-r from-[#001E62] via-blue-600 to-[#001E62]" />

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Top Icon and Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#001E62] border border-blue-100 shadow-sm mb-1">
              {isExpired ? (
                <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
              ) : (
                <KeyRound className="w-7 h-7 text-[#001E62]" />
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {isExpired ? 'Sua Sessão Expirou!' : 'Autenticação por Token'}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
              {isExpired 
                ? 'O tempo de validade do seu token terminou. Renove sua sessão ou informe um novo token.' 
                : 'Insira o token de acesso para utilizar o sistema de monitoria e relatórios.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorText && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-150">
              <AlertCircle size={16} className="flex-shrink-0 text-red-600 mt-0.5" />
              <span className="font-medium leading-snug">{errorText}</span>
            </div>
          )}

          {successText && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-150">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600 mt-0.5" />
              <span className="font-bold leading-snug">{successText}</span>
            </div>
          )}

          {/* EXPIRED TOKEN RENEWAL BLOCK */}
          {isExpired && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-900 font-bold uppercase tracking-wider text-[11px]">Token Atual:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-black text-amber-900">
                  {tokenString}
                </span>
              </div>

              {isRenovacaoPermitida ? (
                <div className="space-y-2 pt-1 border-t border-amber-200/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-800 font-medium">Renovações Permitidas:</span>
                    <span className="font-extrabold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-full">
                      {renovacoesRestantes} restante(s)
                    </span>
                  </div>
                  <button
                    onClick={handleRenewSession}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Renovando...' : 'Renovar Sessão Agora'}
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-600 flex-shrink-0" />
                  <span>Este token não possui renovações disponíveis. Por favor, utilize um novo token.</span>
                </div>
              )}
            </div>
          )}

          {/* TOKEN INPUT FORM */}
          <form onSubmit={handleValidateInput} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {isExpired ? 'Inserir Novo Token:' : 'Token de Acesso:'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Ex: TK-8A2F9B"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono text-gray-900 font-bold uppercase placeholder:text-gray-400 placeholder:font-normal placeholder:normal-case outline-none focus:border-[#001E62] focus:bg-white focus:ring-2 focus:ring-[#001E62]/10 transition-all"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputToken.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#001E62] hover:bg-[#001648] text-white py-3 px-5 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#001E62]/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Validando Token...</span>
                </>
              ) : (
                <>
                  <span>Validar e Acessar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Logout option if expired */}
          {isExpired && (
            <div className="text-center pt-2 border-t border-gray-100">
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Encerrar sessão e sair</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
