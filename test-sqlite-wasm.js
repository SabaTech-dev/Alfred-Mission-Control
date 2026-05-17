// Test script for node-sqlite3-wasm compatibility with better-sqlite3 API

console.log('Testing node-sqlite3-wasm...');

try {
  // Try to import node-sqlite3-wasm
  const Database = require('node-sqlite3-wasm').default;

  console.log('✅ node-sqlite3-wasm imported successfully');

  // Test basic database operations
  const db = new Database(':memory:');
  console.log('✅ Database created');

  // Create a table
  db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
  console.log('✅ Table created');

  // Insert data
  const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
  stmt.run('test-value');
  console.log('✅ Data inserted');

  // Query data
  const result = db.prepare('SELECT * FROM test').all();
  console.log('✅ Data queried:', result);

  // Close database
  db.close();
  console.log('✅ Database closed');

  console.log('\n✅ All tests passed! node-sqlite3-wasm is compatible with basic better-sqlite3 API');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);

  // Try with alternative import
  console.log('\nTrying alternative import method...');
  try {
    const Sqlite3 = require('node-sqlite3-wasm');
    console.log('✅ node-sqlite3-wasm imported (alternative method)');
    console.log('Exported keys:', Object.keys(Sqlite3));
  } catch (altError) {
    console.error('❌ Alternative import also failed:', altError.message);
  }
}
