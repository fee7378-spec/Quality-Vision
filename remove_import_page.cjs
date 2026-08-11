const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf-8');
appTsx = appTsx.replace("import { ImportPage } from './pages/ImportPage';\n", "");
appTsx = appTsx.replace('          <Route path="/import" element={<ImportPage />} />\n', "");
fs.writeFileSync('src/App.tsx', appTsx);

let sidebarTsx = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');
sidebarTsx = sidebarTsx.replace("  { path: '/import', label: 'Data Hub', icon: Database },\n", "");
fs.writeFileSync('src/components/Sidebar.tsx', sidebarTsx);
