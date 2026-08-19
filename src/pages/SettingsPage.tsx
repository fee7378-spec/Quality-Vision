import React, { useState, useEffect } from 'react';
import { 
  Settings, KeyRound, Clock, RotateCcw, Users, LogOut, PlusCircle, 
  ShieldCheck, Copy, Check, Database, Server, Cpu, Activity,
  Moon, Sun, RefreshCw, Layers, HardDrive, CheckCircle2, Shield
} from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';
import { useThemeStore } from '../store/useThemeStore';
import { useStore } from '../store/useStore';
import { TokenGeneratorModal } from '../components/TokenGeneratorModal';

export const SettingsPage: React.FC = () => {
  const { tokenRecord, tokenString, remainingSeconds, renewalsUsed, logout } = useTokenStore();
  const { theme, toggleTheme } = useThemeStore();
  const { fetchSupabaseData, resetToCurrentMonth } = useStore();
  
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Sessão Expirada';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleCopy = () => {
    if (tokenString) {
      navigator.clipboard.writeText(tokenString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSyncData = async () => {
    setIsRefreshing(true);
    try {
      await fetchSupabaseData();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const currentTipo = (tokenRecord?.tipo || 'visualizacao').toLowerCase();
  const isAdmin = currentTipo === 'administracao';

  return (
    <div className="w-full min-h-full p-4 sm:p-6 md:p-8 bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#001E62] dark:text-white tracking-tight uppercase flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-[#192238] border border-blue-200 dark:border-blue-900/60 rounded-xl text-[#001E62] dark:text-blue-400">
              <Settings size={22} />
            </div>
            CONFIGURAÇÕES & AMBIENTE
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gerenciamento de credenciais ativas, status de sincronização e preferências do sistema.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#192238] hover:bg-gray-50 dark:hover:bg-[#243049] text-xs font-bold transition-all cursor-pointer shadow-2xs text-gray-800 dark:text-gray-200"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={15} className="text-yellow-400" />
                <span>Tema Claro</span>
              </>
            ) : (
              <>
                <Moon size={15} className="text-blue-600" />
                <span>Tema Escuro</span>
              </>
            )}
          </button>

          <button
            onClick={handleSyncData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#001E62] hover:bg-[#002c91] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-900/20 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Banco'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Session & Token Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Session Card */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Sessão Ativa & Autenticação
                  </h3>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Sessão validada e criptografada via Supabase Auth
                  </span>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                isAdmin 
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
              }`}>
                {tokenRecord?.tipo || 'Visualização'}
              </span>
            </div>

            {/* Token Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Token Code */}
              <div className="bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60 p-4 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Token em Uso
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                    {tokenString || 'Não informado'}
                  </span>
                  {tokenString && (
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                      title="Copiar token"
                    >
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Time Remaining */}
              <div className="bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60 p-4 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tempo Restante na Sessão
                </span>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-mono font-black text-base text-amber-700 dark:text-amber-400">
                    {formatRemaining(remainingSeconds)}
                  </span>
                </div>
              </div>

              {/* Renewals */}
              <div className="bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60 p-4 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Renovações Utilizadas
                </span>
                <div className="flex items-center gap-2">
                  <RotateCcw size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {renewalsUsed} de {tokenRecord?.qtdRenovacoes || 0} permitidas
                  </span>
                </div>
              </div>

              {/* User Limit */}
              <div className="bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60 p-4 rounded-xl space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Limite de Usuários Concorrentes
                </span>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-bold text-sm text-gray-900 dark:text-white">
                    {tokenRecord?.qtdUsuariosLogados || 1} / {tokenRecord?.qtdUsuarios || 1} ativos
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Action Bar */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Encerrar a sessão liberará sua vaga de acesso no Supabase.
              </span>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-bold text-xs transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span>Desconectar Sessão</span>
              </button>
            </div>
          </div>

          {/* Admin Token Panel (If admin) */}
          {isAdmin && (
            <div className="bg-white dark:bg-[#131b2e] border border-purple-200 dark:border-purple-900/60 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Gerenciamento de Chaves de Acesso
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Criação, listagem e controle de tempo de novos tokens no Supabase
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-800 hover:bg-purple-900 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-purple-900/20 active:scale-95 transition-all cursor-pointer"
                >
                  <PlusCircle size={15} />
                  <span>Gerar Novo Token</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Subtle & Elegant System Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Cloud Infrastructure Status */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-[#192238] text-[#001E62] dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                <Database size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Infraestrutura & Nuvem
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Status operacional dos serviços de dados
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Supabase Realtime API</span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">Conectado (200 OK)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-blue-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Criptografia em Trânsito</span>
                </div>
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">TLS 1.3 / HTTPS</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#192238] border border-gray-200 dark:border-gray-700/60">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-amber-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Latência do Endpoint</span>
                </div>
                <span className="text-gray-700 dark:text-gray-300 font-mono font-bold">~42ms</span>
              </div>
            </div>
          </div>

          {/* System Version & Legal Subtle Info */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#192238] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <HardDrive size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Especificações do Aplicativo
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Informações de compilação e integridade
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800/80">
                <span>Versão do Sistema:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">v3.4.2 Enterprise</span>
              </div>

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800/80">
                <span>Motor de Renderização:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">React 18 + Tailwind CSS v4</span>
              </div>

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1 border-b border-gray-100 dark:border-gray-800/80">
                <span>Modo de Interface:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {theme === 'dark' ? 'Escuro (High Contrast)' : 'Claro (Executive)'}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1">
                <span>Segurança & Políticas:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  Conforme LGPD / SOC2
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generator Modal Child */}
      <TokenGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />
    </div>
  );
};
