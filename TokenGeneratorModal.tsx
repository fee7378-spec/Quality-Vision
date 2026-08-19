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
import { useTokenStore, AccessType, generateSecureToken } from '../store/useTokenStore';
import { supabase, TokenRecord } from '../lib/supabase';

interface TokenGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TokenGeneratorModal: React.FC<TokenGeneratorModalProps> = ({ isOpen, onClose }) => {
  const { generateToken } = useTokenStore();

  const [activeTab, setActiveTab] = useState<'generate' | 'list'>('generate');

  // Form State
  const [tipo, setTipo] = useState<AccessType>('administracao');
  const [minutos, setMinutos] = useState<number>(60);
  const [renovacao, setRenovacao] = useState<boolean>(true);
  const [qtdRenovacoes, setQtdRenovacoes] = useState<number>(2);
  const [qtdUsuarios, setQtdUsuarios] = useState<number>(5);

  // Auto-generated Token
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tokens List
  const [tokensList, setTokensList] = useState<TokenRecord[]>([]);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false);

  const regenerateCode = () => {
    const code = generateSecureToken();
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
        .order('id', { ascending: false });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const res = await generateToken({
      tipo,
      minutos,
      renovacao,
      qtdRenovacoes: renovacao ? qtdRenovacoes : 0,
      qtdUsuarios,
      presetToken: generatedCode,
    });

    setIsSubmitting(false);

    if (res.success && res.token) {
      setNewlyCreatedToken(res.token);
      setFeedback({
        type: 'success',
        message: `Token ${res.token} gerado e salvo com sucesso no Supabase!`,
      });
      fetchTokensList();
      setTimeout(() => regenerateCode(), 1000);
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  const parseCreationMs = (rawDateStr?: string) => {
    if (!rawDateStr) return Date.now();
    let isoLike = rawDateStr.replace(' ', 'T');
    if (!isoLike.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(isoLike)) {
      isoLike += 'Z';
    }
    const ms = Date.parse(isoLike);
    return isNaN(ms) ? Date.now() : ms;
  };

  const formatDateLocal = (rawDateStr?: string) => {
    if (!rawDateStr) return '-';
    const ms = parseCreationMs(rawDateStr);
    try {
      return new Date(ms).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return rawDateStr.substring(0, 16).replace('T', ' ');
    }
  };

  const getTokenStatus = (t: TokenRecord) => {
    if (!t.dataCriacao) return { label: 'Ativo', bg: 'bg-emerald-100 text-emerald-800' };
    const creationMs = parseCreationMs(t.dataCriacao);

    const now = Date.now();
    const expMs = creationMs + (t.minutos || 60) * 60 * 1000;

    if (now < creationMs - 5 * 60 * 1000) return { label: 'Aguardando', bg: 'bg-blue-100 text-blue-800' };
    if (now >= expMs) return { label: 'Expirado', bg: 'bg-red-100 text-red-800' };
    return { label: 'Ativo', bg: 'bg-emerald-100 text-emerald-800' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
                Gerenciamento de Tokens
              </h3>
              <p className="text-[11px] text-gray-500">
                Criar e administrar tokens de acesso com persistência oficial no Supabase
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-100/50 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all cursor-pointer border-b-2 ${
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-all cursor-pointer border-b-2 ${
              activeTab === 'list'
                ? 'bg-white text-[#001E62] border-[#001E62] shadow-2xs'
                : 'text-gray-500 hover:text-gray-900 border-transparent'
            }`}
          >
            <Database size={15} />
            <span>Tokens Cadastrados ({tokensList.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">

          {feedback && (
            <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {feedback.type === 'success' ? <Check size={18} /> : <Info size={18} />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Newly Created Highlight Card */}
          {newlyCreatedToken && (
            <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-300 flex items-center justify-between gap-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-200 text-purple-900">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 block">
                    Novo Token Gerado com Sucesso:
                  </span>
                  <span className="font-mono font-black text-purple-950 text-base tracking-wider">
                    {newlyCreatedToken}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(newlyCreatedToken)}
                className="flex items-center gap-1.5 bg-purple-800 hover:bg-purple-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar Token'}</span>
              </button>
            </div>
          )}

          {/* TAB 1: FORM */}
          {activeTab === 'generate' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Token Display & Length Settings */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#001E62] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={15} />
                    Token Criptográfico Gerado:
                  </label>
                  <button
                    type="button"
                    onClick={() => regenerateCode()}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Regerar Código
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedCode}
                    className="flex-1 bg-white border border-blue-300 rounded-xl px-4 py-2.5 text-base font-mono font-black text-[#001E62] tracking-wider outline-none select-all shadow-2xs"
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

                {/* Token Length Info Badge */}
                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs text-gray-600 font-medium">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <KeyRound size={13} className="text-[#001E62]" />
                    Tamanho do Token (Gerado Aleatoriamente):
                  </span>
                  <span className="font-mono font-black text-[#001E62] bg-white border border-blue-200 px-2.5 py-0.5 rounded-md text-xs shadow-2xs">
                    {generatedCode.length} caracteres (32 a 40)
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Tipo de Acesso (tipo column) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tipo de Acesso (Coluna 'tipo'):
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as AccessType)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white"
                  >
                    <option value="administracao">Administração (Total)</option>
                    <option value="supervisao">Supervisão (Operacional)</option>
                    <option value="visualizacao">Visualização (Leitura)</option>
                  </select>
                </div>

                {/* Duração em Minutos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={13} />
                      Validade (Minutos):
                    </label>
                    <span className="text-[11px] font-extrabold text-[#001E62]">
                      {minutos} min ({(minutos / 60).toFixed(1)}h)
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={minutos}
                    onChange={(e) => setMinutos(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    {[15, 30, 60, 120, 240, 480].map((preset) => (
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
                        {preset >= 60 ? `${preset / 60}h` : `${preset}m`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permitir Renovação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                    <RotateCcw size={13} />
                    Permitir Renovação?
                  </label>
                  <div className="flex items-center gap-4 pt-1.5">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="renovacao"
                        checked={renovacao === true}
                        onChange={() => setRenovacao(true)}
                        className="text-[#001E62] focus:ring-[#001E62]"
                      />
                      <span>Sim (Permitido)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                      <input
                        type="radio"
                        name="renovacao"
                        checked={renovacao === false}
                        onChange={() => setRenovacao(false)}
                        className="text-[#001E62] focus:ring-[#001E62]"
                      />
                      <span>Não (Bloqueado)</span>
                    </label>
                  </div>
                </div>

                {/* Quantidade de Renovações */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Qtd. Global de Renovações:
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={!renovacao}
                    value={renovacao ? qtdRenovacoes : 0}
                    onChange={(e) => setQtdRenovacoes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white disabled:opacity-40"
                  />
                  <p className="text-[10px] text-gray-400">Total acumulativo disponível para o token.</p>
                </div>

                {/* Quantidade de Usuários Simultâneos */}
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                      <Users size={13} />
                      Usuários Simultâneos Permitidos (qtdUsuarios):
                    </label>
                    <span className="text-[11px] font-extrabold text-[#001E62]">
                      Até {qtdUsuarios} conexões ativas
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={qtdUsuarios}
                    onChange={(e) => setQtdUsuarios(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#001E62] focus:bg-white"
                  />
                </div>

              </div>

              {/* Action */}
              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#001E62] hover:bg-[#001648] text-white px-6 py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Plus size={15} />
                  )}
                  <span>{isSubmitting ? 'Gerando Token...' : 'Gerar Token'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: TABLE OF EXISTING TOKENS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tabela Oficial de Tokens no Supabase:
                </span>
                <button
                  onClick={fetchTokensList}
                  className="text-xs text-[#001E62] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw size={13} className={isLoadingList ? 'animate-spin' : ''} />
                  <span>Atualizar Tabela</span>
                </button>
              </div>

              {isLoadingList ? (
                <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-[#001E62]" />
                  <span>Buscando registros do Supabase...</span>
                </div>
              ) : tokensList.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-xs text-gray-500">
                  Nenhum token encontrado na tabela <code className="font-mono text-gray-800">tokens</code>.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[9px] tracking-wider whitespace-nowrap">
                      <tr>
                        <th className="p-3">Token</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3 text-center">Usuários</th>
                        <th className="p-3 text-center">Validade</th>
                        <th className="p-3">Data Criação</th>
                        <th className="p-3 text-center">Renovação</th>
                        <th className="p-3 text-center">Utilizadas</th>
                        <th className="p-3 text-center">Disponíveis</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tokensList.map((t, idx) => {
                        const status = getTokenStatus(t);
                        const renovUtil = Number(t.renovacoesUtilizadas || 0);
                        const renovMax = Number(t.qtdRenovacoes || 0);
                        const renovDisp = t.renovacao ? Math.max(0, renovMax - renovUtil) : 0;

                        return (
                          <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-[#001E62] max-w-[140px] truncate" title={t.token}>
                              {t.token}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                t.tipo === 'administracao' 
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : t.tipo === 'supervisao'
                                  ? 'bg-blue-100 text-[#001E62] border border-blue-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}>
                                {t.tipo || 'visualizacao'}
                              </span>
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="font-extrabold text-gray-900">{t.qtdUsuariosLogados || 0}</span>
                              <span className="text-gray-400"> / {t.qtdUsuarios}</span>
                            </td>
                            <td className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap">
                              {t.minutos} min
                            </td>
                            <td className="p-3 text-gray-500 text-[10px] whitespace-nowrap">
                              {formatDateLocal(t.dataCriacao)}
                            </td>
                            <td className="p-3 text-center">
                              {t.renovacao ? (
                                <span className="text-emerald-700 font-bold">Sim</span>
                              ) : (
                                <span className="text-gray-400">Não</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-gray-800">
                              {renovUtil}
                            </td>
                            <td className="p-3 text-center font-bold text-blue-900">
                              {renovDisp}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${status.bg}`}>
                                {status.label}
                              </span>
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
                        );
                      })}
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
