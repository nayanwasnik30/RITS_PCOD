import sqlite3

def init_db():
    conn = sqlite3.connect('rit_pcod.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS entries
                 (date TEXT PRIMARY KEY, weight_morn REAL, steps INTEGER,
                  sleep REAL, mood TEXT, notes TEXT)''')
    conn.commit()
    conn.close()