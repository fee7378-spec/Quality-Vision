import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  AlertCircle, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';

export const AuthScreen: React.FC = () => {
  const { loginWithToken, isLoading } = useTokenStore();
  const [tokenInput, setTokenInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tokenInput.trim()) {
      setErrorMsg('Por favor, informe o seu token de acesso.');
      return;
    }

    const res = await loginWithToken(tokenInput);
    if (!res.success) {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background Decorative Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Header */}
        <div className="bg-[#001E62] px-8 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck size={160} />
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <KeyRound size={24} className="text-blue-200" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 block">
                Controle de Acesso & Segurança
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                Autenticação por Token
              </h1>
            </div>
          </div>

          <p className="text-xs text-blue-100/80 leading-relaxed font-medium">
            Insira o seu token de acesso cadastrado para autenticar no sistema. As permissões do seu perfil serão identificadas automaticamente.
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-6">
          
          {/* Single Token Input Step */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
              <span>Informe o Token de Acesso:</span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type="text"
                autoFocus
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Ex: aK8mP2xQ91LsZ7nB4vTc6YwR3dEfG5hJ"
                className="w-full bg-gray-50 border border-gray-300 focus:border-[#001E62] focus:bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm font-mono font-bold text-gray-900 placeholder:text-gray-400 outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {errorMsg}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#001E62] hover:bg-[#001648] text-white py-3.5 px-6 rounded-2xl font-extrabold text-xs tracking-wider uppercase shadow-xl shadow-[#001E62]/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Validando Token no Supabase...</span>
              </>
            ) : (
              <>
                <span>Acessar Plataforma</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

        </form>

        {/* Footer info */}
        <div className="bg-gray-50 border-t border-gray-100 px-8 py-3.5 text-center text-[10px] text-gray-400 font-semibold">
          Autenticação com Validação Interna de Perfil
        </div>

      </div>
    </div>
  );
};
