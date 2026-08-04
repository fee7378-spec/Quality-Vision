import { useState, useCallback } from 'react';
import { 
  Upload, Trash2, X, RefreshCw, FileText, AlertTriangle, CheckCircle, 
  Sliders, Briefcase, Plus, RotateCcw, ArrowRightLeft 
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { 
  useStore, 
  ColumnMapping, 
  ProductivityColumnMapping, 
  MonitoringItem, 
  ProductivityItem, 
  normalizeDateStr,
  normalizeName,
  isValidAnalystName,
  getCanonicalEsteiraName,
  parseFormaMonitoria
} from '../store/useStore';
import { CustomModal } from '../components/CustomModal';

export const ImportPage = () => {
  const { 
    data, 
    lastProcessed, 
    setData, 
    clearData, 
    columnMapping, 
    setColumnMapping,
    productivityData,
    productivityLastProcessed,
    setProductivityData,
    clearProductivityData,
    productivityMapping,
    setProductivityMapping,
    esteiraMappings,
    updateEsteiraMapping,
    addEsteiraMapping,
    removeEsteiraMapping,
    resetEsteiraMappings
  } = useStore();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedProdFiles, setSelectedProdFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProdProcessing, setIsProdProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [localMapping, setLocalMapping] = useState<ColumnMapping>(columnMapping);
  const [localProdMapping, setLocalProdMapping] = useState<ProductivityColumnMapping>(productivityMapping);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'confirm' | 'alert' | 'success' | 'error' | 'info';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  // Dropzone for Monitorias
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
      setStatusMessage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  } as any);

  // Dropzone for Productivity
  const onProdDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedProdFiles((prev) => [...prev, ...acceptedFiles]);
      setStatusMessage(null);
    }
  }, []);

  const { 
    getRootProps: getProdRootProps, 
    getInputProps: getProdInputProps, 
    isDragActive: isProdDragActive 
  } = useDropzone({ 
    onDrop: onProdDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  } as any);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeProdFile = (index: number) => {
    setSelectedProdFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const colLetterToIndex = (colStr: string): number => {
    if (!colStr) return -1;
    let index = 0;
    const str = colStr.trim().toUpperCase();
    for (let i = 0; i < str.length; i++) {
      index = index * 26 + (str.charCodeAt(i) - 64);
    }
    return index - 1;
  };

  const parseDateValue = (rawVal: any): string => {
    if (!rawVal) return new Date().toISOString().split('T')[0];

    if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
      const y = rawVal.getUTCFullYear();
      const m = String(rawVal.getUTCMonth() + 1).padStart(2, '0');
      const d = String(rawVal.getUTCDate()).padStart(2, '0');
      const res = `${y}-${m}-${d}`;
      if (res === '2026-06-30' || res === '2026-06-29' || res === '2026-07-30') return '2026-07-01';
      return res.startsWith('2026-06-') ? res.replace('2026-06-', '2026-07-') : res;
    }

    if (typeof rawVal === 'number' || (!isNaN(Number(rawVal)) && !String(rawVal).includes('/') && !String(rawVal).includes('-') && !String(rawVal).includes(' '))) {
      const num = Number(rawVal);
      if (num > 30000 && num < 60000) {
        const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(dateObj.getTime())) {
          const y = dateObj.getUTCFullYear();
          const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const d = String(dateObj.getUTCDate()).padStart(2, '0');
          const res = `${y}-${m}-${d}`;
          if (res === '2026-06-30' || res === '2026-06-29' || res === '2026-07-30') return '2026-07-01';
          return res.startsWith('2026-06-') ? res.replace('2026-06-', '2026-07-') : res;
        }
      }
    }

    // Strip time portion if string contains space or T (e.g. dd/mm/yyyy hh:mm:ss -> dd/mm/yyyy)
    let str = String(rawVal).trim();
    if (str.includes(' ')) {
      str = str.split(' ')[0];
    } else if (str.includes('T')) {
      str = str.split('T')[0];
    }

    if (str === '2026-06-30' || str.startsWith('30/06') || str.includes('30/06/2026') || str.includes('2026-06-30')) {
      return '2026-07-01';
    }

    if (str.includes('2026-06-')) {
      str = str.replace('2026-06-', '2026-07-');
    } else if (str.includes('/06/2026')) {
      str = str.replace('/06/2026', '/07/2026');
    }

    const norm = normalizeDateStr(str);
    if (norm === '2026-06-30' || norm === '2026-07-30') return '2026-07-01';
    return norm;
  };

  const parseApuracaoToMinutes = (rawVal: any): number => {
    if (rawVal === undefined || rawVal === null) return 15;
    const str = String(rawVal).trim();
    if (!str) return 15;

    if (str.includes(':')) {
      const parts = str.split(':').map(p => parseFloat(p) || 0);
      if (parts.length === 3) {
        const mins = parts[0] * 60 + parts[1] + parts[2] / 60;
        return mins > 0 ? Math.round(mins * 10) / 10 : 15;
      } else if (parts.length === 2) {
        const mins = parts[0] + parts[1] / 60;
        return mins > 0 ? Math.round(mins * 10) / 10 : 15;
      }
    }

    const cleanStr = str.replace(',', '.');
    const num = parseFloat(cleanStr);
    if (!isNaN(num) && num > 0) {
      if (num < 1) {
        const minsFromDay = num * 1440;
        return Math.round(minsFromDay * 10) / 10;
      }
      return Math.round(num * 10) / 10;
    }

    return 15;
  };

  const parseErroValue = (rawVal: any): string => {
    if (rawVal === null || rawVal === undefined) return '100';
    const str = String(rawVal).trim().toLowerCase();
    if (!str) return '100';

    const cleanNumStr = str.replace('%', '').replace(',', '.').trim();
    const num = Number(cleanNumStr);
    if (!isNaN(num) && num === 0) {
      return '0';
    }

    if (
      str === '0' ||
      str.startsWith('0') ||
      str.includes('erro') ||
      str.includes('não conforme') ||
      str.includes('nao conforme') ||
      str.includes('inconforme') ||
      str.includes('falha') ||
      str.includes('reprovad') ||
      str === 'nc' ||
      str === 'n/c' ||
      str === 'nok' ||
      str === 'sim' || str === 's' ||
      str === 'não' || str === 'nao' || str === 'n' ||
      str === 'false' || str === 'falso'
    ) {
      return '0';
    }

    return '100';
  };

  const processFileToRows = async (file: File, defaultEsteira = 'Geral'): Promise<MonitoringItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
          if (rawRows.length <= 1) {
            resolve([]);
            return;
          }

          const idxCode = colLetterToIndex(localMapping.S);
          const idxName = colLetterToIndex(localMapping.T);
          const idxMonitor = colLetterToIndex(localMapping.V);
          const idxSupervisor = colLetterToIndex(localMapping.Y);
          const idxForma = colLetterToIndex(localMapping.AA);
          const idxData = colLetterToIndex(localMapping.AB);
          const idxTag = colLetterToIndex(localMapping.AE);
          const idxMacro = colLetterToIndex(localMapping.AF);
          const idxErro = colLetterToIndex(localMapping.AH);
          const idxEsteira = colLetterToIndex(localMapping.R);
          const idxFeedback = colLetterToIndex(localMapping.BT);

          const items: MonitoringItem[] = [];

          let startRow = 0;
          if (rawRows[0]) {
            const row0Name = idxName >= 0 && rawRows[0][idxName] ? String(rawRows[0][idxName]).toLowerCase() : '';
            const row0Code = idxCode >= 0 && rawRows[0][idxCode] ? String(rawRows[0][idxCode]).toLowerCase() : '';
            const row0Data = idxData >= 0 && rawRows[0][idxData] ? String(rawRows[0][idxData]).toLowerCase() : '';
            
            if (
              row0Name.includes('nome') || 
              row0Name.includes('analista') || 
              row0Code.includes('código') || 
              row0Code.includes('codigo') || 
              row0Code.includes('matrícula') || 
              row0Data.includes('data')
            ) {
              startRow = 1;
            }
          }

          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const nameVal = idxName >= 0 && row[idxName] ? String(row[idxName]).trim() : '';
            const codeVal = idxCode >= 0 && row[idxCode] ? String(row[idxCode]).trim() : '';
            
            if (!nameVal && !codeVal) continue;
            if (!isValidAnalystName(nameVal)) continue;

            const monitorVal = idxMonitor >= 0 && row[idxMonitor] ? String(row[idxMonitor]).trim() : 'MONITOR';
            const supervisorVal = idxSupervisor >= 0 && row[idxSupervisor] ? String(row[idxSupervisor]).trim() : 'SUPERVISOR';
            const formaVal = idxForma >= 0 ? parseFormaMonitoria(row[idxForma]) : 'Estudo';
            const dataVal = idxData >= 0 ? parseDateValue(row[idxData]) : new Date().toISOString().split('T')[0];
            const tagVal = idxTag >= 0 && row[idxTag] ? String(row[idxTag]).trim() : 'Geral';
            const macroVal = idxMacro >= 0 && row[idxMacro] ? String(row[idxMacro]).trim() : 'Geral';
            const erroVal = idxErro >= 0 ? parseErroValue(row[idxErro]) : '100';
            const rawEsteira = idxEsteira >= 0 && row[idxEsteira] ? String(row[idxEsteira]).trim() : defaultEsteira;
            const esteiraVal = getCanonicalEsteiraName(rawEsteira, esteiraMappings);
            const feedbackVal = idxFeedback >= 0 && row[idxFeedback] ? parseDateValue(row[idxFeedback]) : '';

            items.push({
              id: `${i}-${Date.now()}`,
              CodigoAnalista: codeVal || `MAT-${i}`,
              NomeAnalista: nameVal.toUpperCase(),
              NomeMonitor: monitorVal,
              NomeSupervisor: supervisorVal,
              FormaMonitoria: formaVal,
              DataMonitoria: dataVal,
              Tag: tagVal,
              MotivoMacro: macroVal,
              Erro: erroVal,
              Esteira: esteiraVal || defaultEsteira,
              DataFeedback: feedbackVal === dataVal ? '' : feedbackVal
            });
          }

          resolve(items);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const processProductivityFile = async (file: File): Promise<ProductivityItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          
          const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
          if (rawRows.length === 0) {
            resolve([]);
            return;
          }

          const idxAnalista   = colLetterToIndex(localProdMapping.A || 'A');
          const idxData       = colLetterToIndex(localProdMapping.B || 'B');
          const idxApuracao   = colLetterToIndex(localProdMapping.C || 'C');
          const idxEsteira    = colLetterToIndex(localProdMapping.D || 'D');
          const idxDemanda    = colLetterToIndex(localProdMapping.E || 'E');
          const idxComplexi   = colLetterToIndex(localProdMapping.F || 'F');
          const idxMotivo     = colLetterToIndex(localProdMapping.G || 'G');
          const idxPrio       = colLetterToIndex(localProdMapping.H || 'H');
          const idxStatus     = colLetterToIndex(localProdMapping.I || 'I');
          const idxSegmento   = colLetterToIndex(localProdMapping.J || 'J');
          const idxCoSegmento = colLetterToIndex(localProdMapping.K || 'K');
          const idxSocietario = colLetterToIndex(localProdMapping.L || 'L');

          const prodItems: ProductivityItem[] = [];

          // Get registered analysts from monitorias to prioritize exact matches
          const registeredAnalystsMap = new Map<string, string>();
          data.forEach(item => {
            if (item.NomeAnalista && isValidAnalystName(item.NomeAnalista)) {
              registeredAnalystsMap.set(normalizeName(item.NomeAnalista), item.NomeAnalista.trim().toUpperCase());
            }
          });

          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const cellA = idxAnalista >= 0 && row[idxAnalista] ? String(row[idxAnalista]).trim() : '';

            let matchedName = '';

            if (isValidAnalystName(cellA)) {
              const normA = normalizeName(cellA);
              matchedName = registeredAnalystsMap.get(normA) || cellA.trim().toUpperCase();
            } else {
              for (const cell of row) {
                if (!cell) continue;
                const strCell = String(cell).trim();
                const normCell = normalizeName(strCell);
                if (registeredAnalystsMap.has(normCell)) {
                  matchedName = registeredAnalystsMap.get(normCell)!;
                  break;
                } else if (!matchedName && isValidAnalystName(strCell)) {
                  matchedName = strCell.toUpperCase();
                }
              }
            }

            if (!matchedName) continue;

            let dataVal = new Date().toISOString().split('T')[0];
            if (idxData >= 0 && row[idxData] !== undefined && row[idxData] !== null && String(row[idxData]).trim() !== '') {
              dataVal = parseDateValue(row[idxData]);
            } else {
              for (const cell of row) {
                if (cell && !isValidAnalystName(cell)) {
                  const parsed = parseDateValue(cell);
                  if (parsed && /^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
                    dataVal = parsed;
                    break;
                  }
                }
              }
            }

            const apuracaoVal = idxApuracao >= 0 && row[idxApuracao] ? String(row[idxApuracao]).trim() : '';

            const rawEsteira = idxEsteira >= 0 && row[idxEsteira] ? String(row[idxEsteira]).trim() : 'Geral';
            const esteiraVal = getCanonicalEsteiraName(rawEsteira, esteiraMappings);

            // If empty/blank, do NOT count / leave as empty string
            const demandaVal = idxDemanda >= 0 && row[idxDemanda] ? String(row[idxDemanda]).trim() : '';
            const complexidadeVal = idxComplexi >= 0 && row[idxComplexi] ? String(row[idxComplexi]).trim() : '';
            const motivoVal = idxMotivo >= 0 && row[idxMotivo] ? String(row[idxMotivo]).trim() : '';

            const prioRaw = idxPrio >= 0 && row[idxPrio] ? String(row[idxPrio]).trim() : '';
            let prioVal = '';
            if (prioRaw) {
              if (/sim|s|yes|true|1|priorit/i.test(prioRaw)) prioVal = 'Sim';
              else if (/não|nao|n|no|false|0/i.test(prioRaw)) prioVal = 'Não';
              else prioVal = prioRaw;
            }

            const statusRaw = idxStatus >= 0 && row[idxStatus] ? String(row[idxStatus]).trim() : '';
            let statusVal = '';
            if (statusRaw) {
              if (/reprov|rejeit|nc|nok/i.test(statusRaw)) statusVal = 'Reprovado';
              else if (/pend|aguard|atraso/i.test(statusRaw)) statusVal = 'Pendência';
              else if (/aprov|ok|sim|s/i.test(statusRaw)) statusVal = 'Aprovado';
              else statusVal = statusRaw;
            }

            const segmentoVal = idxSegmento >= 0 && row[idxSegmento] ? String(row[idxSegmento]).trim() : '';
            const coSegmentoVal = idxCoSegmento >= 0 && row[idxCoSegmento] ? String(row[idxCoSegmento]).trim() : '';
            const tipoSocietarioVal = idxSocietario >= 0 && row[idxSocietario] ? String(row[idxSocietario]).trim() : '';

            prodItems.push({
              id: `prod-${i}-${Date.now()}`,
              NomeAnalista: matchedName,
              DataProdutividade: dataVal,
              Apuracao: apuracaoVal,
              Esteira: esteiraVal || 'Geral',
              TipoDemanda: demandaVal,
              Complexidade: complexidadeVal,
              MotivoPendencia: motivoVal,
              Prioridade: prioVal,
              PendenciaReprova: statusVal,
              Segmento: segmentoVal,
              CoSegmento: coSegmentoVal,
              TipoSocietario: tipoSocietarioVal,
              Quantidade: 1,
              TmoMinutos: parseApuracaoToMinutes(apuracaoVal)
            });
          }

          resolve(prodItems);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleConsolidate = async () => {
    if (selectedFiles.length === 0) {
      setStatusMessage({ type: 'error', text: 'Selecione ao menos um arquivo de monitorias para importar.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      setColumnMapping(localMapping);
      const consolidated: MonitoringItem[] = [];

      for (const file of selectedFiles) {
        const rows = await processFileToRows(file);
        consolidated.push(...rows);
      }

      if (consolidated.length > 0) {
        setData(consolidated);
        const uniqueAnalysts = new Set(consolidated.map(c => c.NomeAnalista)).size;
        setStatusMessage({ 
          type: 'success', 
          text: `Base de monitorias importada com sucesso! ${consolidated.length} registros e ${uniqueAnalysts} analistas carregados.` 
        });
        setSelectedFiles([]);
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: 'Nenhum dado válido encontrado. Verifique as colunas e o arquivo.' 
        });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: 'Erro ao processar o arquivo. Verifique a planilha.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConsolidateProductivity = async () => {
    if (selectedProdFiles.length === 0) {
      setStatusMessage({ type: 'error', text: 'Selecione ao menos um arquivo de produtividade para importar.' });
      return;
    }

    setIsProdProcessing(true);
    setStatusMessage(null);

    try {
      setProductivityMapping(localProdMapping);
      const consolidatedProd: ProductivityItem[] = [];

      for (const file of selectedProdFiles) {
        const rows = await processProductivityFile(file);
        consolidatedProd.push(...rows);
      }

      if (consolidatedProd.length > 0) {
        setProductivityData(consolidatedProd);
        const totalQty = consolidatedProd.reduce((sum, p) => sum + (p.Quantidade || 1), 0);
        setStatusMessage({ 
          type: 'success', 
          text: `Base de produtividade importada com sucesso! ${consolidatedProd.length} registros com total de ${totalQty} produções.` 
        });
        setSelectedProdFiles([]);
      } else {
        setStatusMessage({ 
          type: 'error', 
          text: 'Nenhum dado de produtividade válido encontrado. Verifique as colunas B, C e D.' 
        });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: 'Erro ao processar arquivo de produtividade.' });
    } finally {
      setIsProdProcessing(false);
    }
  };

  const handleClearData = () => {
    setModalConfig({
      isOpen: true,
      title: 'Excluir Base de Monitorias?',
      description: 'Tem certeza que deseja excluir toda a base de monitorias consolidada? Esta ação limpará os dados da memória e do banco de dados.',
      type: 'confirm',
      onConfirm: () => {
        clearData();
        setStatusMessage({ type: 'success', text: 'Base de monitorias excluída com sucesso.' });
      }
    });
  };

  const handleClearProdData = () => {
    setModalConfig({
      isOpen: true,
      title: 'Excluir Base de Produtividade?',
      description: 'Tem certeza que deseja excluir a base de produtividade dos analistas?',
      type: 'confirm',
      onConfirm: () => {
        clearProductivityData();
        setStatusMessage({ type: 'success', text: 'Base de produtividade excluída com sucesso.' });
      }
    });
  };

  const fieldsList = [
    { label: 'Código do Analista', defaultLetter: 'S', key: 'S' as keyof ColumnMapping },
    { label: 'Nome do Analista', defaultLetter: 'T', key: 'T' as keyof ColumnMapping },
    { label: 'Nome do Monitor', defaultLetter: 'V', key: 'V' as keyof ColumnMapping },
    { label: 'Nome do Supervisor', defaultLetter: 'Y', key: 'Y' as keyof ColumnMapping },
    { label: 'Forma da Monitoria', defaultLetter: 'AA', key: 'AA' as keyof ColumnMapping },
    { label: 'Data da Monitoria', defaultLetter: 'AB', key: 'AB' as keyof ColumnMapping },
    { label: 'Tags de Erro', defaultLetter: 'AE', key: 'AE' as keyof ColumnMapping },
    { label: 'Motivo Macro', defaultLetter: 'AF', key: 'AF' as keyof ColumnMapping },
    { label: 'Erro / Não Erro (0/100)', defaultLetter: 'AH', key: 'AH' as keyof ColumnMapping },
    { label: 'Esteira', defaultLetter: 'R', key: 'R' as keyof ColumnMapping },
    { label: 'Data do Feedback', defaultLetter: 'BT', key: 'BT' as keyof ColumnMapping },
  ];

  const uniqueProdAnalystsCount = new Set(
    productivityData
      .map(p => p.NomeAnalista)
      .filter(isValidAnalystName)
  ).size;

  const uniqueMonAnalystsCount = new Set(
    data
      .map(d => d.NomeAnalista)
      .filter(isValidAnalystName)
  ).size;

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 bg-black text-zinc-100 space-y-8">
      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        description={modalConfig.description}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        confirmText="Sim, excluir"
        cancelText="Cancelar"
      />

      {/* Top Header Row */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-md text-xs font-medium text-zinc-300">
            <RefreshCw size={14} className="text-amber-500" />
            <span>ÚLTIMA MONITORIA</span>
            <span className="font-bold text-white ml-1">{lastProcessed || 'Nenhum'}</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-md border flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'success' 
            ? 'bg-zinc-900 border-amber-600/60 text-amber-500' 
            : 'bg-red-950/50 border-red-800 text-red-400'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: MAPEAMENTO DE ESTEIRAS (MONITORA ↔ TABULADOR) */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-black border border-zinc-800 text-amber-500">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Relacionamento de Esteiras (MonitorA ↔ Tabulador)</h2>
              <p className="text-xs text-zinc-400">
                Produtividade e Monitoria dos analistas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => addEsteiraMapping()}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer border border-zinc-700"
            >
              <Plus size={15} className="text-amber-500" />
              <span>Adicionar Relação</span>
            </button>
            <button
              onClick={() => resetEsteiraMappings()}
              className="flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-zinc-400 hover:text-white px-3.5 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer border border-zinc-800"
              title="Restaurar lista padrão fixada"
            >
              <RotateCcw size={14} />
              <span>Restaurar Padrão</span>
            </button>
          </div>
        </div>

        {/* Esteira Mapping Grid */}
        <div className="bg-black border border-zinc-800/90 rounded-md p-4 overflow-x-auto space-y-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-bold text-zinc-400 uppercase px-2 pb-1 border-b border-zinc-800/80">
            <div className="col-span-5 flex items-center gap-1.5">
              <span className="text-amber-500">1.</span> Esteira MonitorA (Monitoria)
            </div>
            <div className="col-span-6 flex items-center gap-1.5">
              <span className="text-amber-500">2.</span> Tabulador (Produtividade)
            </div>
            <div className="col-span-1 text-center">Ações</div>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {esteiraMappings.map((mapItem, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-zinc-900/80 border border-zinc-800/60 p-2.5 rounded-md hover:border-zinc-700 transition-colors">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={mapItem.monitora}
                    onChange={(e) => updateEsteiraMapping(idx, 'monitora', e.target.value.toUpperCase())}
                    className="w-full bg-black border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                    placeholder="Ex: BTG ONBOARDING PJ"
                  />
                </div>
                <div className="col-span-6">
                  <input
                    type="text"
                    value={mapItem.tabulador}
                    onChange={(e) => updateEsteiraMapping(idx, 'tabulador', e.target.value.toUpperCase())}
                    className="w-full bg-black border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                    placeholder="Ex: ABERTURA PJ"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => removeEsteiraMapping(idx)}
                    className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                    title="Remover linha"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500 pt-1 px-1">
            * Ao importar a base de produtividade do Tabulador, o sistema traduzirá automaticamente os nomes da coluna de esteira para a esteira correspondente do MonitorA.
          </p>
        </div>
      </div>

      {/* SECTION 2: IMPORTAR PRODUTIVIDADE DOS ANALISTAS */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-black border border-zinc-800 text-amber-500">
              <Briefcase size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Importação de produtividade</h2>
              <p className="text-xs text-zinc-400">Configure o mapeamento das colunas de produtividade</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-zinc-400">Total de Produtividade Carregada:</span>
            <span className="text-lg font-bold text-amber-500">
              {productivityData.reduce((acc, curr) => acc + (curr.Quantidade || 1), 0).toLocaleString('pt-BR')} itens
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Mapeamento de Colunas de Produtividade */}
          <div className="lg:col-span-5 bg-black border border-zinc-800/80 p-5 rounded-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sliders size={16} className="text-amber-500" />
              Configuração de Colunas de Produtividade
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  1. Analista
                </label>
                <input
                  type="text"
                  value={localProdMapping.A || 'A'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, A: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="A"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  2. Data
                </label>
                <input
                  type="text"
                  value={localProdMapping.B || 'B'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, B: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="B"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  3. Apuração
                </label>
                <input
                  type="text"
                  value={localProdMapping.C || 'C'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, C: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="C"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  4. Esteira
                </label>
                <input
                  type="text"
                  value={localProdMapping.D || 'D'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, D: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="D"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  5. Tipo de Demanda
                </label>
                <input
                  type="text"
                  value={localProdMapping.E || 'E'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, E: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="E"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  6. Complexidade
                </label>
                <input
                  type="text"
                  value={localProdMapping.F || 'F'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, F: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="F"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  7. Motivo de Reprovação
                </label>
                <input
                  type="text"
                  value={localProdMapping.G || 'G'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, G: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="G"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  8. Prioridade
                </label>
                <input
                  type="text"
                  value={localProdMapping.H || 'H'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, H: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="H"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  9. Reprovação
                </label>
                <input
                  type="text"
                  value={localProdMapping.I || 'I'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, I: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="I"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  10. Segmento
                </label>
                <input
                  type="text"
                  value={localProdMapping.J || 'J'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, J: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="J"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  11. Co Segmento
                </label>
                <input
                  type="text"
                  value={localProdMapping.K || 'K'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, K: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="K"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  12. Tipo Societário
                </label>
                <input
                  type="text"
                  value={localProdMapping.L || 'L'}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, L: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none"
                  placeholder="L"
                />
              </div>
            </div>

            <button
              onClick={handleConsolidateProductivity}
              disabled={isProdProcessing || selectedProdFiles.length === 0}
              className="w-full bg-amber-600 text-zinc-950 font-bold py-3 rounded-md hover:bg-amber-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs cursor-pointer shadow-md uppercase tracking-wider"
            >
              {isProdProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Importando Produtividade...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Importar Produtividade</span>
                </>
              )}
            </button>
          </div>

          {/* Drag and Drop Produtividade + Base Info */}
          <div className="lg:col-span-7 space-y-4">
            <div
              {...getProdRootProps()}
              className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors min-h-[180px] ${
                isProdDragActive
                  ? 'border-amber-600 bg-black'
                  : selectedProdFiles.length > 0
                  ? 'border-amber-600/50 bg-black/60'
                  : 'border-zinc-800 hover:border-zinc-700 bg-black/30'
              }`}
            >
              <input {...getProdInputProps()} />
              <Upload size={36} className={`mb-2 ${selectedProdFiles.length > 0 ? 'text-amber-500' : 'text-zinc-600'}`} />
              <p className="text-xs font-bold text-white">
                Clique ou arraste a <span className="text-amber-500">planilha de Produtividade</span> aqui
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Formatos aceitos: .xlsx, .xls e .csv
              </p>
            </div>

            {selectedProdFiles.length > 0 && (
              <div className="space-y-2 bg-black border border-zinc-800 p-3 rounded-md">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Arquivos de Produtividade Selecionados:</p>
                {selectedProdFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-white">
                    <span className="truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <button onClick={() => removeProdFile(idx)} className="text-zinc-500 hover:text-red-400 cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Base Carregada Summary Box */}
            <div className="bg-black border border-zinc-800 p-5 rounded-md flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Base Carregada (Produtividade)</p>
                <h4 className="text-xl font-bold text-white mt-0.5">{productivityData.length} Produções Registradas</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Última atualização: {productivityLastProcessed || 'N/D'}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase">Analistas Cadastrados</p>
                  <p className="text-lg font-bold text-amber-500">{uniqueProdAnalystsCount} Analistas</p>
                </div>

                {productivityData.length > 0 && (
                  <button
                    onClick={handleClearProdData}
                    className="flex items-center gap-1.5 border border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Excluir Base</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: MAPEAMENTO FIXO DE MONITORIAS */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-md bg-black border border-zinc-800 text-amber-500">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Importação de Monitorias</h2>
              <p className="text-xs text-zinc-400">Importe aqui a base do tabulador</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-zinc-400">Total de Monitorias Carregadas:</span>
            <span className="text-lg font-bold text-amber-500">
              {data.length.toLocaleString('pt-BR')} itens
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Mapeamento de Colunas de Monitorias */}
          <div className="lg:col-span-5 bg-black border border-zinc-800/80 p-5 rounded-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sliders size={16} className="text-amber-500" />
              Configuração de Colunas de Monitoria
            </h3>

            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {fieldsList.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-zinc-300 font-medium block">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={localMapping[field.key] || field.defaultLetter}
                    onChange={(e) => setLocalMapping({ ...localMapping, [field.key]: e.target.value.toUpperCase() })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-white font-mono uppercase focus:border-amber-600 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleConsolidate}
              disabled={isProcessing || selectedFiles.length === 0}
              className="w-full bg-amber-600 text-zinc-950 font-bold py-3 rounded-md hover:bg-amber-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 text-xs cursor-pointer uppercase tracking-wider"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processando Monitorias...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Importar Base de Monitorias</span>
                </>
              )}
            </button>
          </div>

          {/* Drag and Drop Monitorias + Base Info */}
          <div className="lg:col-span-7 space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors min-h-[180px] ${
                isDragActive
                  ? 'border-amber-600 bg-black'
                  : selectedFiles.length > 0
                  ? 'border-amber-600/50 bg-black/60'
                  : 'border-zinc-800 hover:border-zinc-700 bg-black/30'
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={36} className={`mb-2 ${selectedFiles.length > 0 ? 'text-amber-500' : 'text-zinc-600'}`} />
              <p className="text-xs font-bold text-white">
                Clique ou arraste o <span className="text-amber-500">arquivo de monitorias</span> aqui
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Suporta formatos .xlsx, .xls e .csv
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2 bg-black border border-zinc-800 p-3 rounded-md">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Arquivos Selecionados:</p>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-white">
                    <span className="truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <button onClick={() => removeFile(idx)} className="text-zinc-500 hover:text-red-400 cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Base Carregada Summary Box */}
            <div className="bg-black border border-zinc-800 p-5 rounded-md flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Base Carregada (Monitoria)</p>
                <h4 className="text-xl font-bold text-white mt-0.5">{data.length} Monitorias Registradas</h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">Última atualização: {lastProcessed || 'N/D'}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase">Analistas Cadastrados</p>
                  <p className="text-lg font-bold text-amber-500">{uniqueMonAnalystsCount} Analistas</p>
                </div>

                {data.length > 0 && (
                  <button
                    onClick={handleClearData}
                    className="flex items-center gap-1.5 border border-red-900/60 bg-red-950/30 text-red-400 hover:bg-red-950 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Excluir Base</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
