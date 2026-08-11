const fs = require('fs');

let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

const startIdx = content.indexOf('  setData: (newData, timestamp) => {');
if (startIdx !== -1) {
  const replacement = `  setData: (newData, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const cleanData = sanitizeItems(newData).map(item => ({
      ...item,
      DataMonitoria: normalizeDateStr(item.DataMonitoria)
    }));
    const allDates = cleanData.map(i => i.DataMonitoria).filter(d => /^\\d{4}-\\d{2}-\\d{2}$/.test(d)).sort();
    
    const fallbackRange = getCurrentMonthRange();
    let start = fallbackRange.start;
    let end = fallbackRange.end;
    
    if (allDates.length > 0) {
      start = allDates[0];
      end = allDates[allDates.length - 1];
    }

    set({ 
      data: cleanData, 
      lastProcessed: ts,
      startDate: start,
      endDate: end
    });
  },

  setProductivityData: (prodItems, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const cleanProd = sanitizeItems(prodItems).map(item => ({
      ...item,
      DataProdutividade: normalizeDateStr(item.DataProdutividade)
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
    set({ esteiraMappings: initialEsteiraMappings });
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
      esteiraMappings: initialEsteiraMappings
    });
  },
  resetToCurrentMonth: () => {
    const current = getCurrentMonthRange();
    set({ startDate: current.start, endDate: current.end });
  }
}));
`;
  content = content.substring(0, startIdx) + replacement;
  fs.writeFileSync('src/store/useStore.ts', content);
}
