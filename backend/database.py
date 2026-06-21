import os
import sqlite3
import json
import uuid
import hashlib
import secrets
from pathlib import Path
from datetime import datetime

try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False

_DB_PATH_OVERRIDE = os.getenv("DATABASE_PATH")
if _DB_PATH_OVERRIDE:
    DB_PATH = Path(_DB_PATH_OVERRIDE)
else:
    DB_PATH = Path(__file__).parent / "data" / "krishisync.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        name TEXT,
        phone TEXT,
        language TEXT DEFAULT 'EN',
        state TEXT,
        district TEXT,
        village TEXT,
        lat REAL,
        lon REAL,
        land_size_acres REAL,
        soil_type TEXT,
        farm_type TEXT DEFAULT 'rainfed',
        preferences TEXT DEFAULT '{"theme":"light","notifications":true}',
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    try:
        c.execute("SELECT is_admin FROM users LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE")

    c.execute('''CREATE TABLE IF NOT EXISTS farms (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        crop_name TEXT,
        variety TEXT,
        planting_date TEXT,
        soil_type TEXT,
        area_acres REAL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS daily_logs (
        id TEXT PRIMARY KEY,
        farm_id TEXT,
        log_date TEXT,
        dap INTEGER,
        actions_completed TEXT,
        disease_notes TEXT,
        weather_data TEXT,
        FOREIGN KEY(farm_id) REFERENCES farms(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS land_analyses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        city TEXT,
        lat REAL,
        lon REAL,
        result_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    conn.commit()
    conn.close()

# ── Auth ─────────────────────────────────────────────────────────

def hash_password(password):
    if BCRYPT_AVAILABLE:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"

def verify_password(password, stored):
    if BCRYPT_AVAILABLE:
        return bcrypt.checkpw(password.encode('utf-8'), stored.encode('utf-8'))
    salt, h = stored.split("$", 1)
    return hashlib.sha256((salt + password).encode()).hexdigest() == h

def generate_token():
    return secrets.token_hex(32)

def create_user(email, password, name, phone="", state="", district="", village="", lat=None, lon=None, land_size=None, soil_type="", farm_type="rainfed", language="EN", is_admin=False):
    conn = get_db()
    c = conn.cursor()
    try:
        uid = f"user_{uuid.uuid4().hex[:12]}"
        pwd = hash_password(password)
        prefs = json.dumps({"theme": "light", "notifications": True})
        c.execute(
            """INSERT INTO users (id, email, password_hash, name, phone, language, state, district, village,
               lat, lon, land_size_acres, soil_type, farm_type, preferences, is_admin)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (uid, email, pwd, name, phone, language, state, district, village,
             lat, lon, land_size, soil_type, farm_type, prefs, is_admin)
        )
        conn.commit()
        return {"id": uid, "email": email, "name": name}
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def login_user(email, password):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=?", (email,))
    row = c.fetchone()
    conn.close()
    if row and verify_password(password, row["password_hash"]):
        return dict(row)
    return None

def get_user(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_user_by_email(email):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=?", (email,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def update_user(user_id, **kwargs):
    allowed = {"name", "phone", "language", "state", "district", "village",
               "lat", "lon", "land_size_acres", "soil_type", "farm_type", "preferences"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        return False
    updates["updated_at"] = datetime.now().isoformat()
    set_clause = ", ".join(f"{k}=?" for k in updates)
    vals = list(updates.values()) + [user_id]
    conn = get_db()
    c = conn.cursor()
    c.execute(f"UPDATE users SET {set_clause} WHERE id=?", vals)
    conn.commit()
    conn.close()
    return c.rowcount > 0

# ── Farm CRUD ────────────────────────────────────────────────────

def create_farm(user_id, crop_name, variety="", planting_date=None, soil_type="", area_acres=1.0):
    conn = get_db()
    c = conn.cursor()
    farm_id = f"farm_{uuid.uuid4().hex[:8]}"
    if not planting_date:
        planting_date = datetime.now().strftime("%Y-%m-%d")
    c.execute(
        "INSERT INTO farms (id, user_id, crop_name, variety, planting_date, soil_type, area_acres) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (farm_id, user_id, crop_name, variety, planting_date, soil_type, area_acres)
    )
    conn.commit()
    conn.close()
    return farm_id

def get_user_farms(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM farms WHERE user_id=? ORDER BY planting_date DESC", (user_id,))
    farms = [dict(row) for row in c.fetchall()]
    conn.close()
    return farms

def log_daily_activity(farm_id, log_date, dap, actions, diseases, weather):
    conn = get_db()
    c = conn.cursor()
    log_id = f"log_{uuid.uuid4().hex[:8]}"
    c.execute(
        "INSERT INTO daily_logs (id, farm_id, log_date, dap, actions_completed, disease_notes, weather_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (log_id, farm_id, log_date, dap, json.dumps(actions), json.dumps(diseases), json.dumps(weather))
    )
    conn.commit()
    conn.close()
    return log_id

def get_farm_logs(farm_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM daily_logs WHERE farm_id=? ORDER BY log_date DESC", (farm_id,))
    logs = [dict(row) for row in c.fetchall()]
    conn.close()
    return logs

# ── Legacy backward-compatible ──────────────────────────────────

def get_or_create_user(user_id="default_user", name="Farmer", language="EN", region="Karnataka"):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id=?", (user_id,))
    user = c.fetchone()
    if not user:
        prefs = json.dumps({"theme": "light", "notifications": True})
        c.execute(
            "INSERT INTO users (id, name, language, state, preferences) VALUES (?, ?, ?, ?, ?)",
            (user_id, name, language, region, prefs)
        )
        conn.commit()
        c.execute("SELECT * FROM users WHERE id=?", (user_id,))
        user = c.fetchone()
    conn.close()
    return dict(user)

# ── Chat Sessions ────────────────────────────────────────────────

def create_chat_session(user_id, title="New Chat"):
    conn = get_db()
    c = conn.cursor()
    sid = f"chat_{uuid.uuid4().hex[:12]}"
    c.execute("INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)", (sid, user_id, title))
    conn.commit()
    conn.close()
    return sid

def get_chat_sessions(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM chat_sessions WHERE user_id=? ORDER BY updated_at DESC", (user_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_chat_session(session_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM chat_sessions WHERE id=?", (session_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def update_chat_session_title(session_id, title):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE chat_sessions SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (title, session_id))
    conn.commit()
    conn.close()

def touch_chat_session(session_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE chat_sessions SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (session_id,))
    conn.commit()
    conn.close()

def delete_chat_session(session_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM chat_messages WHERE session_id=?", (session_id,))
    c.execute("DELETE FROM chat_sessions WHERE id=?", (session_id,))
    conn.commit()
    conn.close()

# ── Chat Messages ────────────────────────────────────────────────

def add_chat_message(session_id, role, content):
    conn = get_db()
    c = conn.cursor()
    mid = f"msg_{uuid.uuid4().hex[:12]}"
    c.execute("INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)",
              (mid, session_id, role, content))
    conn.commit()
    conn.close()
    return mid

def get_chat_messages(session_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM chat_messages WHERE session_id=? ORDER BY created_at ASC", (session_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

# ── Land Analyses ────────────────────────────────────────────────

def save_land_analysis(user_id, city, lat, lon, result_json):
    conn = get_db()
    c = conn.cursor()
    aid = f"land_{uuid.uuid4().hex[:12]}"
    c.execute("INSERT INTO land_analyses (id, user_id, city, lat, lon, result_json) VALUES (?, ?, ?, ?, ?, ?)",
              (aid, user_id, city, lat, lon, json.dumps(result_json)))
    conn.commit()
    conn.close()
    return aid

def get_land_analyses(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM land_analyses WHERE user_id=? ORDER BY created_at DESC", (user_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_land_analysis(analysis_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM land_analyses WHERE id=?", (analysis_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_land_analysis(analysis_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM land_analyses WHERE id=?", (analysis_id,))
    conn.commit()
    conn.close()

init_db()
