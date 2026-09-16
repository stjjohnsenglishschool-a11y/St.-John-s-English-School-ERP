const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, getDocs, writeBatch } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function migrate() {
  if (!fs.existsSync('./supabase_dump.json')) {
    console.error('supabase_dump.json not found!');
    return;
  }
  const dump = JSON.parse(fs.readFileSync('./supabase_dump.json', 'utf8'));
  console.log('Starting migration to Firebase Firestore...');

  for (const [tableName, rows] of Object.entries(dump)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`Skipping empty table: ${tableName}`);
      continue;
    }
    console.log(`Migrating table ${tableName} (${rows.length} rows)...`);
    
    // Determine primary key field if possible
    for (const row of rows) {
      // Find candidate ID
      let docId = row.user_id || row.id || row.code || row.student_id || row.employee_id || row.department_code || row.class_code || row.subject_code || row.vendor_code || row.school_code || row.log_id || row.asset_id || row.item_id || row.letter_id || row.card_id || row.assignment_id || row.notice_id || row.slip_id;
      
      if (!docId) {
        docId = 'doc_' + Math.random().toString(36).substr(2, 9);
      }
      docId = String(docId);

      // Clean undefined / null values if needed
      const cleanRow = { ...row };
      // Make sure array fields like active_module are saved cleanly
      if (tableName === 'user_master') {
        cleanRow.allowed_modules = cleanRow.active_module || cleanRow.allowed_modules || [];
        cleanRow.active_module = cleanRow.active_module || cleanRow.allowed_modules || [];
      }

      await setDoc(doc(db, tableName, docId), cleanRow, { merge: true });
    }
    console.log(`Successfully migrated ${tableName}`);
  }
  console.log('All table data transferred from Supabase to Firebase Firestore!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
