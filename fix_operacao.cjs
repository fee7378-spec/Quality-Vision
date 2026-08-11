const fs = require('fs');

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

// Update prioVolume
const prioReplace = `
    const filtPrio = filterSupabase(volumetriaPrioridades);
    const prioVolume = filtPrio.reduce((acc, curr) => acc + (Number(getVal(curr, 'quantidade')) || 0), 0);
    const prioPercent = totalVolume > 0 ? ((prioVolume / totalVolume) * 100).toFixed(1).replace('.', ',') : '0,0';`;
    
content = content.replace(/    const filtPrio = filterSupabase\(volumetriaPrioridades\);[\s\S]*?const prioPercent = [^;]+;/, prioReplace.trim());

// Update pendentesCount/reprovadosCount formatting in JSX
content = content.replace(
  /<strong className="text-amber-700 font-bold">\{kpis\.pendentesCount\}<\/strong> pend\. \/ <strong className="text-red-600 font-bold">\{kpis\.reprovadosCount\}<\/strong> repr\./g,
  '<strong className="text-amber-700 font-bold">{kpis.pendentesCount.toLocaleString(\'pt-BR\')}</strong> pend. / <strong className="text-red-600 font-bold">{kpis.reprovadosCount.toLocaleString(\'pt-BR\')}</strong> repr.'
);

content = content.replace(
  /<span>\{kpis\.pendReprovTotal\} Ocorrências<\/span>/g,
  '<span>{kpis.pendReprovTotal.toLocaleString(\'pt-BR\')} Ocorrências</span>'
);

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
