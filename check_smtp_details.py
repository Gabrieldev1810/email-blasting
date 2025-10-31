import sqlite3

conn = sqlite3.connect('backend/instance/beacon_blast_dev.db')
cursor = conn.cursor()

print("=== Current SMTP Settings ===\n")
cursor.execute('''
    SELECT id, username, host, sender_email, sender_name, provider, is_configured, user_id, created_at 
    FROM smtp_settings 
    ORDER BY id
''')

rows = cursor.fetchall()
print(f"Total SMTP configs: {len(rows)}\n")

for row in rows:
    print(f"ID: {row[0]}")
    print(f"  Username: {row[1]}")
    print(f"  Host: {row[2]}")
    print(f"  Sender Email: {row[3]}")
    print(f"  Sender Name: {row[4]}")
    print(f"  Provider: {row[5]}")
    print(f"  Configured: {row[6]}")
    print(f"  User ID: {row[7]}")
    print(f"  Created: {row[8]}")
    print()

conn.close()
