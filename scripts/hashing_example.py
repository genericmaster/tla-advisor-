import bcrypt


password = b"very secret password"

def hash_password(password:bytes)->bytes:
    hashed = bcrypt.hashpw(password=password,salt=bcrypt.gensalt())
    return hashed

hashed_password = hash_password(password)
def hash_verify(hashed_password:str,password)->bool:
        if bcrypt.checkpw(password,hashed_password)==True:
           return True
        else:
            return False
import bcrypt


password = b"very secret password"

def hash_password(password:bytes)->bytes:
    hashed = bcrypt.hashpw(password=password,salt=bcrypt.gensalt())
    return hashed

hashed_password = hash_password(password)
def hash_verify(hashed_password:bytes,password)->bool:
        if bcrypt.checkpw(password,hashed_password)==True:
           return True
        else:
            return False
        
    
