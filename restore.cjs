const fs = require('fs');

const dumpLines = fs.readFileSync('op_dump.txt', 'utf-8').split('\n');
let content = dumpLines.map(line => {
    const idx = line.indexOf(': ');
    if (idx !== -1) {
        return line.substring(idx + 2);
    }
    return line;
}).join('\n');

// Clean up the "<truncated 24 bytes>" that was inserted by the cat command output
content = content.replace('<truncated 24 bytes>\n', '');
fs.writeFileSync('src/pages/OperacaoPage.tsx', content);

