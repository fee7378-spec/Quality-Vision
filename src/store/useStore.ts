import { create } from 'zustand';
import { idbGet, idbSet, idbDel } from '../lib/idb';

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
  Plano?: string;      // Coluna BQ (Plano de ação)
  DataPlano?: string;  // Coluna BT (Data do plano de ação)
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
  BQ?: string; // Plano de Ação (Coluna BQ)
  BT_Plano?: string; // Data do Plano de Ação (Coluna BT)
}

export type FilterValue = string | string[];

export const matchesFilter = (selected: FilterValue, value: string | undefined, defaultVal: string = 'TODAS') => {
  if (!selected) return true;
  if (Array.isArray(selected)) {
    if (selected.length === 0 || selected.includes(defaultVal) || selected.includes('TODOS')) return true;
    return value ? selected.includes(value) : false;
  }
  if (selected === defaultVal || selected === 'TODOS') return true;
  return value === selected;
};

export interface EsteiraMetric {
  esteira: string;
  contratados: number;
  tmo: number; // em minutos
  capacidadeDia: number;
  produzidoFila: number;
  produzidoPrioridade: number;
  totalProduzido: number;
}

export interface ProductivityItem {
  id?: string;
  NomeAnalista: string;           // Coluna A (ANALISTA)
  DataProdutividade: string;      // Coluna B (DATA - YYYY-MM-DD)
  Apuracao?: string;              // Coluna C (APURAÇÃO TEMPO)
  Esteira: string;                // Coluna D (ESTEIRA)
  Complexidade?: string;          // Coluna E (COMPLEXIDADE)
  TipoDemanda?: string;           // Coluna F (TIPO DE DEMANDA)
  Pendencia?: string;             // Coluna G (PENDÊNCIA)
  Prioridade?: string;            // Coluna H (PRIORIDADE)
  Reprova?: string;               // Coluna I (REPROVA)
  Segmento?: string;              // Coluna J (SEGMENTO)
  Status?: string;                // Coluna K (STATUS)
  CoSegmento?: string;            // Coluna L (CO-SEGMENTO)
  DocumentoPendenciado?: string;  // Coluna M (DOCUMENTO PENDENCIADO)
  Pendenciado?: string;           // Coluna N (PENDENCIADO)
  // Additional calculated properties for system widgets
  MotivoPendencia?: string;
  PendenciaReprova?: string;
  TipoSocietario?: string;
  Quantidade: number;             // Quantidade (1)
  TmoMinutos?: number;
  [key: string]: any;
}

export interface ProductivityColumnMapping {
  A: string; // ANALISTA
  B: string; // DATA
  C: string; // APURAÇÃO TEMPO
  D: string; // ESTEIRA
  E: string; // COMPLEXIDADE
  F: string; // TIPO DE DEMANDA
  G: string; // PENDÊNCIA
  H: string; // PRIORIDADE
  I: string; // REPROVA
  J: string; // SEGMENTO
  K: string; // STATUS
  L: string; // CO-SEGMENTO
  M: string; // DOCUMENTO PENDENCIADO
  N: string; // PENDENCIADO
}

export const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const mStr = String(month + 1).padStart(2, '0');
  const start = `${year}-${mStr}-01`;
  
  const lastDayObj = new Date(year, month + 1, 0);
  const endDay = String(lastDayObj.getDate()).padStart(2, '0');
  const end = `${year}-${mStr}-${endDay}`;
  
  return { start, end };
};

