CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    registered_by TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_to_findcord BOOLEAN DEFAULT 0,
    sync_at DATETIME,
    cancelled BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registration_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER REFERENCES registrations(id),
    changed_by TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS penalties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT,
    staff_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    duration TEXT,
    expires_at DATETIME,
    status TEXT DEFAULT 'active',
    revoked_by TEXT,
    revoked_at DATETIME,
    revoke_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_to_findcord BOOLEAN DEFAULT 0,
    sync_at DATETIME
);

CREATE TABLE IF NOT EXISTS registration_stats (
    staff_id TEXT NOT NULL,
    period_type TEXT NOT NULL,
    period_key TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (staff_id, period_type, period_key)
);
