from app import create_app, db
import os

app = create_app()
app.app_context().push()

# Get the actual database URI being used
db_uri = app.config['SQLALCHEMY_DATABASE_URI']
print(f"Database URI: {db_uri}")

# Extract file path from URI
if 'sqlite:///' in db_uri:
    db_path = db_uri.replace('sqlite:///', '')
    print(f"Database file path: {db_path}")
    
    # Check if it's absolute or relative
    if os.path.isabs(db_path):
        print(f"Absolute path: {db_path}")
    else:
        # It's relative, construct full path
        full_path = os.path.join(os.getcwd(), db_path)
        print(f"Full path: {full_path}")
        print(f"Exists: {os.path.exists(full_path)}")
        
        if os.path.exists(full_path):
            # Check tables
            import sqlite3
            conn = sqlite3.connect(full_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"\nTables in {full_path}:")
            for t in tables:
                print(f"  - {t[0]}")
            conn.close()
