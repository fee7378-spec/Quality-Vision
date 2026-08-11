const fs = require('fs');
let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');
console.log(content.split('\n').map((l, i) => `${i+1}: ${l}`).join('\n'));
