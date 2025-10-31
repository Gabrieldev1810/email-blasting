import sqlite3

# Connect to database
conn = sqlite3.connect('backend/instance/beacon_blast_dev.db')
cursor = conn.cursor()

# Add smtp_account_id column to campaigns table
try:
    cursor.execute('ALTER TABLE campaigns ADD COLUMN smtp_account_id INTEGER')
    print("✅ smtp_account_id column added to campaigns table")
except sqlite3.OperationalError as e:
    if 'duplicate column' in str(e).lower():
        print("✅ smtp_account_id column already exists")
    else:
        print(f"❌ Error: {e}")

conn.commit()
conn.close()
print("Done!")
