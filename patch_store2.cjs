const fs = require('fs');
let code = fs.readFileSync('src/store/useStore.ts', 'utf8');

code = code.replace(/setProductivityData: \(prodItems, timestamp\) => \{/,
`setProductivityData: (prodItems, timestamp) => {
    const allProdDates = prodItems.map(i => i.DataProdutividade).filter(d => /^\\d{4}-\\d{2}-\\d{2}$/.test(d)).sort();
    let currentStart = get().startDate;
    let currentEnd = get().endDate;
    
    if (allProdDates.length > 0) {
      const minPDate = allProdDates[0];
      const maxPDate = allProdDates[allProdDates.length - 1];
      if (!currentStart || minPDate < currentStart) currentStart = minPDate;
      if (!currentEnd || maxPDate > currentEnd) currentEnd = maxPDate;
    }
`);

code = code.replace(/productivityData: prodItems,\s*productivityLastProcessed: ts/,
`productivityData: prodItems,
      productivityLastProcessed: ts,
      startDate: currentStart,
      endDate: currentEnd`);

fs.writeFileSync('src/store/useStore.ts', code);
