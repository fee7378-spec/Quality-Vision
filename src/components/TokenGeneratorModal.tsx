import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Copy, 
  Check, 
  RefreshCw, 
  Plus, 
  Users, 
  Clock, 
  RotateCcw, 
  ShieldCheck, 
  Database,
  Info
} from 'lucide-react';
import { useTokenStore } from '../store/useTokenStore';
import { supabase, TokenRecord } from '../lib/supabase';

interface TokenGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TokenGeneratorModal: React.FC<TokenGeneratorModalProps> = ({ isOpen, onClose }) => {
  const { generateToken } = useTokenStore();

  const [activeTab, setActiveTab] = useState<'generate' | 'list'>('generate');

  // Form State
  const [modoVisualizacao, setModoVisualizacao] = useState<'admin' | 'usuario'>('usuario');
  const [minutos, setMinutos] = useState<number>(60); // default 60 min (1h)
  const [renovacao, setRenovacao] = useState<boolean>(true);
  const [qtdRenovacoes, setQtdRenovacoes] = useState<number>(1);
  const [qtdUsuarios, setQtdUsuarios] = useState<number>(5);

  // Auto-generated Token
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tokens List
  const [tokensList, setTokensList] = useState<TokenRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);

  // Helper to generate a new random code (32 characters total: 'TK-' + 29 chars)
  const regenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomStr = '';
    for (let i = 0; i < 29; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `TK-${randomStr}`; // 32 characters long
    setGeneratedCode(code);
    setCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      regenerateCode();
      fetchTokensList();
    }
  }, [isOpen]);

  const fetchTokensList = async () => {
    setIsLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('token', { ascending: true });

      if (!error && data) {
        setTokensList(data as TokenRecord[]);
      }
    } catch (e) {
      console.error('Failed to fetch tokens list', e);
    } finally {
      setIsLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMinutosChange = (val: number) => {
    // Clamp to 1..300 min (max 5h = 300m)
    const clamped = Math.min(300, Math.max(1, val));
    setMinutos(clamped);
  };

  const handleQtdUsuariosChange = (val: number) => {
    // Clamp to 1..25
    const clamped = Math.min(25, Math.max(1, val));
    setQtdUsuarios(clamped);
  };

  const handleQtdRenovacoesChange = (val: number) => {
    // Clamp to 0..3
    const clamped = Math.min(3, Math.max(0, val));
    setQtdRenovacoes(clamped);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const res = await generateToken({
      modoVisualizacao,
      minutos,
      renovacao,
      qtdRenovacoes: renovacao ? qtdRenovacoes : 0,
      qtdUsuarios,
      customToken: generatedCode,
    });

    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Token ${res.token} criado e salvo com sucesso!`,
      });
      fetchTokensList();
      // Generate new code for next submission
      setTimeout(() => regenerateCode(), 1000);
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-[#001E62] border border-blue-100">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
                Gerador e Gestão de Tokens
              </h3>
              <p className="text-[11px] text-gray-500">
                Painel Administrativo para criação e acompanhamento de tokens no banco de dados
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-100/50 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all cursor-pointer border-b-2 ${
              activeTab === 'generate'
                ? 'bg-white text-[#001E62] border-[#001E62] shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            <Plus size={15} />
            <span>Gerar Novo Token</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('list');
              fetchTokensList();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all cursor-pointer border-b-2 ${
              activeTab === 'list'
                ? 'bg-white text-[#001E62] border-[#001E62] shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            <Database size={15} />
            <span>Tokens Cadastrados ({tokensList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {feedback && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {feedback.type === 'success' ? <Check size={16} /> : <Info size={16} />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          )}

          {/* TAB 1: GENERATE TOKEN FORM */}
          {activeTab === 'generate' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Generated Token Field (Auto-generated, Read-only + Copy Button) */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#001E62] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    Token Gerado Automaticamente (Não alterável):
                  </label>
                  <button
                    type="button"
                    onClick={regenerateCode}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                    title="Gerar novo código randômico"
                  >
                    <RefreshCw size={12} />
                    Gerar outro código
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedCode}
                    className="flex-1 bg-white border border-blue-300 rounded-xl px-4 py-2.5 text-base font-mono font-black text-[#001E62] tracking-wider outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(generatedCode)}
                    className="flex items-center gap-1.5 bg-[#001E62] hover:bg-[#001648] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Grid of Token Properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Modo de Visualização */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Modo de Visualização:
                  </label>
                  <select
                    value={modoVisualizacao}
                    onChange={(e) => setModoVisualizacao(e.target.value as 'admin' | 'usuario')}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white"
                  >
                    <option value="usuario">Usuário (Acesso Padrão)</option>
                    <option value="admin">Admin (Acesso Total + Gerador de Tokens)</option>
                  </select>
                </div>

                {/* Duração em Minutos (Max 300 = 5h) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={13} />
                      Duração (Minutos):
                    </label>
                    <span className="text-[11px] font-extrabold text-[#001E62]">
                      {minutos} min ({(minutos / 60).toFixed(1)}h)
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={minutos}
                    onChange={(e) => handleMinutosChange(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    {[30, 60, 120, 300].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMinutos(preset)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                          minutos === preset
                            ? 'bg-[#001E62] text-white border-[#001E62]'
                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {preset === 300 ? '5h (Max)' : `${preset}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permitir Renovação? */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                    <RotateCcw size={13} />
                    Permitir Renovação?
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="renovacao"
                        checked={renovacao === true}
                        onChange={() => setRenovacao(true)}
                        className="text-[#001E62] focus:ring-[#001E62]"
                      />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="renovacao"
                        checked={renovacao === false}
                        onChange={() => setRenovacao(false)}
                        className="text-[#001E62] focus:ring-[#001E62]"
                      />
                      <span>Não</span>
                    </label>
                  </div>
                </div>

                {/* Quantidade de Renovações (Max 3) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Qtd. de Renovações (Max 3):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={3}
                    disabled={!renovacao}
                    value={renovacao ? qtdRenovacoes : 0}
                    onChange={(e) => handleQtdRenovacoesChange(parseInt(e.target.value) || 0)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white disabled:opacity-40"
                  />
                  <p className="text-[10px] text-gray-400">Permite renovar a sessão até 3 vezes.</p>
                </div>

                {/* Quantidade Permitida de Usuários (Max 25) */}
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <Users size={13} />
                      Qtd. Permitida de Usuários por Token (Max 25):
                    </label>
                    <span className="text-[11px] font-extrabold text-[#001E62]">
                      {qtdUsuarios} usuário(s) simultâneo(s)
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={qtdUsuarios}
                    onChange={(e) => handleQtdUsuariosChange(parseInt(e.target.value) || 1)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white"
                  />
                  <p className="text-[10px] text-gray-400">
                    O mesmo token pode ser utilizado simultaneamente por até {qtdUsuarios} usuário(s).
                  </p>
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#001E62] hover:bg-[#001648] text-white px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md shadow-[#001E62]/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar Token no Banco'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: TOKENS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tokens Cadastrados no Supabase:
                </span>
                <button
                  onClick={fetchTokensList}
                  className="text-xs text-[#001E62] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw size={13} className={isLoadingList ? 'animate-spin' : ''} />
                  <span>Atualizar</span>
                </button>
              </div>

              {isLoadingList ? (
                <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Carregando tokens do banco de dados...</span>
                </div>
              ) : tokensList.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl text-xs text-gray-500">
                  Nenhum token encontrado na tabela <code className="font-mono text-gray-800">tokens</code>.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Token</th>
                        <th className="p-3">Modo</th>
                        <th className="p-3">Duração</th>
                        <th className="p-3">Usuários</th>
                        <th className="p-3">Renovações</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tokensList.map((t, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#001E62]">
                            {t.token}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              (t.modoVisualizacao || t.modo) === 'admin' 
                                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {t.modoVisualizacao || t.modo || 'usuário'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-gray-700">
                            {t.minutos} min
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-gray-900">
                              {t.qtdUsuariosLogados || 0}
                            </span>
                            <span className="text-gray-400"> / {t.qtdUsuarios}</span>
                          </td>
                          <td className="p-3 text-gray-700">
                            {t.renovacao ? (
                              <span className="text-emerald-700 font-bold">Sim ({t.qtdRenovacoes}x)</span>
                            ) : (
                              <span className="text-gray-400">Não</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleCopy(t.token)}
                              className="p-1.5 rounded-lg text-gray-600 hover:text-[#001E62] hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Copiar token"
                            >
                              <Copy size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
