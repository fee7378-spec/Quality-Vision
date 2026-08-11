const fs = require('fs');
let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

// replace the import
content = content.replace(/import \{.*?\} from '\.\.\/lib\/firebase';\n?/g, '');

// remove saveToFirebase blocks
content = content.replace(/saveToFirebase\([\s\S]*?\.catch\(\(err\) => \{\n\s*console\.warn\([\s\S]*?\);\n\s*\}\);/g, '');
content = content.replace(/saveToFirebase\([\s\S]*?\)\.then\(\(\) => \{[\s\S]*?\}\);/g, '');

// clearFirebaseData
content = content.replace(/clearFirebaseData\(\)\.catch\(.*?\);/g, '');

// check for subscribeToFirebaseData
content = content.replace(/subscribeToFirebaseData\([\s\S]*?\);/g, '');

fs.writeFileSync('src/store/useStore.ts', content);
