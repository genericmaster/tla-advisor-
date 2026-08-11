import sqlite3
import bcrypt
from hashing_example import hash_password

database=sqlite3.connect(r"data\database\users.db")

password = "2"
def check_login(database,staff_number, password_attempt):
    cur = database.cursor()
    query = cur.execute(
        "SELECT password_hash FROM TLAS WHERE staff_number = ? AND is_active = ?",
        (staff_number, 1)
    )
    result = query.fetchone()

    if result is None:
        return False

    stored_hash = result[0].encode()

    if bcrypt.checkpw(password_attempt, stored_hash):
        return True
    else:
        return False
    
print(check_login(database,"23456",password.encode()))