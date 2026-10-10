import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if original Cricket DB file exists
const cricketDbPath = path.join(__dirname, 'Cricket');
const fallbackDbPath = path.join(__dirname, 'cricket_reports.db');

const actualDbPath = fs.existsSync(cricketDbPath) ? cricketDbPath : fallbackDbPath;
console.log('Using SQLite DB Path:', actualDbPath);

export const db = new Database(actualDbPath);

export function getData(query, params = []) {
  try {
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    return { status: 200, data: rows };
  } catch (err) {
    console.error('Database Query Error:', err);
    throw err;
  }
}
