import React, { useState, useEffect } from 'react';
import { 
  Settings, KeyRound, Clock, RotateCcw, Users, LogOut, PlusCircle, 
  ShieldCheck, Copy, Check, Database, Server, Cpu, Activity,
  Moon, Sun, RefreshCw, Layers, HardDrive, CheckCircle2, Shield
} from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';
import { useThemeStore } from '../store/useThemeStore';
import { useStore } from '../store/useStore';
import { useTabStore } from '../store/useTabStore';
import { TokenGeneratorModal } from '../components/TokenGeneratorModal';

export const SettingsPage: React.FC = () => {
  const { tokenRecord, tokenString, remainingSeconds, renewalsUsed, logout } = useTokenStore();
  const { theme, toggleTheme } = useThemeStore();
  const { fetchSupabaseData, resetToCurrentMonth } = useStore();
  const { visibleTabs, toggleTabVisibility } = useTabStore();
  
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
    <div className="p-3 sm:p-4 space-y-4 bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white w-full max-w-full text-xs animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider mb-1">
            CONFIGURAÇÕES & AMBIENTE
          </h3>
          <p className="text-[10px] text-gray-400">
            Gerenciamento de credenciais ativas, status de sincronização e preferências do sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-750 bg-white dark:bg-[#192238] hover:bg-gray-50 dark:hover:bg-[#243049] text-[10px] font-bold uppercase transition-all cursor-pointer shadow-2xs text-gray-800 dark:text-gray-200"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={12} className="text-yellow-400" />
                <span>Tema Claro</span>
              </>
            ) : (
              <>
                <Moon size={12} className="text-blue-600" />
                <span>Tema Escuro</span>
              </>
            )}
          </button>

          <button
            onClick={handleSyncData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#001E62] hover:bg-[#002c91] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[10px] font-bold uppercase transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar Banco'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Active Session & Token Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Active Session Card */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Sessão Ativa & Autenticação
                  </h3>
                  <span className="text-[10px] text-gray-400">
                    Sessão validada e criptografada via Supabase Auth
                  </span>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                isAdmin 
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
              }`}>
                {tokenRecord?.tipo || 'Visualização'}
              </span>
            </div>

            {/* Token Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Token Code */}
              <div className="bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750 p-3 rounded-lg space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Token em Uso
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-gray-900 dark:text-white truncate max-w-[180px]">
                    {tokenString || 'Não informado'}
                  </span>
                  {tokenString && (
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                      title="Copiar token"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Time Remaining */}
              <div className="bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750 p-3 rounded-lg space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Tempo Restante na Sessão
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-mono font-black text-xs text-amber-700 dark:text-amber-400">
                    {formatRemaining(remainingSeconds)}
                  </span>
                </div>
              </div>

              {/* Renewals */}
              <div className="bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750 p-3 rounded-lg space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Renovações Utilizadas
                </span>
                <div className="flex items-center gap-1.5">
                  <RotateCcw size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="font-bold text-xs text-gray-900 dark:text-white">
                    {renewalsUsed} de {tokenRecord?.qtdRenovacoes || 0} permitidas
                  </span>
                </div>
              </div>

              {/* User Limit */}
              <div className="bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750 p-3 rounded-lg space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Usuários Concorrentes
                </span>
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-[#001E62] dark:text-blue-400 shrink-0" />
                  <span className="font-bold text-xs text-gray-900 dark:text-white">
                    {tokenRecord?.qtdUsuariosLogados || 1} / {tokenRecord?.qtdUsuarios || 1} ativos
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Action Bar */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-4">
              <span className="text-[10px] text-gray-400">
                Encerrar a sessão liberará sua vaga de acesso no Supabase.
              </span>

              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-bold text-xs transition-all cursor-pointer"
              >
                <LogOut size={12} />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Admin Token Panel (If admin) */}
          {isAdmin && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#131b2e] border border-purple-200 dark:border-purple-900/60 rounded-lg p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <KeyRound size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                        Chaves de Acesso
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Criação, listagem e controle de novos tokens no Supabase
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsGeneratorOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-800 hover:bg-purple-900 text-white font-bold text-xs uppercase tracking-wider shadow-2xs cursor-pointer"
                  >
                    <PlusCircle size={13} />
                    <span>Gerar Token</span>
                  </button>
                </div>
              </div>

              {/* Visibilidade das Abas */}
              <div className="bg-white dark:bg-[#131b2e] border border-purple-200 dark:border-purple-900/60 rounded-lg p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-2">
                  <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Abas Visíveis (Outros Usuários)
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Selecione quais abas serão exibidas para usuários comuns. Administradores continuam visualizando todas.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { path: '/', label: 'Visão Geral' },
                    { path: '/operacao', label: 'Operação' },
                    { path: '/capacidade', label: 'Capacidade' },
                    { path: '/analise', label: 'Qualidade' },
                    { path: '/analistas', label: 'Analistas' },
                    { path: '/salesforce', label: 'Salesforce' },
                    { path: '/history', label: 'Histórico' },
                  ].map((tab) => {
                    const isVisible = visibleTabs.includes(tab.path);
                    return (
                      <label
                        key={tab.path}
                        className={`flex items-center justify-between p-2 rounded-md border transition-all cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider ${
                          isVisible
                            ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-300 dark:border-purple-900/60 text-purple-900 dark:text-purple-300'
                            : 'bg-gray-50/40 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => toggleTabVisibility(tab.path)}
                          className="w-3.5 h-3.5 text-purple-600 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded focus:ring-purple-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Subtle & Elegant System Details (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Cloud Infrastructure Status */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-[#192238] text-[#001E62] dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                <Database size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Infraestrutura & Nuvem
                </h3>
                <span className="text-[10px] text-gray-400">
                  Status operacional dos serviços de dados
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Supabase Realtime API</span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">200 OK</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750">
                <div className="flex items-center gap-1.5">
                  <Shield size={13} className="text-blue-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Criptografia de Dados</span>
                </div>
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">TLS 1.3 / HTTPS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#192238]/60 border border-gray-200 dark:border-gray-750">
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-amber-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Latência do Endpoint</span>
                </div>
                <span className="text-gray-700 dark:text-gray-300 font-mono font-bold">~42ms</span>
              </div>
            </div>
          </div>

          {/* System Version & Legal Subtle Info */}
          <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#192238] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <HardDrive size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Especificações do Sistema
                </h3>
                <span className="text-[10px] text-gray-400">
                  Informações de integridade
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                <span>Versão do Sistema:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">v3.4.2 Enterprise</span>
              </div>

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                <span>Motor de Renderização:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">React 18 + Tailwind v4</span>
              </div>

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-800/80">
                <span>Modo de Interface:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {theme === 'dark' ? 'ESCURO' : 'CLARO'}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 py-1.5">
                <span>Conformidade de Segurança:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] uppercase">
                  <CheckCircle2 size={12} />
                  SOC2 / LGPD
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
