const fs = require('fs');
let code = fs.readFileSync('src/pages/CapacidadePage.tsx', 'utf8');

const regex = /\s*<div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl space-y-3 p-5">[\s\S]*?\{\/\*\s*SECTION 2: Comparação Volume Mês a Mês e Provisão\s*\*\/\}/;

code = code.replace(regex, '\n          {/* SECTION 2: Comparação Volume Mês a Mês e Provisão */}');

fs.writeFileSync('src/pages/CapacidadePage.tsx', code);