export const normalizeDateStr = (raw: any): string => {
  if (!raw) return '';

  if (typeof raw === 'number' && raw > 30000 && raw < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + raw * 86400000);
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let str = String(raw).trim();
  if (!str) return '';

  if (/^\d{5}$/.test(str)) {
    const num = Number(str);
    if (num > 30000 && num < 80000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const dateObj = new Date(excelEpoch.getTime() + num * 86400000);
      const y = dateObj.getUTCFullYear();
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  if (str.includes('T')) {
    const isoPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
      return isoPart;
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

export const formatDateToBR = (dateStr: string | undefined | null): string => {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();
  if (str === '' || str === '-' || str === 'null' || str === 'undefined') return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
  if (str.includes('T')) {
    const isoPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
      const [y, m, d] = isoPart.split('-');
      return `${d}/${m}/${y}`;
    }
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }
  return str;
};

export interface EsteiraParam {
  esteira: string;
  contratados: number;        // Quantidade de analistas contratados
  tmoAlvoSegundos: number;    // Meta/TMO Médio em segundos (ex: 34min = 2040s)
  horasTrabalhoDia: number;   // Horas trabalhadas por dia por analista (ex: 8h)
  metaDiaria: number;         // Meta de demandas por dia por analista
  diasUteisMes: number;       // Dias úteis no mês
}

export const formatSecondsToHHMMSS = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const parseHHMMSSToSeconds = (str: string): number => {
  if (!str) return 0;
  const parts = str.split(':').map(p => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(str, 10) || 0;
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

  // Cannot be generic header words or enum values
  const invalidKeywords = [
    'NOME', 'ANALISTA', 'NOME DO ANALISTA', 'NOME ANALISTA', 'OPERADOR', 'COLABORADOR',
    'TOTAL', 'GERAL', 'DATA', 'DATA PRODUTIVIDADE', 'SUPERVISOR', 'ESTEIRA', 
    'TOTAL GERAL', 'PRODUTIVIDADE', 'QUANTIDADE', 'CONTAGEM', 'MES', 'SOMA',
    'MONITORA', 'TABULADOR', 'MONITOR',
    'APURACAO', 'APURACAO TEMPO', 'APURACAO DE TEMPO', 'TEMPO', 'TMO',
    'COMPLEXIDADE', 'TIPO DE DEMANDA', 'TIPO DEMANDA', 'DEMANDA', 'ATIVIDADE',
    'PENDENCIA', 'MOTIVO PENDENCIA', 'DOCUMENTO PENDENCIADO', 'DOC PENDENCIADO', 'PENDENCIADO',
    'PRIORIDADE', 'PRIORITARIO', 'REPROVA', 'REPROVACAO', 'MOTIVO REPROVA',
    'SEGMENTO', 'STATUS', 'CO SEGMENTO', 'COSEGMENTO', 'SUB SEGMENTO', 'SITUACAO', 'PARECER',
    'SIM', 'NAO', 'BAIXA', 'MEDIA', 'ALTA', 'APROVADO', 'REPROVADO', 'PENDENCIA'
  ];
  if (invalidKeywords.includes(norm)) return false;
  return true;
};

export const parseFormaMonitoria = (rawVal: any): string => {
  if (!rawVal) return '';
  const str = String(rawVal).trim();
  if (!str) return '';
  const lower = str.toLowerCase();

  if (lower.includes('interfile')) {
    return 'Qualidade Interfile';
  }
  if (lower.includes('cliente') || lower.includes('double')) {
    return 'Double Check';
  }
  if (lower.includes('estudo')) {
    return 'Estudo';
  }
  return str;
};

export const getFormaFromItem = (item: any): string => {
  if (!item) return '';
  const raw = getVal(item, 'forma') || getVal(item, 'formaMonitoria') || item.FormaMonitoria || item.forma || item.AA || '';
  return parseFormaMonitoria(raw);
};

export const matchesFormaFilter = (selectedForma: FilterValue, item: any): boolean => {
  if (!selectedForma) return true;
  if (!item) return true;

  const hasFormaKey = 
    item.hasOwnProperty('forma') || 
    item.hasOwnProperty('formaMonitoria') || 
    item.hasOwnProperty('FormaMonitoria') || 
    item.hasOwnProperty('AA') || 
    Object.keys(item).some(k => k.toLowerCase() === 'forma' || k.toLowerCase() === 'formamonitoria');

  if (!hasFormaKey) return true;

  const raw = getVal(item, 'forma') || getVal(item, 'formaMonitoria') || item.FormaMonitoria || item.forma || item.AA || '';
  const parsed = parseFormaMonitoria(raw);
  return matchesFilter(selectedForma, parsed, 'TODAS') || matchesFilter(selectedForma, String(raw).trim(), 'TODAS');
};

export const getVal = (obj: any, key: string) => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (obj[key] !== undefined) return obj[key];
  const lowerKey = key.toLowerCase();
  const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
  return foundKey ? obj[foundKey] : undefined;
};

export const generateCodeFromName = (name: string, prefix: 'SUP' | 'MON' | 'MAT') => {
  if (!name || name === '-' || name.trim().toLowerCase() === 'não informado' || name.trim().toLowerCase() === 'supervisor geral') return '-';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const positiveNum = Math.abs(hash) % 900 + 100;
  return `${prefix}-${positiveNum}`;
};

export const getAnalystCode = (item: any) => {
  if (!item) return '-';
  let directCode = getVal(item, 'codAnalista') || getVal(item, 'codigoAnalista') || item?.CodigoAnalista || item?.codAnalista || item?.codigo || item?.cod_analista || item?.cd_analista || item?.matricula || item?.Matricula;
  let name = typeof item === 'string' ? item : (getVal(item, 'analista') || item?.NomeAnalista || item?.nome || '');

  if (directCode && String(directCode).trim() && String(directCode).trim() !== '-') {
    const dStr = String(directCode).trim();
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(dStr) && dStr.includes(' ')) {
      // directCode is actually a full name, so ignore it and use it as name if name is empty
      if (!name || name === '-') name = dStr;
      directCode = undefined;
    } else {
      return dStr;
    }
  }

  if (!name || name === '-' || name.trim().toLowerCase() === 'não informado') return '-';

  try {
    const storeState = useStore.getState ? useStore.getState() : null;
    if (storeState) {
      const cleanName = name.trim().toLowerCase();
      
      const monitoriasList = storeState.monitorias || [];
      const matchInMonitorias = monitoriasList.find(m => {
        const mName = (getVal(m, 'analista') || m?.NomeAnalista || m?.nome || '').toString().trim().toLowerCase();
        const mCode = getVal(m, 'codAnalista') || getVal(m, 'codigoAnalista') || m?.CodigoAnalista || m?.codAnalista || m?.codigo || m?.cod_analista || m?.cd_analista || m?.matricula || m?.Matricula;
        return mName === cleanName && mCode && String(mCode).trim() && String(mCode).trim() !== '-';
      });

      if (matchInMonitorias) {
        const foundCode = getVal(matchInMonitorias, 'codAnalista') || getVal(matchInMonitorias, 'codigoAnalista') || matchInMonitorias?.CodigoAnalista || matchInMonitorias?.codAnalista || matchInMonitorias?.codigo || matchInMonitorias?.cod_analista || matchInMonitorias?.cd_analista || matchInMonitorias?.matricula || matchInMonitorias?.Matricula;
        if (foundCode) return String(foundCode).trim();
      }

      const dataList = storeState.data || [];
      const matchInData = dataList.find(m => {
        const mName = (getVal(m, 'analista') || m?.NomeAnalista || m?.nome || '').toString().trim().toLowerCase();
        const mCode = getVal(m, 'codAnalista') || getVal(m, 'codigoAnalista') || m?.CodigoAnalista || m?.codAnalista || m?.codigo || m?.cod_analista || m?.cd_analista || m?.matricula || m?.Matricula;
        return mName === cleanName && mCode && String(mCode).trim() && String(mCode).trim() !== '-';
      });

      if (matchInData) {
        const foundCode = getVal(matchInData, 'codAnalista') || getVal(matchInData, 'codigoAnalista') || matchInData?.CodigoAnalista || matchInData?.codAnalista || matchInData?.codigo || matchInData?.cod_analista || matchInData?.cd_analista || matchInData?.matricula || matchInData?.Matricula;
        if (foundCode) return String(foundCode).trim();
      }
    }
  } catch (err) {
    // ignore
  }

  return generateCodeFromName(name, 'MAT');
};

export const getSupervisorCode = (item: any) => {
  if (!item) return '-';
  let directCode = getVal(item, 'codSupervisor') || getVal(item, 'codigoSupervisor') || item?.CodigoSupervisor || item?.codSupervisor || item?.cod_supervisor;
  let name = typeof item === 'string' ? item : (getVal(item, 'supervisor') || item?.NomeSupervisor || item?.nome || '');

  if (directCode && String(directCode).trim() && String(directCode).trim() !== '-') {
    const dStr = String(directCode).trim();
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(dStr) && dStr.includes(' ')) {
      if (!name || name === '-') name = dStr;
      directCode = undefined;
    } else {
      return dStr;
    }
  }

  if (!name || name === '-' || name.trim().toLowerCase() === 'não informado' || name.trim().toLowerCase() === 'supervisor geral') return '-';

  try {
    const storeState = useStore.getState ? useStore.getState() : null;
    if (storeState) {
      const cleanName = name.trim().toLowerCase();
      const monitoriasList = storeState.monitorias || [];
      const match = monitoriasList.find(m => {
        const mName = (getVal(m, 'supervisor') || m?.NomeSupervisor || '').toString().trim().toLowerCase();
        const mCode = getVal(m, 'codSupervisor') || getVal(m, 'codigoSupervisor') || m?.CodigoSupervisor || m?.codSupervisor;
        return mName === cleanName && mCode && String(mCode).trim() && String(mCode).trim() !== '-';
      });
      if (match) {
        const foundCode = getVal(match, 'codSupervisor') || getVal(match, 'codigoSupervisor') || match?.CodigoSupervisor || match?.codSupervisor;
        if (foundCode) return String(foundCode).trim();
      }
    }
  } catch (err) {
    // ignore
  }

  return generateCodeFromName(name, 'SUP');
};

export const getMonitorCode = (item: any) => {
  if (!item) return '-';
  let directCode = getVal(item, 'codMonitor') || getVal(item, 'codigoMonitor') || item?.CodigoMonitor || item?.codMonitor || item?.cod_monitor;
  let name = typeof item === 'string' ? item : (getVal(item, 'monitor') || item?.NomeMonitor || item?.nome || '');

  if (directCode && String(directCode).trim() && String(directCode).trim() !== '-') {
    const dStr = String(directCode).trim();
    if (/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(dStr) && dStr.includes(' ')) {
      if (!name || name === '-') name = dStr;
      directCode = undefined;
    } else {
      return dStr;
    }
  }

  if (!name || name === '-' || name.trim().toLowerCase() === 'não informado') return '-';

  try {
    const storeState = useStore.getState ? useStore.getState() : null;
    if (storeState) {
      const cleanName = name.trim().toLowerCase();
      const monitoriasList = storeState.monitorias || [];
      const match = monitoriasList.find(m => {
        const mName = (getVal(m, 'monitor') || m?.NomeMonitor || '').toString().trim().toLowerCase();
        const mCode = getVal(m, 'codMonitor') || getVal(m, 'codigoMonitor') || m?.CodigoMonitor || m?.codMonitor;
        return mName === cleanName && mCode && String(mCode).trim() && String(mCode).trim() !== '-';
      });
      if (match) {
        const foundCode = getVal(match, 'codMonitor') || getVal(match, 'codigoMonitor') || match?.CodigoMonitor || match?.codMonitor;
        if (foundCode) return String(foundCode).trim();
      }
    }
  } catch (err) {
    // ignore
  }

  return generateCodeFromName(name, 'MON');
};

export const getTabuladorName = (esteiraName: string, mappings: EsteiraMapping[]): string => {
  if (!esteiraName) return '';
  if (!mappings || !Array.isArray(mappings)) return esteiraName;
  const match = mappings.find(m => m.monitora && m.monitora.trim().toLowerCase() === esteiraName.trim().toLowerCase());
  return match && match.tabulador && match.tabulador.trim() ? match.tabulador.trim() : esteiraName;
};

export const sanitizeItems = (items: MonitoringItem[]): MonitoringItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    const rawForma = String(item.FormaMonitoria || item.AA || '').trim();
    const normalizedForma = parseFormaMonitoria(rawForma);

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
  volumetriaAnalistas: any[];
  monitorias: any[];
  monitoriaErros: any[];
  volumetriaPrioridades: any[];
  volumetriaPendencias: any[];
  volumetriaReprovas: any[];
  volumetria: any[];
  volumetriaTipoDeDemanda: any[];
  volumetriaMediaTmo: any[];
  volumetriaStatus: any[];

  fetchSupabaseData: () => Promise<void>;

  data: MonitoringItem[];
  lastProcessed: string | null;
  productivityData: ProductivityItem[];
  productivityLastProcessed: string | null;
  startDate: string;
  endDate: string;
  selectedTag: string;
  selectedMacro: string;
  selectedEsteira: FilterValue;
  selectedForma: FilterValue;
  selectedSupervisor: FilterValue;
  analystSearchQuery: string;
  esteiraParams: Record<string, EsteiraParam>;
  esteirasMetrics: Record<string, EsteiraMetric>;
  tmoMode: 'base' | 'manual';
  dailyWorkingHours: number;
  columnMapping: ColumnMapping;
  productivityMapping: ProductivityColumnMapping;
  esteiraMappings: EsteiraMapping[];
    
  setData: (data: MonitoringItem[], timestamp?: string) => void;
  setProductivityData: (data: ProductivityItem[], timestamp?: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSelectedTag: (tag: string) => void;
  setSelectedMacro: (macro: string) => void;
  setSelectedEsteira: (esteira: FilterValue) => void;
  setSelectedForma: (forma: FilterValue) => void;
  setSelectedSupervisor: (supervisor: FilterValue) => void;
  setAnalystSearchQuery: (query: string) => void;
  setEsteiraParam: (esteira: string, param: Partial<EsteiraParam>) => void;
  setEsteiraMetric: (esteira: string, metric: Partial<EsteiraMetric>) => void;
  setTmoMode: (mode: 'base' | 'manual') => void;
  setDailyWorkingHours: (hours: number) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  setProductivityMapping: (mapping: ProductivityColumnMapping) => void;
  setEsteiraMappings: (mappings: EsteiraMapping[]) => void;
  updateEsteiraMapping: (index: number, field: 'monitora' | 'tabulador', value: string) => void;
  addEsteiraMapping: (mapping?: EsteiraMapping) => void;
  removeEsteiraMapping: (index: number) => void;
  resetEsteiraMappings: () => void;
  clearData: () => void;
  clearProductivityData: () => void;
  loadFakeData: () => void;
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
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-01', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '0', Esteira: 'Abertura PJ', DataFeedback: '2026-07-03' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-04', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '0', Esteira: 'Abertura PJ', DataFeedback: '2026-07-06' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-08', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-12', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-18', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-22', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },

  // ANA BEATRIZ (Abertura PF)
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-02', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-07-05' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-07', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-07-09' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-14', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-20', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-25', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },

  // FERNANDO ALVES (Crédito PJ)
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-03', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '2026-07-05' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-09', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-15', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '2026-07-17' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-21', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },

  // MARIANA COSTA (Crédito PJ)
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-06', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-11', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-20', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },

  // LUCAS MENDES (Abertura PF)
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-05', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-07-08' },
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Qualidade Interfile', DataMonitoria: '2026-07-16', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Double Check', DataMonitoria: '2026-07-24', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
];

