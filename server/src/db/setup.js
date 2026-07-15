const { pool } = require('./index');
const fs = require('fs');
const path = require('path');

async function setup() {
  try {
    console.log('🔧 Running database setup...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema applied');

    const migrate = fs.readFileSync(path.join(__dirname, 'migrate.sql'), 'utf8');
    await pool.query(migrate);
    console.log('✅ Migration applied');

    await pool.end();
    console.log('✅ Database setup complete!');
  } catch (err) {
    console.error('❌ Setup error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

setup();
