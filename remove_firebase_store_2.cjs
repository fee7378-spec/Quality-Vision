const fs = require('fs');
let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

// replace isFirebaseConnected
content = content.replace(/isFirebaseConnected: boolean;\n/g, '');
content = content.replace(/isFirebaseConnected: true,\n/g, '');
content = content.replace(/isFirebaseConnected: false,\n/g, '');

content = content.replace(/\/\/ Save to Firebase/g, '');
content = content.replace(/console\.warn\("Firebase RTDB sync offline or error:", err\);/g, '');
content = content.replace(/useStore\.setState\(\{ isFirebaseConnected: false \}\);/g, '');
content = content.replace(/saveToFirebase\([^;]+;/g, '');

// Also initializeFirebase was a function? Let's see if there are any remaining calls.
fs.writeFileSync('src/store/useStore.ts', content);
