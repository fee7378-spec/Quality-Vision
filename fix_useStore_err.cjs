const fs = require('fs');
const code = fs.readFileSync('src/store/useStore.ts', 'utf-8');

// Find the problem around `const { productivityData, productivityLastProcessed } = get();`
const startIdx = code.indexOf('const { productivityData, productivityLastProcessed } = get();');
const endIdx = code.indexOf('  setProductivityData: (prodItems, timestamp) => {', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `
    set({ 
      data: cleanData, 
      lastProcessed: ts,
      startDate: start,
      endDate: end
    });
    
    // Trigger derived updates
    get().computeTagsDistribuition();
    get().computeWeeklyErrors();
    get().computeProductivityEvolution();
`;
  let newCode = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('src/store/useStore.ts', newCode);
}
