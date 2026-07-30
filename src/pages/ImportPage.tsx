import { useState, useCallback } from 'react';
import { Upload, Trash2, X, RefreshCw, FileText, AlertTriangle, CheckCircle, Sliders, Briefcase } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { 
  useStore, 
  ColumnMapping, 
  ProductivityColumnMapping, 
  MonitoringItem, 
  ProductivityItem, 
  normalizeDateStr 
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
    setProductivityMapping
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
      const y = rawVal.getFullYear();
      const m = String(rawVal.getMonth() + 1).padStart(2, '0');
      const d = String(rawVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    if (typeof rawVal === 'number' || (!isNaN(Number(rawVal)) && !String(rawVal).includes('/') && !String(rawVal).includes('-') && !String(rawVal).includes(' '))) {
      const num = Number(rawVal);
      if (num > 30000 && num < 60000) {
        const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(dateObj.getTime())) {
          const y = dateObj.getUTCFullYear();
          const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const d = String(dateObj.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
    }

    return normalizeDateStr(rawVal);
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

            const monitorVal = idxMonitor >= 0 && row[idxMonitor] ? String(row[idxMonitor]).trim() : 'MONITOR';
            const supervisorVal = idxSupervisor >= 0 && row[idxSupervisor] ? String(row[idxSupervisor]).trim() : 'SUPERVISOR';
            const formaVal = idxForma >= 0 && row[idxForma] ? String(row[idxForma]).trim() : 'Gravada';
            const dataVal = idxData >= 0 ? parseDateValue(row[idxData]) : new Date().toISOString().split('T')[0];
            const tagVal = idxTag >= 0 && row[idxTag] ? String(row[idxTag]).trim() : 'Geral';
            const macroVal = idxMacro >= 0 && row[idxMacro] ? String(row[idxMacro]).trim() : 'Geral';
            const erroVal = idxErro >= 0 ? parseErroValue(row[idxErro]) : '100';
            const esteiraVal = idxEsteira >= 0 && row[idxEsteira] ? String(row[idxEsteira]).trim() : defaultEsteira;
            const feedbackVal = idxFeedback >= 0 && row[idxFeedback] ? parseDateValue(row[idxFeedback]) : '';

            items.push({
              id: `${i}-${Date.now()}`,
              CodigoAnalista: codeVal || `MAT-${i}`,
              NomeAnalista: nameVal || `ANALISTA ${i}`,
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

          const idxEsteira = colLetterToIndex(localProdMapping.B);
          const idxAnalista = colLetterToIndex(localProdMapping.C);
          const idxData = colLetterToIndex(localProdMapping.D);

          const prodItems: ProductivityItem[] = [];

          let startRow = 0;
          if (rawRows[0]) {
            const row0Analista = idxAnalista >= 0 && rawRows[0][idxAnalista] ? String(rawRows[0][idxAnalista]).toLowerCase() : '';
            const row0Esteira = idxEsteira >= 0 && rawRows[0][idxEsteira] ? String(rawRows[0][idxEsteira]).toLowerCase() : '';
            if (row0Analista.includes('analista') || row0Analista.includes('nome') || row0Esteira.includes('esteira')) {
              startRow = 1;
            }
          }

          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const esteiraVal = idxEsteira >= 0 && row[idxEsteira] ? String(row[idxEsteira]).trim() : 'Geral';
            const rawAnalistaOrQty = idxAnalista >= 0 && row[idxAnalista] ? String(row[idxAnalista]).trim() : '';
            const dataVal = idxData >= 0 ? parseDateValue(row[idxData]) : new Date().toISOString().split('T')[0];

            if (!rawAnalistaOrQty && !esteiraVal) continue;

            let nomeAnalista = rawAnalistaOrQty ? rawAnalistaOrQty.trim().toUpperCase() : `ANALISTA ${i}`;
            let qty = 1;

            prodItems.push({
              id: `prod-${i}-${Date.now()}`,
              Esteira: esteiraVal || 'Geral',
              NomeAnalista: nomeAnalista,
              DataProdutividade: dataVal,
              Quantidade: qty
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

  return (
    <div className="p-6 md:p-8 bg-black text-zinc-100 min-h-screen overflow-y-auto space-y-8">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Importação de Bases</h1>
          <p className="text-zinc-400 text-sm mt-1">Carregue e processe planilhas de Monitoria de Qualidade e Produtividade dos Analistas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-medium text-zinc-300">
            <RefreshCw size={14} className="text-[#ffff00]" />
            <span>ÚLTIMA MONITORIA</span>
            <span className="font-bold text-white ml-1">{lastProcessed || 'Nenhum'}</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-medium ${
          statusMessage.type === 'success' 
            ? 'bg-zinc-900 border-[#ffff00]/60 text-[#ffff00]' 
            : 'bg-red-950/50 border-red-800 text-red-400'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SECTION 1: SEÇÃO DE PRODUTIVIDADE DOS ANALISTAS */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-[#ffff00]">
              <Briefcase size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Importar Produtividade dos Analistas</h2>
              <p className="text-xs text-zinc-400">Configure as colunas de Esteira (B), Analista/Produtividade (C) e Data (D)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-zinc-400">Total de Produtividade Carregada:</span>
            <span className="text-lg font-bold text-[#ffff00]">
              {productivityData.reduce((acc, curr) => acc + (curr.Quantidade || 1), 0).toLocaleString('pt-BR')} itens
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Mapeamento de Colunas de Produtividade */}
          <div className="lg:col-span-5 bg-black border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sliders size={16} className="text-[#ffff00]" />
              Configuração de Colunas de Produtividade
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  1. Esteira (Contabilizar Esteira)
                </label>
                <input
                  type="text"
                  value={localProdMapping.B}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, B: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:border-[#ffff00] outline-none"
                  placeholder="B"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Fixo/Padrão: Coluna B</p>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  2. Analista / Produtividade
                </label>
                <input
                  type="text"
                  value={localProdMapping.C}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, C: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:border-[#ffff00] outline-none"
                  placeholder="C"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Fixo/Padrão: Coluna C (Nome ou Quantidade)</p>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  3. Data da Produtividade
                </label>
                <input
                  type="text"
                  value={localProdMapping.D}
                  onChange={(e) => setLocalProdMapping({ ...localProdMapping, D: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:border-[#ffff00] outline-none"
                  placeholder="D"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Fixo/Padrão: Coluna D</p>
              </div>
            </div>

            <button
              onClick={handleConsolidateProductivity}
              disabled={isProdProcessing || selectedProdFiles.length === 0}
              className="w-full bg-[#ffff00] text-black font-bold py-3 rounded-xl hover:bg-[#e6e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs cursor-pointer shadow-lg"
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

          {/* Drag and Drop Produtividade */}
          <div className="lg:col-span-7 space-y-4">
            <div
              {...getProdRootProps()}
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors min-h-[180px] ${
                isProdDragActive
                  ? 'border-[#ffff00] bg-black'
                  : selectedProdFiles.length > 0
                  ? 'border-[#ffff00]/50 bg-black/60'
                  : 'border-zinc-800 hover:border-zinc-700 bg-black/30'
              }`}
            >
              <input {...getProdInputProps()} />
              <Upload size={36} className={`mb-2 ${selectedProdFiles.length > 0 ? 'text-[#ffff00]' : 'text-zinc-600'}`} />
              <p className="text-xs font-bold text-white">
                Clique ou arraste a <span className="text-[#ffff00]">planilha de Produtividade</span> aqui
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Formatos aceitos: .xlsx, .xls e .csv
              </p>
            </div>

            {selectedProdFiles.length > 0 && (
              <div className="space-y-2 bg-black border border-zinc-800 p-3 rounded-xl">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Arquivos de Produtividade Selecionados:</p>
                {selectedProdFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-white">
                    <span className="truncate">{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <button onClick={() => removeProdFile(idx)} className="text-zinc-500 hover:text-red-400">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {productivityData.length > 0 && (
              <div className="flex items-center justify-between bg-black border border-zinc-800 p-4 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-white">{productivityData.length} registros de produtividade</p>
                  <p className="text-[10px] text-zinc-500">Última atualização: {productivityLastProcessed || 'N/D'}</p>
                </div>
                <button
                  onClick={handleClearProdData}
                  className="flex items-center gap-1.5 border border-red-900/60 bg-red-950/20 text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Excluir Produtividade</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: BASE DE MONITORIAS DE QUALIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuração de Colunas */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black border border-zinc-800 rounded-xl text-[#ffff00]">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mapeamento Fixo de Monitorias</h2>
              <p className="text-xs text-zinc-400">S, T, V, Y, AA, AB, AE, AF, AH, R, BT</p>
            </div>
          </div>

          <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {fieldsList.map((field) => (
              <div key={field.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-300 font-medium">
                    {field.label}
                  </label>
                  <span className="text-[11px] text-[#ffff00] font-mono">Padrão: {field.defaultLetter}</span>
                </div>
                <input
                  type="text"
                  value={localMapping[field.key] || field.defaultLetter}
                  onChange={(e) => setLocalMapping({ ...localMapping, [field.key]: e.target.value.toUpperCase() })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white font-mono uppercase focus:border-[#ffff00] outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleConsolidate}
            disabled={isProcessing || selectedFiles.length === 0}
            className="w-full bg-[#ffff00] text-black font-bold py-3.5 rounded-xl hover:bg-[#e6e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Processando Planilha...</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Importar Base de Monitorias</span>
              </>
            )}
          </button>
        </div>

        {/* Right Section: Drag and Drop Base File Uploader */}
        <div className="lg:col-span-7 space-y-8">
          {/* Base File Upload Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-[#ffff00]">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Base de Monitorias de Qualidade</h3>
                <p className="text-xs text-zinc-400">Selecione o arquivo Excel ou CSV com os dados das monitorias</p>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors min-h-[200px] ${
                isDragActive
                  ? 'border-[#ffff00] bg-black'
                  : selectedFiles.length > 0
                  ? 'border-[#ffff00]/50 bg-black/40'
                  : 'border-zinc-800 hover:border-zinc-700 bg-black/20'
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={40} className={`mb-3 ${selectedFiles.length > 0 ? 'text-[#ffff00]' : 'text-zinc-600'}`} />
              <p className="text-sm font-semibold text-white">
                Clique ou arraste o <span className="text-[#ffff00]">arquivo de monitorias</span> aqui
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Suporta formatos .xlsx, .xls e .csv
              </p>
            </div>

            {/* List of Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Arquivos Selecionados:</p>
                <div className="space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-black border border-zinc-800 p-3 rounded-xl text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={16} className="text-[#ffff00] flex-shrink-0" />
                        <span className="font-semibold text-white truncate">{file.name}</span>
                        <span className="text-zinc-500 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                        title="Remover arquivo"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current Base Info */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">Base Carregada</p>
              <h4 className="text-2xl font-bold text-white mt-1">{data.length} Monitorias Registradas</h4>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Analistas Cadastrados</p>
              <p className="text-xl font-bold text-[#ffff00]">
                {new Set(data.map((d) => d.NomeAnalista)).size} Analistas
              </p>
            </div>
          </div>

          {/* Danger Zone: Excluir Base Consolidada */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Atenção !</span>
            </div>
            <p className="text-xs text-zinc-400">
              Caso deseje reiniciar o sistema e remover todas as monitorias e analistas gravados na memória local.
            </p>
            <button
              onClick={handleClearData}
              className="flex items-center gap-2 border border-red-900/80 bg-red-950/30 text-red-400 hover:bg-red-950 hover:border-red-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Excluir Base Registrada</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
