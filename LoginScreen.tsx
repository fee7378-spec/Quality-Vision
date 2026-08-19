import React, { useState } from 'react';
import { KeyRound, ShieldAlert, RefreshCw, LogOut, CheckCircle2, AlertCircle, ArrowRight, Clock, ShieldCheck, Lock } from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';

export const LoginScreen: React.FC = () => {
  const { 
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
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Decorative ambient background lights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#001E62]/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Box */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
        
        {/* Brand Header Bar */}
        <div className="bg-[#001E62] px-8 py-7 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="inline-flex items-center justify-center p-3.5 bg-white/10 rounded-2xl backdrop-blur-md mb-3 border border-white/15 shadow-inner">
            {isExpired ? (
              <Clock className="w-8 h-8 text-amber-300 animate-pulse" />
            ) : (
              <Lock className="w-8 h-8 text-blue-200" />
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            Portal Analytics
          </h1>
          <p className="text-xs text-blue-100/80 mt-1 font-medium">
            {isExpired ? 'Sua sessão por token expirou' : 'Autenticação e Controle de Acesso'}
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* Feedback Alerts */}
          {errorText && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-150">
              <AlertCircle size={16} className="flex-shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold leading-snug">{errorText}</span>
            </div>
          )}

          {successText && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 duration-150">
              <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-600 mt-0.5" />
              <span className="font-bold leading-snug">{successText}</span>
            </div>
          )}

          {/* EXPIRED TOKEN BLOCK */}
          {isExpired && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-900 font-bold uppercase tracking-wider text-[11px]">Token Atual:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 font-black text-amber-900">
                  {tokenString}
                </span>
              </div>

              {isRenovacaoPermitida ? (
                <div className="space-y-2 pt-2 border-t border-amber-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-800 font-medium">Renovações Disponíveis:</span>
                    <span className="font-extrabold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                      {renovacoesRestantes} restante(s)
                    </span>
                  </div>
                  <button
                    onClick={handleRenewSession}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Renovando...' : 'Renovar Sessão'}
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-amber-200 text-[11px] text-amber-800 font-medium flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-amber-600 flex-shrink-0" />
                  <span>Renovações esgotadas para este token. Insira um novo token abaixo.</span>
                </div>
              )}
            </div>
          )}

          {/* FORM INPUT FOR TOKEN */}
          <form onSubmit={handleValidateInput} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                {isExpired ? 'OU INSIRA UM NOVO TOKEN:' : 'TOKEN DE ACESSO:'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Ex: TK-7F8A2B3C4D5E6F7A8B9C0D1E2F3A4B5C"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3.5 text-base font-mono text-gray-900 font-bold placeholder:text-gray-400 placeholder:font-normal placeholder:normal-case outline-none focus:border-[#001E62] focus:bg-white focus:ring-2 focus:ring-[#001E62]/10 transition-all shadow-2xs"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                O token é validado diretamente no banco de dados e define a duração do seu acesso.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputToken.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#001E62] hover:bg-[#001648] text-white py-3.5 px-5 rounded-xl font-black text-xs tracking-wider uppercase shadow-xl shadow-[#001E62]/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Acessar Sistema</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Logout Option if expired */}
          {isExpired && (
            <div className="text-center pt-2 border-t border-gray-100">
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Encerrar e sair</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-center">
          <p className="text-[10px] text-gray-400 font-medium flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>Acesso Restrito & Protected By Supabase Token Auth</span>
          </p>
        </div>

      </div>
    </div>
  );
};
