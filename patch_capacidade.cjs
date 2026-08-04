const fs = require('fs');
let code = fs.readFileSync('src/pages/CapacidadePage.tsx', 'utf8');

// Remove ParametrosPage import
code = code.replace(/import\s*\{\s*ParametrosPage\s*\}\s*from\s*'[^']+';\n?/, '');

// Remove activeTab state
code = code.replace(/const\s*\[activeTab,\s*setActiveTab\]\s*=\s*useState<string>\('projecao'\);\n?/, '');

// Remove Navigation Tabs block
code = code.replace(/\{\/\*\s*Navigation Tabs\s*\*\/\}[\s\S]*?\{\/\*\s*KPI Cards Row\s*\*\/\}/, '{/* KPI Cards Row */}');

// Remove activeTab === 'projecao' ? ( <> ) condition
code = code.replace(/\{activeTab === 'projecao' \? \(\s*<>\s*/, '');

// Remove the end condition for activeTab
code = code.replace(/\s*<\/>\s*\)\s*:\s*\(\s*\/\*\s*TAB 2: Parâmetros de Metas e TMO por Esteira\s*\*\/[\s\S]*?\}\s*(?=<div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl space-y-3 p-5">)/, '');

fs.writeFileSync('src/pages/CapacidadePage.tsx', code);
