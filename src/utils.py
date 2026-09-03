
import shutil
import bcrypt
import json
import tempfile
from pathlib import Path
import logging
import os,subprocess
from tla_advisor.document_preprocessing.splitter import text_splitting
from tla_advisor.start_up import embedding_model,vector_store
logger = logging.getLogger(__name__)
samba_path = Path(os.environ.get("SAMBA_MOUNT_PATH"))

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
        

"handles chunking and encoding corrections to vector database as well as adding files to samba"
def approve_pending_correction(file_path: Path) -> None:
    try:
        with open(file_path, mode='r', encoding='utf-8') as file:
            content = file.read()
    except Exception as e:
         logger.error(f"file reading error:{e}")
         raise
    
    clean_content = content.replace("## ", "")

    chunks = text_splitting(clean_content)
    ids = [f"{file_path.stem}_chunk_{i}" for i in range(len(chunks))]
    #add file to samba
    try:
        shutil.copy(file_path, samba_path / file_path.name)
        logger.info("writing file to samba successful")
    except Exception as e:
        logger.warning(f"samba write failed, attempting remount: {e}")
        if remount_samba():
            logger.info("remount successful, retrying write")
            shutil.copy(file_path, samba_path / file_path.name)
            logger.info("writing file to samba successful after remount")
            raise
        else:
            logger.error("remount failed, samba write aborted")
            raise
        
    #add vector database
    embed_chunk = embedding_model.embed(chunks)
    vector_store.add(ids=ids, embeddings=embed_chunk, documents=chunks)
    
    #delete file
    file_path.unlink()
    
def reject_pending_correction(file_path: Path) -> None:
    file_path.unlink()
    
"""samba retry logic"""
def remount_samba():
    host = os.environ.get("SAMBA_HOST")
    mount_path = os.environ.get("SAMBA_MOUNT_PATH")
    username = os.environ.get("SAMBA_USERNAME")
    password = os.environ.get("SAMBA_PASSWORD")
    
    result = subprocess.run([
        "mount", "-t", "cifs", host, mount_path,
        "-o", f"username={username},password={password},iocharset=utf8"
    ], capture_output=True, text=True)
    
    return result.returncode == 0

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
    
def write_to_temp_file(file_bytes:bytes,extension:str,name:str)->str:
    """writes upladed documents to a temporary file before processeing to ingestion in vector database"""
    temp_dir = tempfile.gettempdir()
    temp_path = Path(temp_dir) / f"{name}{extension}"
    with open(temp_path, 'wb') as f:
        f.write(file_bytes)
    return str(temp_path)
    
   
        
        
    

