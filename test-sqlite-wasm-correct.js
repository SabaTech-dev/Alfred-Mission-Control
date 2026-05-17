// Test script for node-sqlite3-wasm with correct API

console.log('Testing node-sqlite3-wasm with correct API...');

try {
  // Import with destructuring as per documentation
  const { Database } = require("node-sqlite3-wasm");

  console.log('✅ node-sqlite3-wasm imported successfully');

  // Test basic database operations
  const db = new Database(':memory:');
  console.log('✅ Database created');

  // Create a table
  db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
  console.log('✅ Table created');

  // Insert data using db.run()
  const result1 = db.run('INSERT INTO test (name) VALUES (?)', 'test-value-1');
  console.log('✅ Data inserted (run):', result1);

  // Insert more data
  db.run('INSERT INTO test (name) VALUES (?)', 'test-value-2');
  console.log('✅ More data inserted');

  // Query data using db.get()
  const row = db.get('SELECT * FROM test WHERE id = 1');
  console.log('✅ Single row retrieved (get):', row);

  // Query all data using db.all()
  const rows = db.all('SELECT * FROM test');
  console.log('✅ All rows retrieved (all):', rows);

  // Test prepared statement (need to finalize manually)
  const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
  try {
    stmt.run('test-value-3');
    console.log('✅ Data inserted via prepared statement');
  } finally {
    stmt.finalize(); // Important: must finalize manually
    console.log('✅ Statement finalized');
  }

  // Verify all data
  const allRows = db.all('SELECT * FROM test');
  console.log('✅ All rows after prepared statement:', allRows);

  // Close database (Important: must close manually)
  db.close();
  console.log('✅ Database closed');

  console.log('\n✅ All tests passed! node-sqlite3-wasm works with similar API to better-sqlite3');
  console.log('\nKey differences to note:');
  console.log('- Import: const { Database } = require("node-sqlite3-wasm")');
  console.log('- Must call db.close() manually to avoid memory leaks');
  console.log('- Must call stmt.finalize() manually for prepared statements');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
