import React, { useState } from 'react';
import { X, Settings, KeyRound, Clock, RotateCcw, Users, LogOut, PlusCircle, ShieldCheck, Copy, Check } from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';
import { TokenGeneratorModal } from './TokenGeneratorModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { tokenRecord, tokenString, remainingSeconds, renewalsUsed, logout } = useTokenStore();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formatRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expirado';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleCopy = () => {
    if (tokenString) {
      navigator.clipboard.writeText(tokenString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isAdmin = (tokenRecord?.modoVisualizacao || tokenRecord?.modo) === 'admin';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-[#001E62] border border-blue-100">
                <Settings size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
                  Configurações do Sistema
                </h3>
                <p className="text-[11px] text-gray-500">
                  Gerenciamento de sessão, token ativo e permissões
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">

            {/* Active Session Card */}
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#001E62]" />
                  <span className="text-xs font-bold text-[#001E62] uppercase tracking-wider">Sessão Ativa</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isAdmin 
                    ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                    : 'bg-blue-100 text-[#001E62] border border-blue-200'
                }`}>
                  {isAdmin ? 'Modo Admin' : 'Modo Usuário'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-gray-500 text-[11px] block">Token em Uso:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-black text-gray-900 text-sm">{tokenString || '-'}</span>
                    {tokenString && (
                      <button
                        onClick={handleCopy}
                        className="text-gray-400 hover:text-[#001E62] transition-colors p-1"
                        title="Copiar token"
                      >
                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Tempo Restante:</span>
                  <span className="font-mono font-bold text-amber-700 text-sm flex items-center gap-1 mt-0.5">
                    <Clock size={14} />
                    {formatRemaining(remainingSeconds)}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Renovações Utilizadas:</span>
                  <span className="font-bold text-gray-800 text-xs flex items-center gap-1 mt-0.5">
                    <RotateCcw size={13} />
                    {renewalsUsed} / {tokenRecord?.qtdRenovacoes || 0}
                  </span>
                </div>

                <div>
                  <span className="text-gray-500 text-[11px] block">Limite de Usuários:</span>
                  <span className="font-bold text-gray-800 text-xs flex items-center gap-1 mt-0.5">
                    <Users size={13} />
                    Até {tokenRecord?.qtdUsuarios || 1}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Section: Generate Tokens Button */}
            {isAdmin ? (
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                  <KeyRound size={16} />
                  <span>Painel de Administração de Tokens</span>
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Como o seu token possui o modo <strong>Admin</strong>, você tem permissão para gerar novos tokens, definir prazos em minutos, limites de usuários e renovações.
                </p>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white py-2.5 px-4 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md shadow-purple-700/20 active:scale-98 transition-all cursor-pointer"
                >
                  <PlusCircle size={16} />
                  <span>Abrir Gerador de Tokens</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 text-[11px] text-gray-500 leading-relaxed">
                A geração de novos tokens é restrita a usuários com token em modo <strong>Admin</strong>.
              </div>
            )}

            {/* Logout Action */}
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 py-2 px-3 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={15} />
                <span>Encerrar Sessão Ativa</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Generator Modal Child */}
      <TokenGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />
    </>
  );
};
