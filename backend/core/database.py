import sqlite3
import json
import uuid
import hashlib
import secrets
from pathlib import Path
from datetime import datetime

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
        c.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE")
    except sqlite3.OperationalError:
        pass

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
    c.execute('''CREATE TABLE IF NOT EXISTS custom_crops (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        data_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    conn.commit()
    conn.close()

# ── Auth ─────────────────────────────────────────────────────────

def hash_password(password):
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"

def verify_password(password, stored):
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

init_db()
def save_custom_crop(name, data_dict):
    conn = get_db()
    c = conn.cursor()
    try:
        cid = f"crop_{uuid.uuid4().hex[:8]}"
        c.execute("INSERT OR REPLACE INTO custom_crops (id, name, data_json) VALUES (?, ?, ?)",
                  (cid, name, json.dumps(data_dict)))
        conn.commit()
        return cid
    except Exception as e:
        print(f"Error saving custom crop: {e}")
        return None
    finally:
        conn.close()

def get_custom_crops():
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("SELECT name, data_json FROM custom_crops")
        rows = c.fetchall()
        return [json.loads(r["data_json"]) for r in rows]
    except Exception as e:
        print(f"Error getting custom crops: {e}")
        return []
    finally:
        conn.close()
