const fs = require('fs');
let code = fs.readFileSync('src/store/useStore.ts', 'utf8');

code = code.replace(/export const getInitialDates = \(\) => \{\s*return \{\s*start: '2026-07-01',\s*end: '2026-07-31'\s*\};\s*\};/g, 
`export const getInitialDates = () => {
  return {
    start: '',
    end: ''
  };
};`);

code = code.replace(/const range = getCurrentMonthRange\(\);\s*let start = range\.start;\s*let end = range\.end;\s*if \(cleanData\.length > 0\) \{[\s\S]*?if \(sortedDates\.length > 0\) \{\s*start = sortedDates\[0\];\s*end = sortedDates\[sortedDates\.length - 1\];\s*\}\s*\}\s*\}/g,
`    const allDates = cleanData.map(i => i.DataMonitoria).filter(d => /^\\d{4}-\\d{2}-\\d{2}$/.test(d)).sort();
    
    let start = '';
    let end = '';
    
    if (allDates.length > 0) {
      start = allDates[0];
      end = allDates[allDates.length - 1];
    }`);

fs.writeFileSync('src/store/useStore.ts', code);
