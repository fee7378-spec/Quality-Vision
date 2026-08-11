const fs = require('fs');

let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

// Remove import
content = content.replace("import { saveToFirebase, clearFirebaseData, subscribeToFirebaseData } from '../lib/firebase';\n", "");

// Replace usage of saveToFirebase, clearFirebaseData, subscribeToFirebaseData
// 1. in setData
content = content.replace(/saveToFirebase\([^]*?\.catch\(\(err\) => \{\n.*?console\.warn\(.*?\);\n.*?\}\);/g, '');

// 2. in setProductivityData
content = content.replace(/saveToFirebase\([^]*?\.catch\(\(err\) => \{\n.*?console\.warn\(.*?\);\n.*?\}\);/g, '');

// 3. in clearData
content = content.replace(/clearFirebaseData\(\)\.catch\(console\.warn\);/g, '');
content = content.replace(/clearFirebaseData\(\)\.catch\(\(err\) => console\.warn\('Error clearing firebase', err\)\);/g, '');

// 4. initializeFirebase / useEffect logic where subscribeToFirebaseData is used
// Wait, is subscribeToFirebaseData used inside useStore or somewhere else? Let's check:
