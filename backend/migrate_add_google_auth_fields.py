"""Migration: add 'name' and 'auth_provider' columns to users table."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "research_lib.db")


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}, skipping migration.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check existing columns
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]

    if "name" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT ''")
        print("Added 'name' column to users table.")
    else:
        print("'name' column already exists.")

    if "auth_provider" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'local'")
        print("Added 'auth_provider' column to users table.")
    else:
        print("'auth_provider' column already exists.")

    conn.commit()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    migrate()