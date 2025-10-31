import sqlite3

conn = sqlite3.connect('backend/instance/beacon_blast_dev.db')
cursor = conn.cursor()

print("=== Cleaning up duplicate SMTP records ===\n")

# Show current state
cursor.execute('SELECT id, username, sender_email FROM smtp_settings ORDER BY id')
rows = cursor.fetchall()
print(f"Before cleanup: {len(rows)} SMTP configs")
for row in rows:
    print(f"  ID:{row[0]}, User:{row[1]}, Email:{row[2]}")

# Keep only the first one (ID:1), delete duplicates (ID:2 and ID:3)
print(f"\nDeleting duplicate records (IDs 2 and 3)...")
cursor.execute('DELETE FROM smtp_settings WHERE id IN (2, 3)')
conn.commit()

# Show new state
cursor.execute('SELECT id, username, sender_email FROM smtp_settings ORDER BY id')
rows = cursor.fetchall()
print(f"\nAfter cleanup: {len(rows)} SMTP configs")
for row in rows:
    print(f"  ID:{row[0]}, User:{row[1]}, Email:{row[2]}")

# Update users to point to the correct SMTP
print(f"\nUpdating user SMTP assignments...")
cursor.execute('UPDATE users SET smtp_settings_id = 1 WHERE smtp_settings_id IN (2, 3)')
conn.commit()

print("\n✓ Cleanup complete!")
conn.close()
