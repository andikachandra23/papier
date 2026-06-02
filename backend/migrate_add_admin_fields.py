"""Database migration: Add role/is_active to users + create ai_usage_logs table.

Run this script once to update an existing database:
    cd backend && python migrate_add_admin_fields.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import inspect, text
from app.database import engine, SessionLocal
from app.models import Base, User


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def table_exists(table_name: str) -> bool:
    """Check if a table exists."""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()


def migrate():
    is_sqlite = "sqlite" in str(engine.url)

    with engine.connect() as conn:
        # 1. Add 'role' column to users table
        if not column_exists("users", "role"):
            print("Adding 'role' column to users table...")
            if is_sqlite:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
            conn.commit()
            print("  ✓ 'role' column added")
        else:
            print("  → 'role' column already exists")

        # 2. Add 'is_active' column to users table
        if not column_exists("users", "is_active"):
            print("Adding 'is_active' column to users table...")
            if is_sqlite:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            conn.commit()
            print("  ✓ 'is_active' column added")
        else:
            print("  → 'is_active' column already exists")

        # 3. Create ai_usage_logs table if it doesn't exist
        if not table_exists("ai_usage_logs"):
            print("Creating 'ai_usage_logs' table...")
            conn.execute(text("""
                CREATE TABLE ai_usage_logs (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    paper_id INTEGER REFERENCES papers(id) ON DELETE SET NULL,
                    feature VARCHAR NOT NULL,
                    model VARCHAR DEFAULT 'ai-model',
                    prompt_tokens INTEGER DEFAULT 0,
                    completion_tokens INTEGER DEFAULT 0,
                    total_tokens INTEGER DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            conn.execute(text("CREATE INDEX ix_ai_usage_logs_id ON ai_usage_logs (id)"))
            conn.commit()
            print("  ✓ 'ai_usage_logs' table created")
        else:
            print("  → 'ai_usage_logs' table already exists")

    # 4. Create settings table if it doesn't exist
    with engine.connect() as conn:
        if not table_exists("settings"):
            print("Creating 'settings' table...")
            conn.execute(text("""
                CREATE TABLE settings (
                    id INTEGER PRIMARY KEY,
                    key VARCHAR UNIQUE NOT NULL,
                    value TEXT DEFAULT '',
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            conn.execute(text("CREATE INDEX ix_settings_key ON settings (key)"))
            conn.execute(text("CREATE INDEX ix_settings_id ON settings (id)"))
            # Seed default values from env
            import os
            for skey, senv in [("ai_base_url", "AI_BASE_URL"), ("ai_api_key", "AI_API_KEY"), ("ai_model", "AI_MODEL")]:
                sval = os.getenv(senv, "")
                if sval:
                    conn.execute(text(f"INSERT INTO settings (key, value) VALUES ('{skey}', '{sval}')"))
            conn.commit()
            print("  ✓ 'settings' table created and seeded")
        else:
            print("  → 'settings' table already exists")

    # 5. Set default admin user if no admin exists
    db = SessionLocal()
    try:
        admin_exists = db.query(User).filter(User.role == "admin").first()
        if not admin_exists:
            # Set the first user as admin
            first_user = db.query(User).order_by(User.id).first()
            if first_user:
                first_user.role = "admin"
                db.commit()
                print(f"\n  ✓ First user ({first_user.email}) promoted to admin")
            else:
                print("\n  → No users found. Run create_user.py to create an admin user.")
        else:
            print(f"\n  → Admin user already exists: {admin_exists.email}")
    finally:
        db.close()

    print("\nMigration complete!")


if __name__ == "__main__":
    migrate()