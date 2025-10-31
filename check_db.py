import sqlite3
import os

# Check all possible database locations
db_paths = [
    ('app.db', 'backend/instance/app.db'),
    ('beacon_blast.db', 'backend/instance/beacon_blast.db'),
    ('beacon_blast_dev.db', 'backend/instance/beacon_blast_dev.db'),
]

print("=== Checking all database files ===\n")

for name, path in db_paths:
    if os.path.exists(path):
        print(f"\n{'='*60}")
        print(f"Database: {name} ({path})")
        print(f"Size: {os.path.getsize(path)} bytes")
        print('='*60)
        
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print(f"\nTables: {len(tables)}")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"  - {table[0]}: {count} records")
        
        # Check users
        try:
            cursor.execute("SELECT id, email, smtp_settings_id FROM users LIMIT 3")
            users = cursor.fetchall()
            if users:
                print(f"\nSample users:")
                for user in users:
                    print(f"  ID:{user[0]}, Email:{user[1]}, SMTP_ID:{user[2]}")
        except:
            pass
        
        # Check SMTP settings
        try:
            cursor.execute("SELECT id, username, host, is_configured FROM smtp_settings LIMIT 3")
            smtps = cursor.fetchall()
            if smtps:
                print(f"\nSample SMTP configs:")
                for smtp in smtps:
                    print(f"  ID:{smtp[0]}, User:{smtp[1]}, Host:{smtp[2]}, Configured:{smtp[3]}")
        except:
            pass
        
        conn.close()
    else:
        print(f"Not found: {path}")
