
import shutil
import bcrypt
import json
from pathlib import Path
from tla_advisor.document_preprocessing.splitter import text_splitting
from tla_advisor.start_up import embedding_model,vector_store
from config import SAMBA_CORRECTIONS_PATH
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
    
    
#hashing function

def hash_password(password:bytes)->bytes:
    hashed = bcrypt.hashpw(password=password,salt=bcrypt.gensalt())
    return hashed
def hash_verify(hashed_password:bytes,password)->bool:
        if bcrypt.checkpw(password,hashed_password)==True:
           return True
        else:
            return False
        

"handles chunking and encoding corrections to vector database"
def approve_pending_correction(file_path: Path) -> None:
    with open(file_path, mode='r', encoding='utf-8') as file:
        content = file.read()
    
    clean_content = content.replace("## ", "")

    chunks = text_splitting(clean_content)
    ids = [f"{file_path.stem}_chunk_{i}" for i in range(len(chunks))]
    embed_chunk = embedding_model.embed(chunks)
    vector_store.add(ids=ids, embeddings=embed_chunk, documents=chunks)
    print(f"SOURCE: {file_path}")
    print(f"SOURCE EXISTS: {file_path.exists()}")
    print(f"DESTINATION: {SAMBA_CORRECTIONS_PATH / file_path.name}")
    shutil.copy(file_path, SAMBA_CORRECTIONS_PATH / file_path.name)

    file_path.unlink()
def reject_pending_correction(file_path: Path) -> None:
    file_path.unlink()
    
    
def get_conversations(database,staff_number:str):
    cur = database.cursor()
    results = cur.execute("""
        SELECT id, title, messages, created_at, updated_at
        FROM conversations
        WHERE staff_number = ?
        ORDER BY updated_at DESC
    """, (staff_number,)).fetchall()
    return [
        {
            "id": row[0],
            "title": row[1],
            "messages": json.loads(row[2]),
            "created_at": row[3],
            "updated_at": row[4],
        }
        for row in results
    ]
    
    
def upsert_conversation(database,staff_number: str, conversation: dict) -> None:
  messages_json = json.dumps(conversation["messages"])
  cur = database.cursor()
  cur.execute("""INSERT INTO conversations (id, staff_number, title, messages, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            title = excluded.title,
                            messages = excluded.messages,
                            updated_at = excluded.updated_at"""
                            ,(conversation["id"],
                            staff_number,
                            conversation["title"],
                            messages_json,
                            conversation["created_at"],
                            conversation["updated_at"]
                         ))
  database.commit()


def delete_conversation(database, staff_number: str, conversation_id: str) -> None:
    cur = database.cursor()
    cur.execute(
        "DELETE FROM conversations WHERE id = ? AND staff_number = ?",
        (conversation_id, staff_number)
    )
    database.commit()
    

