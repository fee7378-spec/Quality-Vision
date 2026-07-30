import { create } from 'zustand';
import { idbGet, idbSet, idbDel } from '../lib/idb';
import { saveToFirebase, clearFirebaseData, subscribeToFirebaseData } from '../lib/firebase';

export interface MonitoringItem {
  id?: string;
  CodigoAnalista: string;
  NomeAnalista: string;
  NomeMonitor: string;
  NomeSupervisor: string;
  FormaMonitoria: string;
  DataMonitoria: string; // YYYY-MM-DD format
  Tag: string;
  MotivoMacro: string;
  Erro: string; // '0' = Error, '100' = OK
  Esteira: string;
  DataFeedback: string; // YYYY-MM-DD or empty
  [key: string]: any;
}

export interface ColumnMapping {
  S: string;  // Código do analista
  T: string;  // Nome do Analista
  V: string;  // Nome do Monitor
  Y: string;  // Nome do Supervisor
  AA: string; // Forma da Monitoria
  AB: string; // Data da Monitoria
  AE: string; // Tags
  AF: string; // Motivo Macro
  AH: string; // Erro/Não Erro (0 ou 100)
  R: string;  // Esteira
  BT: string; // Data do Feedback
}

export interface ProductivityItem {
  id?: string;
  Esteira: string;          // Coluna B por padrão
  NomeAnalista: string;     // Coluna C por padrão
  DataProdutividade: string; // Coluna D por padrão (YYYY-MM-DD)
  Quantidade: number;       // Valor numérico ou 1 por ocorrência
  Prioridade?: string;      // Coluna E por padrão ('Sim' | 'Não')
  PendenciaReprova?: string;// Coluna F por padrão ('Aprovado' | 'Pendência' | 'Reprovado')
  MotivoPendencia?: string; // Coluna G por padrão (Ex: 'Documento Ilegível', 'Aguardando Assinatura')
  TipoDemanda?: string;     // Coluna H por padrão (Ex: 'Abertura de Conta', 'Alteração Cadastral')
  TmoMinutos?: number;      // Coluna I por padrão (Tempo Médio de Operação em Minutos)
  [key: string]: any;
}

export interface ProductivityColumnMapping {
  B: string; // Esteira (padrão B)
  C: string; // Nome do Analista / Produtividade (padrão C)
  D: string; // Data da Produtividade (padrão D)
  E: string; // Prioridade (padrão E - Sim/Não)
  F: string; // Status Pendência/Reprova (padrão F)
  G: string; // Motivo Pendência/Reprova (padrão G)
  H: string; // Tipo de Demanda / Atividade (padrão H)
  I: string; // TMO em Minutos (padrão I)
}

