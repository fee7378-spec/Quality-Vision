const fs = require('fs');

const files = [
  'src/pages/CapacidadePage.tsx',
  'src/pages/AnaliseEvolucaoPage.tsx',
  'src/pages/OperacaoPage.tsx',
  'src/pages/DashboardPage.tsx',
  'src/pages/MetricasPage.tsx',
  'src/pages/AnalistasPage.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Pattern 1:
    content = content.replace(/Acesse a aba <strong>Importar<\/strong> para carregar a base\./g, '');
    content = content.replace(/Acesse a aba <strong>Importar<\/strong> para carregar a planilha de monitoria\./g, '');
    
    // In DashboardPage:
    content = content.replace(/Acesse a aba <strong>Data Hub<\/strong> para carregar a base\./g, '');
    content = content.replace(/Acesse a aba <strong>Importar<\/strong>/g, '');
    
    fs.writeFileSync(file, content);
  }
}
