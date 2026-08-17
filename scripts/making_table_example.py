import sqlite3
from datetime import datetime, timezone
from hashing_example import hash_password

test_password = b"testpassword123"
hashed = hash_password(test_password)


database = sqlite3.connect(r'data\database\users.db')
cursor = database.cursor()
table = cursor.execute("""CREATE TABLE IF NOT EXISTS TLAS(
                    STAFF_NUMBER  TEXT PRIMARY KEY,
                    NAME TEXT NOT NULL,
                    PASSWORD_HASH TEXT NOT NULL,
                    IS_ADMIN INTEGER NOT NULL DEFAULT 0,
                    CREATED_AT TEXT NOT NULL,
                    IS_ACTIVE INTEGER NOT NULL DEFAULT 1)
                    """
)

table.execute(
    f"""INSERT INTO TLAS VALUES
    ('23433', 'Testing User', '{hashed.decode()}', 0, '{datetime.now(timezone.utc).isoformat()}', 1)
"""
)
database.commit()
result = cursor.execute("SELECT * FROM TLAS").fetchall()
print(result)
database.close()