export const getCurrentMonthRange = () => {

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDayNum = new Date(year, now.getMonth() + 1, 0).getDate();
  const lastDay = String(lastDayNum).padStart(2, '0');
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${lastDay}`
  };
};

export const normalizeDateStr = (raw: any): string => {
  if (!raw) return '';

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(raw).trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    let year = Number(parts[0]);
    let month = Number(parts[1]);
    let day = Number(parts[2]);

    // Auto-fix legacy inverted dates post-July (where month > 7 was wrongly inverted from DD/MM/YYYY)
    if (month > 7 && day <= 12) {
      const temp = month;
      month = day;
      day = temp;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return str;
  }

  if (str.includes('T')) {
    const isoPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
      return normalizeDateStr(isoPart);
    }
  }

  if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/');
    if (parts.length === 3) {
      let [p1, p2, p3] = parts.map(p => p.trim());
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      // Strict DD/MM/YYYY format: p1 = Day, p2 = Month, p3 = Year
      let day = p1.padStart(2, '0');
      let month = p2.padStart(2, '0');
      let year = p3;
      if (year.length === 2) year = `20${year}`;
      return `${year.padStart(4, '20')}-${month}-${day}`;
    }
  }

  if (str.includes('-')) {
    const parts = str.split(' ')[0].split('-');
    if (parts.length === 3) {
      let [p1, p2, p3] = parts.map(p => p.trim());
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      // Strict DD-MM-YYYY format: p1 = Day, p2 = Month, p3 = Year
      let day = p1.padStart(2, '0');
      let month = p2.padStart(2, '0');
      let year = p3;
      if (year.length === 2) year = `20${year}`;
      return `${year.padStart(4, '20')}-${month}-${day}`;
    }
  }

  return str.slice(0, 10);
};

export interface EsteiraMapping {
  monitora: string;
  tabulador: string;
}

export const defaultEsteiraMappings: EsteiraMapping[] = [
  { monitora: 'BTG ABONO PJ', tabulador: 'ABONO' },
  { monitora: 'BTG BKO ABERTURA PJ', tabulador: 'BKO ABERTURA' },
  { monitora: 'BTG BKO MANUTENÇÃOPJ', tabulador: 'BKO MANUTENÇÃO' },
  { monitora: 'BTG CORPORATE', tabulador: 'CORPORATE' },
  { monitora: 'BTG EXTRANET PJ', tabulador: 'EXTRANET' },
  { monitora: 'BTG FATCA PJ', tabulador: 'FATCA' },
  { monitora: 'BTG MANUTENÇÃO PJ', tabulador: 'MANUTENÇÃO PME' },
  { monitora: 'BTG ONBOARDING PJ', tabulador: 'ABERTURA PJ' },
  { monitora: 'BTG PREMIUM PJ', tabulador: 'PREMIUM' },
  { monitora: 'BTG VINTAGE PJ', tabulador: 'VINTAGE PJ' },
  { monitora: 'MANUTENÇÃO PF', tabulador: 'MANUTENÇÃO PF' },
  { monitora: 'PARAMETRIZAÇÃO', tabulador: 'PARAMETRIZAÇÃO' },
  { monitora: 'SH-PME', tabulador: 'SH - PME' },
  { monitora: 'WM', tabulador: 'WM' }
];

export const KNOWN_ESTEIRAS = [
  'BTG ABONO PJ', 'ABONO',
  'BTG BKO ABERTURA PJ', 'BKO ABERTURA',
  'BTG BKO MANUTENÇÃOPJ', 'BTG BKO MANUTENCAO PJ', 'BKO MANUTENÇÃO', 'BKO MANUTENCAO',
  'BTG CORPORATE', 'CORPORATE',
  'BTG EXTRANET PJ', 'EXTRANET',
  'BTG FATCA PJ', 'FATCA',
  'BTG MANUTENÇÃO PJ', 'BTG MANUTENCAO PJ', 'MANUTENÇÃO PME', 'MANUTENCAO PME',
  'BTG ONBOARDING PJ', 'ABERTURA PJ', 'ONBOARDING', 'BTG ONBOARDING',
  'BTG PREMIUM PJ', 'PREMIUM',
  'BTG VINTAGE PJ', 'VINTAGE PJ', 'VINTAGE',
  'MANUTENÇÃO PF', 'MANUTENCAO PF',
  'PARAMETRIZAÇÃO', 'PARAMETRIZACAO',
  'SH-PME', 'SH - PME', 'SH PME',
  'WM', 'GERAL', 'TODAS', 'ESTEIRA', 'ESTEIRA MONITORA', 'TABULADOR'
];

export const normalizeName = (name: any): string => {
  if (!name) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
};

export const getCanonicalEsteiraName = (rawEsteira: string, mappings: EsteiraMapping[]): string => {
  if (!rawEsteira) return 'Geral';
  const normRaw = normalizeName(rawEsteira);
  for (const m of mappings) {
    if (normalizeName(m.tabulador) === normRaw) {
      return m.monitora;
    }
    if (normalizeName(m.monitora) === normRaw) {
      return m.monitora;
    }
  }
  return rawEsteira.trim().toUpperCase();
};

export const isValidAnalystName = (name: any): boolean => {
  if (!name) return false;
  const str = String(name).trim();
  if (str.length < 2) return false;
  // Must contain at least one letter
  if (!/[a-zA-ZáéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/.test(str)) return false;
  // Cannot be a date pattern like DD/MM/YYYY or YYYY-MM-DD
  if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}$/.test(str)) return false;
  if (/^\d{4}[\/\.-]\d{1,2}[\/\.-]\d{1,2}$/.test(str)) return false;
  
  const norm = normalizeName(str);
  
  // Cannot be a known Esteira name
  const isKnownEsteira = KNOWN_ESTEIRAS.some(e => normalizeName(e) === norm);
  if (isKnownEsteira) return false;

  // Cannot be generic header words
  const invalidKeywords = [
    'NOME', 'ANALISTA', 'NOME DO ANALISTA', 'NOME ANALISTA', 'TOTAL', 
    'GERAL', 'DATA', 'DATA PRODUTIVIDADE', 'SUPERVISOR', 'ESTEIRA', 
    'TOTAL GERAL', 'PRODUTIVIDADE', 'QUANTIDADE', 'CONTAGEM', 'MES', 'SOMA',
    'MONITORA', 'TABULADOR', 'MONITOR'
  ];
  if (invalidKeywords.includes(norm)) return false;
  return true;
};

export const sanitizeItems = (items: MonitoringItem[]): MonitoringItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    const rawForma = String(item.FormaMonitoria || item.AA || '').trim();
    const isInterfile = rawForma.toLowerCase() === 'qualidade interfile';
    const normalizedForma = isInterfile ? 'Qualidade Interfile' : 'Estudo';

    return {
      ...item,
      FormaMonitoria: normalizedForma,
      DataMonitoria: normalizeDateStr(item.DataMonitoria),
      DataFeedback: item.DataFeedback ? normalizeDateStr(item.DataFeedback) : ''
    };
  });
};

const initialMonthRange = getCurrentMonthRange();

interface AppState {
  data: MonitoringItem[];
  lastProcessed: string | null;
  productivityData: ProductivityItem[];
  productivityLastProcessed: string | null;
  startDate: string;
  endDate: string;
  selectedTag: string;
  selectedMacro: string;
  selectedEsteira: string;
  selectedForma: string;
  columnMapping: ColumnMapping;
  productivityMapping: ProductivityColumnMapping;
  esteiraMappings: EsteiraMapping[];
  isFirebaseConnected: boolean;
  
  setData: (data: MonitoringItem[], timestamp?: string) => void;
  setProductivityData: (data: ProductivityItem[], timestamp?: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSelectedTag: (tag: string) => void;
  setSelectedMacro: (macro: string) => void;
  setSelectedEsteira: (esteira: string) => void;
  setSelectedForma: (forma: string) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setProductivityMapping: (mapping: ProductivityColumnMapping) => void;
  setEsteiraMappings: (mappings: EsteiraMapping[]) => void;
  updateEsteiraMapping: (index: number, field: 'monitora' | 'tabulador', value: string) => void;
  addEsteiraMapping: (mapping?: EsteiraMapping) => void;
  removeEsteiraMapping: (index: number) => void;
  resetEsteiraMappings: () => void;
  clearData: () => void;
  clearProductivityData: () => void;
  resetToCurrentMonth: () => void;
}

const STORAGE_KEY = 'quality_vision_base_data_v1';
const TIMESTAMP_KEY = 'quality_vision_last_processed_v1';
const STORAGE_PROD_KEY = 'quality_vision_productivity_data_v1';
const TIMESTAMP_PROD_KEY = 'quality_vision_productivity_ts_v1';
const STORAGE_ESTEIRA_MAP_KEY = 'quality_vision_esteira_mappings_v1';

// Initial rich mock data so the app displays instantly with meaningful metrics
const initialSampleData: MonitoringItem[] = [
  // CARLOS SILVA (Abertura PJ)
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-06-02', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '0', Esteira: 'Abertura PJ', DataFeedback: '2026-06-05' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-06-12', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '0', Esteira: 'Abertura PJ', DataFeedback: '2026-06-15' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-06-25', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-02', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-07-10', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-22', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },

  // ANA BEATRIZ (Abertura PF)
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-06-05', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-06-08' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-06-18', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-06-20' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-05', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-07-15', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-25', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },

  // FERNANDO ALVES (Crédito PJ)
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-06-10', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '2026-06-12' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-06-20', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-08', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '2026-07-10' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-07-18', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },

  // MARIANA COSTA (Crédito PJ)
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-06-15', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-01', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-20', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },

  // LUCAS MENDES (Abertura PF)
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-06-28', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-06-30' },
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-12', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Estudo', DataMonitoria: '2026-07-24', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
];

export const initialSampleProductivityData: ProductivityItem[] = [
  // CARLOS SILVA (Abertura PJ)
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-06-02', Quantidade: 45, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Abertura de Conta PJ', TmoMinutos: 18 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-06-12', Quantidade: 50, Prioridade: 'Não', PendenciaReprova: 'Pendência', MotivoPendencia: 'Documento Ilegível', TipoDemanda: 'Alteração de Contrato Social', TmoMinutos: 22 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-06-25', Quantidade: 52, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Abertura de Conta PJ', TmoMinutos: 16 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-02', Quantidade: 48, Prioridade: 'Sim', PendenciaReprova: 'Reprovado', MotivoPendencia: 'Divergência de Assinatura', TipoDemanda: 'Abertura de Conta PJ', TmoMinutos: 25 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-10', Quantidade: 55, Prioridade: 'Não', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Inclusão de Sócio', TmoMinutos: 19 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-22', Quantidade: 60, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Abertura de Conta PJ', TmoMinutos: 15 },

  // ANA BEATRIZ (MANUTENÇÃO PF)
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-06-05', Quantidade: 38, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Abertura de Conta PF', TmoMinutos: 12 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-06-18', Quantidade: 42, Prioridade: 'Não', PendenciaReprova: 'Pendência', MotivoPendencia: 'Comprovante Ilegível', TipoDemanda: 'Atualização Cadastral', TmoMinutos: 14 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-05', Quantidade: 40, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Abertura de Conta PF', TmoMinutos: 11 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-15', Quantidade: 46, Prioridade: 'Sim', PendenciaReprova: 'Reprovado', MotivoPendencia: 'Selfie com Baixa Qualidade', TipoDemanda: 'Abertura de Conta PF', TmoMinutos: 15 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-25', Quantidade: 51, Prioridade: 'Não', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Emissão de Cartão', TmoMinutos: 10 },

  // FERNANDO ALVES (BTG CORPORATE)
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-06-10', Quantidade: 30, Prioridade: 'Sim', PendenciaReprova: 'Pendência', MotivoPendencia: 'Aguardando Parecer de Risco', TipoDemanda: 'Análise de Limite de Crédito', TmoMinutos: 35 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-06-20', Quantidade: 35, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Análise de Limite de Crédito', TmoMinutos: 28 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-07-08', Quantidade: 32, Prioridade: 'Não', PendenciaReprova: 'Reprovado', MotivoPendencia: 'Score Insuficiente', TipoDemanda: 'Renovação de Linha de Crédito', TmoMinutos: 32 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-07-18', Quantidade: 36, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Análise de Limite de Crédito', TmoMinutos: 26 },

  // MARIANA COSTA (BTG CORPORATE)
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'MARIANA COSTA', DataProdutividade: '2026-06-15', Quantidade: 28, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Análise de Limite de Crédito', TmoMinutos: 30 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'MARIANA COSTA', DataProdutividade: '2026-07-01', Quantidade: 34, Prioridade: 'Não', PendenciaReprova: 'Pendência', MotivoPendencia: 'Balanço Desatualizado', TipoDemanda: 'Revisão Anual de Crédito', TmoMinutos: 34 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'MARIANA COSTA', DataProdutividade: '2026-07-20', Quantidade: 39, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Análise de Limite de Crédito', TmoMinutos: 27 },

  // LUCAS MENDES (MANUTENÇÃO PF)
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'LUCAS MENDES', DataProdutividade: '2026-06-28', Quantidade: 41, Prioridade: 'Não', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Atualização Cadastral', TmoMinutos: 13 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'LUCAS MENDES', DataProdutividade: '2026-07-12', Quantidade: 44, Prioridade: 'Sim', PendenciaReprova: 'Pendência', MotivoPendencia: 'Comprovante Ausente', TipoDemanda: 'Abertura de Conta PF', TmoMinutos: 16 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'LUCAS MENDES', DataProdutividade: '2026-07-24', Quantidade: 47, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: 'Nenhum', TipoDemanda: 'Abertura de Conta PF', TmoMinutos: 12 },
];

const loadInitialData = (): { 
  data: MonitoringItem[]; 
  lastProcessed: string | null;
  prodData: ProductivityItem[];
  prodLastProcessed: string | null;
  esteiraMappings: EsteiraMapping[];
} => {
  let data = sanitizeItems(initialSampleData);
  let lastProcessed: string | null = '28/07/2026, 09:31';
  let prodData = initialSampleProductivityData;
  let prodLastProcessed: string | null = '28/07/2026, 09:31';
  let esteiraMappings = defaultEsteiraMappings;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTs = localStorage.getItem(TIMESTAMP_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        data = sanitizeItems(parsed);
        lastProcessed = savedTs || 'Gravação em cache';
      }
    }

    const savedProd = localStorage.getItem(STORAGE_PROD_KEY);
    const savedProdTs = localStorage.getItem(TIMESTAMP_PROD_KEY);
    if (savedProd) {
      const parsedProd = JSON.parse(savedProd);
      if (Array.isArray(parsedProd) && parsedProd.length > 0) {
        prodData = parsedProd;
        prodLastProcessed = savedProdTs || 'Gravação em cache';
      }
    }

    const savedMap = localStorage.getItem(STORAGE_ESTEIRA_MAP_KEY);
    if (savedMap) {
      const parsedMap = JSON.parse(savedMap);
      if (Array.isArray(parsedMap) && parsedMap.length > 0) {
        esteiraMappings = parsedMap;
      }
    }
  } catch (e) {
    console.error("Error loading stored data:", e);
  }
  return { data, lastProcessed, prodData, prodLastProcessed, esteiraMappings };
};

const initialStored = loadInitialData();

export const useStore = create<AppState>((set, get) => ({
  data: initialStored.data,
  lastProcessed: initialStored.lastProcessed,
  productivityData: initialStored.prodData,
  productivityLastProcessed: initialStored.prodLastProcessed,
  esteiraMappings: initialStored.esteiraMappings,
  startDate: initialMonthRange.start,
  endDate: initialMonthRange.end,
  selectedTag: 'TODAS',
  selectedMacro: 'TODOS',
  selectedEsteira: 'TODAS',
  selectedForma: 'TODAS',
  isFirebaseConnected: true,
  columnMapping: {
    S: 'S',
    T: 'T',
    V: 'V',
    Y: 'Y',
    AA: 'AA',
    AB: 'AB',
    AE: 'AE',
    AF: 'AF',
    AH: 'AH',
    R: 'R',
    BT: 'BT'
  },
  productivityMapping: {
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G',
    H: 'H',
    I: 'I'
  },
  
  setData: (newData, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const cleanData = sanitizeItems(newData);
    const range = getCurrentMonthRange();
    
    let start = range.start;
    let end = range.end;

    if (cleanData.length > 0) {
      const hasCurrentMonthData = cleanData.some(i => i.DataMonitoria >= range.start && i.DataMonitoria <= range.end);
      if (!hasCurrentMonthData) {
        const sortedDates = cleanData
          .map(i => i.DataMonitoria)
          .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        if (sortedDates.length > 0) {
          start = sortedDates[0];
          end = sortedDates[sortedDates.length - 1];
        }
      }
    }

    const { productivityData, productivityLastProcessed } = get();

    // Save to Firebase
    saveToFirebase(cleanData, ts, productivityData, productivityLastProcessed).catch((err) => {
      console.error("Failed to save to Firebase Realtime Database:", err);
    });

    // Save locally
    idbSet(STORAGE_KEY, cleanData);
    idbSet(TIMESTAMP_KEY, ts);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
      localStorage.setItem(TIMESTAMP_KEY, ts);
    } catch {
      console.warn("localStorage quota exceeded.");
    }

    set({
      data: cleanData,
      lastProcessed: ts,
      startDate: start,
      endDate: end,
      selectedTag: 'TODAS',
      selectedMacro: 'TODOS',
      selectedEsteira: 'TODAS',
      selectedForma: 'TODAS'
    });
  },

  setProductivityData: (prodItems, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const { data, lastProcessed } = get();

    // Save to Firebase
    saveToFirebase(data, lastProcessed || '', prodItems, ts).catch((err) => {
      console.error("Failed to save productivity to Firebase:", err);
    });

    // Save locally
    idbSet(STORAGE_PROD_KEY, prodItems);
    idbSet(TIMESTAMP_PROD_KEY, ts);

    try {
      localStorage.setItem(STORAGE_PROD_KEY, JSON.stringify(prodItems));
      localStorage.setItem(TIMESTAMP_PROD_KEY, ts);
    } catch {
      console.warn("localStorage quota exceeded.");
    }

    set({
      productivityData: prodItems,
      productivityLastProcessed: ts
    });
  },

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSelectedMacro: (macro) => set({ selectedMacro: macro }),
  setSelectedEsteira: (esteira) => set({ selectedEsteira: esteira }),
  setSelectedForma: (forma) => set({ selectedForma: forma }),
  setColumnMapping: (mapping) => set({ columnMapping: mapping }),
  setProductivityMapping: (mapping) => set({ productivityMapping: mapping }),
  
  setEsteiraMappings: (mappings) => {
    try {
      localStorage.setItem(STORAGE_ESTEIRA_MAP_KEY, JSON.stringify(mappings));
    } catch {}
    set({ esteiraMappings: mappings });
  },
  
  updateEsteiraMapping: (index, field, value) => {
    const { esteiraMappings } = get();
    const next = [...esteiraMappings];
    if (next[index]) {
      next[index] = { ...next[index], [field]: value };
      try {
        localStorage.setItem(STORAGE_ESTEIRA_MAP_KEY, JSON.stringify(next));
      } catch {}
      set({ esteiraMappings: next });
    }
  },

  addEsteiraMapping: (mapping) => {
    const { esteiraMappings } = get();
    const next = [...esteiraMappings, mapping || { monitora: '', tabulador: '' }];
    try {
      localStorage.setItem(STORAGE_ESTEIRA_MAP_KEY, JSON.stringify(next));
    } catch {}
    set({ esteiraMappings: next });
  },

  removeEsteiraMapping: (index) => {
    const { esteiraMappings } = get();
    const next = esteiraMappings.filter((_, i) => i !== index);
    try {
      localStorage.setItem(STORAGE_ESTEIRA_MAP_KEY, JSON.stringify(next));
    } catch {}
    set({ esteiraMappings: next });
  },

  resetEsteiraMappings: () => {
    try {
      localStorage.setItem(STORAGE_ESTEIRA_MAP_KEY, JSON.stringify(defaultEsteiraMappings));
    } catch {}
    set({ esteiraMappings: defaultEsteiraMappings });
  },
  
  clearData: () => {
    const { productivityData, productivityLastProcessed } = get();
    saveToFirebase([], '', productivityData, productivityLastProcessed).catch((err) => {
      console.error("Failed to clear Firebase Realtime Database:", err);
    });

    idbDel(STORAGE_KEY);
    idbDel(TIMESTAMP_KEY);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
    } catch {
      // Ignore
    }
    set({ data: [], lastProcessed: null });
  },

  clearProductivityData: () => {
    const { data, lastProcessed } = get();
    saveToFirebase(data, lastProcessed || '', [], null).catch((err) => {
      console.error("Failed to clear productivity in Firebase:", err);
    });

    idbDel(STORAGE_PROD_KEY);
    idbDel(TIMESTAMP_PROD_KEY);
    try {
      localStorage.removeItem(STORAGE_PROD_KEY);
      localStorage.removeItem(TIMESTAMP_PROD_KEY);
    } catch {
      // Ignore
    }
    set({ productivityData: [], productivityLastProcessed: null });
  },

  resetToCurrentMonth: () => {
    const range = getCurrentMonthRange();
    set({
      startDate: range.start,
      endDate: range.end,
      selectedTag: 'TODAS',
      selectedMacro: 'TODOS',
      selectedEsteira: 'TODAS',
      selectedForma: 'TODAS'
    });
  }
}));

// Real-time synchronization listener with Firebase Realtime Database
if (typeof window !== 'undefined') {
  subscribeToFirebaseData(
    (fbItems, fbTimestamp, fbProd, fbProdTs) => {
      if ((fbItems && fbItems.length > 0) || (fbProd && fbProd.length > 0)) {
        useStore.setState((state) => ({
          ...state,
          data: fbItems && fbItems.length > 0 ? fbItems : state.data,
          lastProcessed: fbTimestamp || state.lastProcessed,
          productivityData: fbProd && fbProd.length > 0 ? fbProd : state.productivityData,
          productivityLastProcessed: fbProdTs || state.productivityLastProcessed,
          isFirebaseConnected: true
        }));
        if (fbItems && fbItems.length > 0) {
          idbSet(STORAGE_KEY, fbItems);
          if (fbTimestamp) idbSet(TIMESTAMP_KEY, fbTimestamp);
        }
        if (fbProd && fbProd.length > 0) {
          idbSet(STORAGE_PROD_KEY, fbProd);
          if (fbProdTs) idbSet(TIMESTAMP_PROD_KEY, fbProdTs);
        }
      } else {
        // Firebase is empty: seed with initial dataset so RTDB has data
        const initialTs = new Date().toLocaleString('pt-BR');
        saveToFirebase(initialSampleData, initialTs, initialSampleProductivityData, initialTs).then(() => {
          useStore.setState((state) => ({
            ...state,
            data: sanitizeItems(initialSampleData),
            lastProcessed: initialTs,
            productivityData: initialSampleProductivityData,
            productivityLastProcessed: initialTs,
            isFirebaseConnected: true
          }));
        }).catch((err) => {
          console.error("Failed to seed initial data to Firebase:", err);
        });
      }
    },
    (err) => {
      console.warn("Firebase RTDB sync offline or error:", err);
      useStore.setState({ isFirebaseConnected: false });
    }
  );
}

