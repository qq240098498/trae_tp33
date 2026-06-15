import initSqlJs, { type Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.join(__dirname, 'data')
const DB_PATH = path.join(__dirname, 'data', 'rental.db')

let db: Database | null = null

function ensureDataDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }
}

function saveDb() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  landlord_name TEXT NOT NULL,
  landlord_phone TEXT NOT NULL,
  agent_contact TEXT DEFAULT '',
  rent_amount REAL NOT NULL,
  payment_cycle TEXT NOT NULL CHECK(payment_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  deposit_amount REAL NOT NULL DEFAULT 0,
  contract_start TEXT NOT NULL,
  contract_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contract_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK(file_type IN ('image', 'pdf')),
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL CHECK(reminder_type IN ('45_days', '30_days', '15_days')),
  reminder_date TEXT NOT NULL,
  is_triggered INTEGER DEFAULT 0,
  is_handled INTEGER DEFAULT 0,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repair_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  repair_date TEXT NOT NULL,
  description TEXT NOT NULL,
  result TEXT DEFAULT '',
  cost REAL NOT NULL DEFAULT 0,
  landlord_borne INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS viewing_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL UNIQUE,
  allow_weekday INTEGER NOT NULL DEFAULT 1,
  allow_weekend INTEGER NOT NULL DEFAULT 1,
  weekday_start TEXT DEFAULT '09:00',
  weekday_end TEXT DEFAULT '18:00',
  weekend_start TEXT DEFAULT '10:00',
  weekend_end TEXT DEFAULT '18:00',
  min_notice_hours INTEGER NOT NULL DEFAULT 24,
  extra_rules TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS viewing_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  viewing_date TEXT NOT NULL,
  viewing_time TEXT NOT NULL,
  agent_name TEXT DEFAULT '',
  agent_phone TEXT DEFAULT '',
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);
`

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  ensureDataDir()

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
    
    const repairTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='repair_records'")
    if (!repairTables[0] || repairTables[0].values.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS repair_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          repair_date TEXT NOT NULL,
          description TEXT NOT NULL,
          result TEXT DEFAULT '',
          cost REAL NOT NULL DEFAULT 0,
          landlord_borne INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
        )
      `)
      saveDb()
    }

    const viewingSettingsTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='viewing_settings'")
    if (!viewingSettingsTables[0] || viewingSettingsTables[0].values.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS viewing_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL UNIQUE,
          allow_weekday INTEGER NOT NULL DEFAULT 1,
          allow_weekend INTEGER NOT NULL DEFAULT 1,
          weekday_start TEXT DEFAULT '09:00',
          weekday_end TEXT DEFAULT '18:00',
          weekend_start TEXT DEFAULT '10:00',
          weekend_end TEXT DEFAULT '18:00',
          min_notice_hours INTEGER NOT NULL DEFAULT 24,
          extra_rules TEXT DEFAULT '',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
        )
      `)
      saveDb()
    }

    const viewingRecordsTables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='viewing_records'")
    if (!viewingRecordsTables[0] || viewingRecordsTables[0].values.length === 0) {
      db.run(`
        CREATE TABLE IF NOT EXISTS viewing_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          viewing_date TEXT NOT NULL,
          viewing_time TEXT NOT NULL,
          agent_name TEXT DEFAULT '',
          agent_phone TEXT DEFAULT '',
          note TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
        )
      `)
      saveDb()
    }
  } else {
    db = new SQL.Database()
    db.run(SCHEMA)
    saveDb()
  }

  return db
}

export { saveDb }
