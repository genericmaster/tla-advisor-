
import shutil
import bcrypt
import shutil
from pathlib import Path
import logging
from tla_advisor.document_preprocessing.splitter import text_splitting
from tla_advisor.start_up import embedding_model,vector_store
from config import SAMBA_CORRECTIONS_PATH
logger = logging.getLogger(__name__)
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
        shutil.copy(file_path, SAMBA_CORRECTIONS_PATH / file_path.name)
        logger.info("writing file to samba successful")
    except Exception as e:
        logger.error(f"writing file to samba failed :{e}")
        raise
    #add vector database
    embed_chunk = embedding_model.embed(chunks)
    vector_store.add(ids=ids, embeddings=embed_chunk, documents=chunks)
    
    #delete file
    file_path.unlink()
def reject_pending_correction(file_path: Path) -> None:
    file_path.unlink()