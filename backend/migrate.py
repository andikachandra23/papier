"""Universal database migration script for SQLite & PostgreSQL.

Combines all migrations into a single idempotent script that can be run
on any environment (local SQLite or Railway PostgreSQL).

Usage:
    # Local (SQLite)
    cd backend && python migrate.py

    # Railway (PostgreSQL)
    railway run --service backend python migrate.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import inspect, text
from app.database import engine, SessionLocal, DATABASE_URL
from app.models import Base


def log(msg: str):
    print(msg, flush=True)


def column_exists(inspector, table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    try:
        columns = [col["name"] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception:
        return False


def table_exists(inspector, table_name: str) -> bool:
    """Check if a table exists."""
    return table_name in inspector.get_table_names()


def migrate():
    db_type = "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite"
    log(f"🔄 Starting migration on {db_type}...")
    log(f"   Database URL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    log("")

    # Step 1: Create all tables from models (idempotent)
    log("Step 1: Creating/updating tables from models...")
    Base.metadata.create_all(bind=engine)
    log("  ✓ All tables created/verified from models")
    log("")

    inspector = inspect(engine)
    is_sqlite = "sqlite" in DATABASE_URL

    with engine.connect() as conn:
        # Step 2: Ensure 'role' column exists on users
        log("Step 2: Checking 'role' column on users...")
        if not column_exists(inspector, "users", "role"):
            log("  Adding 'role' column...")
            default_val = "'user'" if is_sqlite else "DEFAULT 'user'"
            if is_sqlite:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user'"))
            conn.commit()
            log("  ✓ 'role' column added")
        else:
            log("  → 'role' column already exists")

        # Step 3: Ensure 'is_active' column exists on users
        log("Step 3: Checking 'is_active' column on users...")
        if not column_exists(inspector, "users", "is_active"):
            log("  Adding 'is_active' column...")
            if is_sqlite:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            conn.commit()
            log("  ✓ 'is_active' column added")
        else:
            log("  → 'is_active' column already exists")

        # Step 4: Ensure 'auth_provider' column exists on users
        log("Step 4: Checking 'auth_provider' column on users...")
        if not column_exists(inspector, "users", "auth_provider"):
            log("  Adding 'auth_provider' column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'local'"))
            conn.commit()
            log("  ✓ 'auth_provider' column added")
        else:
            log("  → 'auth_provider' column already exists")

        # Step 5: Ensure 'name' column exists on users
        log("Step 5: Checking 'name' column on users...")
        if not column_exists(inspector, "users", "name"):
            log("  Adding 'name' column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR DEFAULT ''"))
            conn.commit()
            log("  ✓ 'name' column added")
        else:
            log("  → 'name' column already exists")

        conn.commit()

    # Step 6: Seed default AI settings if not present
    log("")
    log("Step 6: Seeding default settings...")
    db = SessionLocal()
    try:
        from app.models import Setting

        for skey, senv in [
            ("ai_base_url", "AI_BASE_URL"),
            ("ai_api_key", "AI_API_KEY"),
            ("ai_model", "AI_MODEL"),
        ]:
            existing = db.query(Setting).filter(Setting.key == skey).first()
            if not existing:
                sval = os.getenv(senv, "")
                if sval:
                    db.add(Setting(key=skey, value=sval))
                    log(f"  ✓ Seeded setting '{skey}'")
                else:
                    log(f"  → Skipped '{skey}' (env {senv} not set)")
            else:
                log(f"  → Setting '{skey}' already exists")
        db.commit()
    finally:
        db.close()

    # Step 7: Set default admin user if none exists
    log("")
    log("Step 7: Checking admin user...")
    db = SessionLocal()
    try:
        from app.models import User

        admin_exists = db.query(User).filter(User.role == "admin").first()
        if not admin_exists:
            first_user = db.query(User).order_by(User.id).first()
            if first_user:
                first_user.role = "admin"
                db.commit()
                log(f"  ✓ First user ({first_user.email}) promoted to admin")
            else:
                log("  → No users found. Run create_user.py to create an admin.")
        else:
            log(f"  → Admin user already exists: {admin_exists.email}")
    finally:
        db.close()

    log("")
    log("=" * 50)
    log("✅ Migration complete!")
    log("=" * 50)


if __name__ == "__main__":
    migrate()