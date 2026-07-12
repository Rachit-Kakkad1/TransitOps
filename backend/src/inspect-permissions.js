const prisma = require('./config/db');
const fs = require('fs');
const path = require('path');

async function inspect() {
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM public.permissions
    `;
    const serialized = JSON.stringify(result, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
    fs.writeFileSync(path.join(__dirname, '../permissions-count.json'), serialized);
    console.log('Permissions count checked successfully');
  } catch (err) {
    fs.writeFileSync(path.join(__dirname, '../permissions-count.json'), JSON.stringify({ error: err.message }, null, 2));
  }
}

inspect();