export const initialSampleProductivityData: ProductivityItem[] = [
  // CARLOS SILVA (Abertura PJ)
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-01', Quantidade: 45, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Abertura de Conta PJ', Complexidade: 'Média', Segmento: 'PME', CoSegmento: 'Varejo', TipoSocietario: 'LTDA', TmoMinutos: 18 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-04', Quantidade: 50, Prioridade: 'Não', PendenciaReprova: 'Pendência', MotivoPendencia: 'Documento Ilegível', TipoDemanda: 'Alteração de Contrato Social', Complexidade: 'Alta', Segmento: 'PME', CoSegmento: 'Varejo', TipoSocietario: 'S/A', TmoMinutos: 22 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-08', Quantidade: 52, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Abertura de Conta PJ', Complexidade: 'Baixa', Segmento: 'PME', CoSegmento: 'Varejo', TipoSocietario: 'EIRELI', TmoMinutos: 16 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-12', Quantidade: 48, Prioridade: 'Sim', PendenciaReprova: 'Reprovado', MotivoPendencia: 'Divergência de Assinatura', TipoDemanda: 'Abertura de Conta PJ', Complexidade: 'Média', Segmento: 'PME', CoSegmento: 'Varejo', TipoSocietario: 'LTDA', TmoMinutos: 25 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-18', Quantidade: 55, Prioridade: 'Não', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Inclusão de Sócio', Complexidade: 'Média', Segmento: 'PME', CoSegmento: 'Varejo', TipoSocietario: 'LTDA', TmoMinutos: 19 },
  { Esteira: 'BTG ONBOARDING PJ', NomeAnalista: 'CARLOS SILVA', DataProdutividade: '2026-07-22', Quantidade: 60, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Abertura de Conta PJ', Complexidade: 'Baixa', Segmento: 'PME', CoSegmento: 'Varejo', TipoSocietario: 'LTDA', TmoMinutos: 15 },

  // ANA BEATRIZ (MANUTENÇÃO PF)
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-02', Quantidade: 38, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Abertura de Conta PF', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 12 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-07', Quantidade: 42, Prioridade: 'Não', PendenciaReprova: 'Pendência', MotivoPendencia: 'Comprovante Ilegível', TipoDemanda: 'Atualização Cadastral', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 14 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-14', Quantidade: 40, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Abertura de Conta PF', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 11 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-20', Quantidade: 46, Prioridade: 'Sim', PendenciaReprova: 'Reprovado', MotivoPendencia: 'Selfie com Baixa Qualidade', TipoDemanda: 'Abertura de Conta PF', Complexidade: 'Média', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 15 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'ANA BEATRIZ', DataProdutividade: '2026-07-25', Quantidade: 51, Prioridade: 'Não', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Emissão de Cartão', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 10 },

  // FERNANDO ALVES (BTG CORPORATE)
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-07-03', Quantidade: 30, Prioridade: 'Sim', PendenciaReprova: 'Pendência', MotivoPendencia: 'Aguardando Parecer de Risco', TipoDemanda: 'Análise de Limite de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 35 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-07-09', Quantidade: 35, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Análise de Limite de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 28 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-07-15', Quantidade: 32, Prioridade: 'Não', PendenciaReprova: 'Reprovado', MotivoPendencia: 'Score Insuficiente', TipoDemanda: 'Renovação de Linha de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 32 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'FERNANDO ALVES', DataProdutividade: '2026-07-21', Quantidade: 36, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Análise de Limite de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 26 },

  // MARIANA COSTA (BTG CORPORATE)
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'MARIANA COSTA', DataProdutividade: '2026-07-06', Quantidade: 28, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Análise de Limite de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 30 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'MARIANA COSTA', DataProdutividade: '2026-07-11', Quantidade: 34, Prioridade: 'Não', PendenciaReprova: 'Pendência', MotivoPendencia: 'Balanço Desatualizado', TipoDemanda: 'Revisão Anual de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 34 },
  { Esteira: 'BTG CORPORATE', NomeAnalista: 'MARIANA COSTA', DataProdutividade: '2026-07-20', Quantidade: 39, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Análise de Limite de Crédito', Complexidade: 'Alta', Segmento: 'Corporate', CoSegmento: 'Large Corporate', TipoSocietario: 'S/A', TmoMinutos: 27 },

  // LUCAS MENDES (MANUTENÇÃO PF)
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'LUCAS MENDES', DataProdutividade: '2026-07-05', Quantidade: 41, Prioridade: 'Não', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Atualização Cadastral', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 13 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'LUCAS MENDES', DataProdutividade: '2026-07-16', Quantidade: 44, Prioridade: 'Sim', PendenciaReprova: 'Pendência', MotivoPendencia: 'Comprovante Ausente', TipoDemanda: 'Abertura de Conta PF', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 16 },
  { Esteira: 'MANUTENÇÃO PF', NomeAnalista: 'LUCAS MENDES', DataProdutividade: '2026-07-24', Quantidade: 47, Prioridade: 'Sim', PendenciaReprova: 'Aprovado', MotivoPendencia: '', TipoDemanda: 'Abertura de Conta PF', Complexidade: 'Baixa', Segmento: 'PF', CoSegmento: 'Digital', TipoSocietario: 'Individual', TmoMinutos: 12 },
];

const loadInitialData = (): { 
  data: MonitoringItem[]; 
  lastProcessed: string | null;
  prodData: ProductivityItem[];
  prodLastProcessed: string | null;
  esteiraMappings: EsteiraMapping[];
} => {
  let data: MonitoringItem[] = [];
  let lastProcessed: string | null = null;
  let prodData: ProductivityItem[] = [];
  let prodLastProcessed: string | null = null;
  let esteiraMappings = defaultEsteiraMappings;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTs = localStorage.getItem(TIMESTAMP_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Map any June items to July if imported under previous timezone offset
        data = sanitizeItems(parsed).map(item => ({
          ...item,
          DataMonitoria: item.DataMonitoria ? normalizeDateStr(item.DataMonitoria) : ''
        }));
        lastProcessed = savedTs || (parsed.length > 0 ? 'Gravação em cache' : null);
      }
    }

    const savedProd = localStorage.getItem(STORAGE_PROD_KEY);
    const savedProdTs = localStorage.getItem(TIMESTAMP_PROD_KEY);
    if (savedProd !== null) {
      const parsedProd = JSON.parse(savedProd);
      if (Array.isArray(parsedProd)) {
        // Map any June items to July if imported under previous timezone offset
        prodData = parsedProd.map(item => ({
          ...item,
          DataProdutividade: item.DataProdutividade ? normalizeDateStr(item.DataProdutividade) : ''
        }));
        prodLastProcessed = savedProdTs || (parsedProd.length > 0 ? 'Gravação em cache' : null);
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

const currentMonthRange = getCurrentMonthRange();

const initialEsteirasMetrics: Record<string, EsteiraMetric> = {
  'BTG ABONO PJ': { esteira: 'BTG ABONO PJ', contratados: 6, tmo: 26, capacidadeDia: 50, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG BKO ABERTURA PJ': { esteira: 'BTG BKO ABERTURA PJ', contratados: 3, tmo: 25, capacidadeDia: 40, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG BKO MANUTENÇÃOPJ': { esteira: 'BTG BKO MANUTENÇÃOPJ', contratados: 30, tmo: 39, capacidadeDia: 45, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG CORPORATE': { esteira: 'BTG CORPORATE', contratados: 10, tmo: 60, capacidadeDia: 30, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG EXTRANET PJ': { esteira: 'BTG EXTRANET PJ', contratados: 4, tmo: 55, capacidadeDia: 45, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG FATCA PJ': { esteira: 'BTG FATCA PJ', contratados: 5, tmo: 30, capacidadeDia: 50, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG MANUTENÇÃO PJ': { esteira: 'BTG MANUTENÇÃO PJ', contratados: 24, tmo: 34, capacidadeDia: 45, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG ONBOARDING PJ': { esteira: 'BTG ONBOARDING PJ', contratados: 24, tmo: 21, capacidadeDia: 40, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG PREMIUM PJ': { esteira: 'BTG PREMIUM PJ', contratados: 5, tmo: 59, capacidadeDia: 35, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'BTG VINTAGE PJ': { esteira: 'BTG VINTAGE PJ', contratados: 5, tmo: 59, capacidadeDia: 40, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'MANUTENÇÃO PF': { esteira: 'MANUTENÇÃO PF', contratados: 15, tmo: 25, capacidadeDia: 50, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'PARAMETRIZAÇÃO': { esteira: 'PARAMETRIZAÇÃO', contratados: 31, tmo: 40, capacidadeDia: 40, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'SH-PME': { esteira: 'SH-PME', contratados: 3, tmo: 28, capacidadeDia: 45, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 },
  'WM': { esteira: 'WM', contratados: 3, tmo: 55, capacidadeDia: 35, produzidoFila: 0, produzidoPrioridade: 0, totalProduzido: 0 }
};

export const useStore = create<AppState>((set, get) => ({

  volumetriaAnalistas: [],
  monitorias: [],
  monitoriaErros: [],
  volumetriaPrioridades: [],
  volumetriaPendencias: [],
  volumetriaReprovas: [],
  volumetria: [],
  volumetriaTipoDeDemanda: [],
  volumetriaMediaTmo: [],
  volumetriaStatus: [],
  fetchSupabaseData: async () => {
    try {
      const { fetchAllSupabaseData } = await import('./supabaseData');
      const data = await fetchAllSupabaseData();
      
      const dates: string[] = [];
      Object.values(data).forEach((arr: any) => {
        if (Array.isArray(arr)) {
          arr.forEach((item: any) => {
            if (item && item.data && /^\d{4}-\d{2}-\d{2}$/.test(String(item.data))) {
              dates.push(String(item.data));
            }
          });
        }
      });

      let updateObj: any = { ...data };
      // Maintain current month range default / user selection when data refreshes
      set(updateObj);
    } catch (e) {
      console.error("Error fetching from Supabase:", e);
    }
  },


  data: initialStored.data,
  lastProcessed: initialStored.lastProcessed,
  productivityData: initialStored.prodData,
  productivityLastProcessed: initialStored.prodLastProcessed,
  esteiraMappings: initialStored.esteiraMappings,
  startDate: currentMonthRange.start,
  endDate: currentMonthRange.end,
  selectedTag: 'TODAS',
  selectedMacro: 'TODOS',
  selectedEsteira: ['TODAS'],
  selectedForma: ['TODAS'],
  selectedSupervisor: ['TODOS'],
  analystSearchQuery: '',
  esteirasMetrics: initialEsteirasMetrics,
  tmoMode: 'manual',
  dailyWorkingHours: 8,
  esteiraParams: {
    'Geral': { esteira: 'Geral', contratados: 200, tmoAlvoSegundos: 1800, horasTrabalhoDia: 8, metaDiaria: 45, diasUteisMes: 22 },
    'BTG ABONO PJ': { esteira: 'BTG ABONO PJ', contratados: 6, tmoAlvoSegundos: 1560, horasTrabalhoDia: 8, metaDiaria: 50, diasUteisMes: 22 },
    'BTG BKO ABERTURA PJ': { esteira: 'BTG BKO ABERTURA PJ', contratados: 3, tmoAlvoSegundos: 1500, horasTrabalhoDia: 8, metaDiaria: 40, diasUteisMes: 22 },
    'BTG BKO MANUTENÇÃOPJ': { esteira: 'BTG BKO MANUTENÇÃOPJ', contratados: 30, tmoAlvoSegundos: 2340, horasTrabalhoDia: 8, metaDiaria: 45, diasUteisMes: 22 },
    'BTG CORPORATE': { esteira: 'BTG CORPORATE', contratados: 10, tmoAlvoSegundos: 3600, horasTrabalhoDia: 8, metaDiaria: 30, diasUteisMes: 22 },
    'BTG EXTRANET PJ': { esteira: 'BTG EXTRANET PJ', contratados: 4, tmoAlvoSegundos: 3300, horasTrabalhoDia: 8, metaDiaria: 45, diasUteisMes: 22 },
    'BTG FATCA PJ': { esteira: 'BTG FATCA PJ', contratados: 5, tmoAlvoSegundos: 1800, horasTrabalhoDia: 8, metaDiaria: 50, diasUteisMes: 22 },
    'BTG MANUTENÇÃO PJ': { esteira: 'BTG MANUTENÇÃO PJ', contratados: 24, tmoAlvoSegundos: 2040, horasTrabalhoDia: 8, metaDiaria: 45, diasUteisMes: 22 },
    'BTG ONBOARDING PJ': { esteira: 'BTG ONBOARDING PJ', contratados: 24, tmoAlvoSegundos: 1260, horasTrabalhoDia: 8, metaDiaria: 40, diasUteisMes: 22 },
    'BTG PREMIUM PJ': { esteira: 'BTG PREMIUM PJ', contratados: 5, tmoAlvoSegundos: 3540, horasTrabalhoDia: 8, metaDiaria: 35, diasUteisMes: 22 },
    'BTG VINTAGE PJ': { esteira: 'BTG VINTAGE PJ', contratados: 5, tmoAlvoSegundos: 3540, horasTrabalhoDia: 8, metaDiaria: 40, diasUteisMes: 22 },
    'MANUTENÇÃO PF': { esteira: 'MANUTENÇÃO PF', contratados: 15, tmoAlvoSegundos: 1500, horasTrabalhoDia: 8, metaDiaria: 50, diasUteisMes: 22 },
    'PARAMETRIZAÇÃO': { esteira: 'PARAMETRIZAÇÃO', contratados: 31, tmoAlvoSegundos: 2400, horasTrabalhoDia: 8, metaDiaria: 40, diasUteisMes: 22 },
    'SH-PME': { esteira: 'SH-PME', contratados: 3, tmoAlvoSegundos: 1680, horasTrabalhoDia: 8, metaDiaria: 45, diasUteisMes: 22 },
    'WM': { esteira: 'WM', contratados: 3, tmoAlvoSegundos: 3300, horasTrabalhoDia: 8, metaDiaria: 35, diasUteisMes: 22 }
  },
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
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G',
    H: 'H',
    I: 'I',
    J: 'J',
    K: 'K',
    L: 'L',
    M: 'M',
    N: 'N'
  },
  
  setData: (newData, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const cleanData = sanitizeItems(newData).map(item => ({
      ...item,
      DataMonitoria: normalizeDateStr(item.DataMonitoria)
    }));

    set({ 
      data: cleanData, 
      lastProcessed: ts
    });
  },

  setProductivityData: (prodItems, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const cleanProd = (prodItems || []).map(item => ({
      ...item,
      DataProdutividade: item.DataProdutividade ? normalizeDateStr(item.DataProdutividade) : ''
    }));

    set({ 
      productivityData: cleanProd,
      productivityLastProcessed: ts
    });
  },

  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSelectedMacro: (macro) => set({ selectedMacro: macro }),
  setSelectedEsteira: (esteira) => set({ selectedEsteira: esteira }),
  setSelectedForma: (forma) => set({ selectedForma: forma }),
  setSelectedSupervisor: (supervisor) => set({ selectedSupervisor: supervisor }),
  setAnalystSearchQuery: (query) => set({ analystSearchQuery: query }),
  setEsteiraParam: (esteira, param) => set(state => ({
    esteiraParams: { ...state.esteiraParams, [esteira]: { ...state.esteiraParams[esteira], ...param } }
  })),
  setEsteiraMetric: (esteira, metric) => set(state => ({
    esteirasMetrics: { ...state.esteirasMetrics, [esteira]: { ...state.esteirasMetrics[esteira], ...metric } }
  })),
  setTmoMode: (mode) => set({ tmoMode: mode }),
  setDailyWorkingHours: (hours) => set({ dailyWorkingHours: hours }),
  setColumnMapping: (mapping) => set({ columnMapping: mapping }),
  setProductivityMapping: (mapping) => set({ productivityMapping: mapping }),
  setEsteiraMappings: (mappings) => {
    set({ esteiraMappings: mappings });
  },
  updateEsteiraMapping: (index, field, value) => set(state => {
    const newMappings = [...state.esteiraMappings];
    if (newMappings[index]) {
      newMappings[index] = { ...newMappings[index], [field]: value };
    }
    return { esteiraMappings: newMappings };
  }),
  addEsteiraMapping: (mapping) => set(state => ({
    esteiraMappings: [...state.esteiraMappings, mapping || { monitora: '', tabulador: '' }]
  })),
  removeEsteiraMapping: (index) => set(state => ({
    esteiraMappings: state.esteiraMappings.filter((_, i) => i !== index)
  })),
  resetEsteiraMappings: () => {
    set({ esteiraMappings: defaultEsteiraMappings });
  },
  clearData: () => {
    set({ 
      data: [], 
      lastProcessed: null,
    });
  },
  clearProductivityData: () => {
    set({ productivityData: [], productivityLastProcessed: null });
  },
  loadFakeData: () => {
    const fallbackRange = getCurrentMonthRange();
    set({ 
      data: initialSampleData, 
      lastProcessed: new Date().toLocaleString('pt-BR'),
      productivityData: initialSampleProductivityData,
      productivityLastProcessed: new Date().toLocaleString('pt-BR'),
      startDate: fallbackRange.start,
      endDate: fallbackRange.end,
      esteiraMappings: defaultEsteiraMappings
    });
  },
  resetToCurrentMonth: () => {
    const current = getCurrentMonthRange();
    set({ startDate: current.start, endDate: current.end });
  }
}));
