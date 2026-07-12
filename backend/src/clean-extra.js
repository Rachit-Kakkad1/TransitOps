const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '../../..');

const filesToDelete = [
  'TransitOps/frontend/src/pages/Dashboard/components/FleetManagerDashboard.jsx',
  'TransitOps/frontend/src/pages/Dashboard/components/DispatcherDashboard.jsx',
  'TransitOps/frontend/src/pages/Dashboard/components/DriverDashboard.jsx',
  'TransitOps/backend/demo-users-info.json',
  'TransitOps/backend/env-debug.txt',
  'TransitOps/backend/db-types-namespace.json',
  'TransitOps/backend/db-types.json',
  'TransitOps/backend/db-columns-profiles.json',
  'TransitOps/backend/db-columns-auth-users.json',
  'TransitOps/backend/db-helper-result.json',
  'TransitOps/backend/git-diagnostic.json',
  'TransitOps/backend/src/git-helper.js',
  'TransitOps/backend/src/db-helper.js',
  'TransitOps/backend/src/db-query-types.js'
];

const dirsToDelete = [
  'TransitOps/frontend/src/pages/Dashboard/components'
];

function clean() {
  console.log('Cleaning extra files...');
  for (const f of filesToDelete) {
    const fullPath = path.join(projectRoot, f);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`Deleted: ${f}`);
    }
  }

  for (const d of dirsToDelete) {
    const fullPath = path.join(projectRoot, d);
    if (fs.existsSync(fullPath)) {
      fs.rmdirSync(fullPath);
      console.log(`Deleted dir: ${d}`);
    }
  }
}

clean();
