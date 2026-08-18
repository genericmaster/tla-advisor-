import logging
import uuid
import sqlite3
from pathlib import Path
from datetime import datetime,timezone
from typing import Literal
import re
from fastapi import FastAPI,Request,Response,Depends,HTTPException
from fastapi.responses import StreamingResponse,RedirectResponse,FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
from utils import check_login,approve_pending_correction,reject_pending_correction
from tla_advisor.start_up import pipeline
from tla_advisor.feedback.feedback_path import  append_jsonl_entry,write_pending_correction
from tla_advisor.feedback.feedback_regulariser import evaluate_correction
from config import  FEEDBACK_RATING_PATH,FEEDBACK_CORRECTION_PATH,TLA_DB_PATH,PENDING_CORRECTIONS_PATH

logger = logging.getLogger(__name__)
limiter =Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter =limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

#prevent script injections
@app.middleware("http")
async def add_csp_header(request: Request, call_next):
    response = await call_next(request)
    
    # Define and apply the CSP header string
    csp_value = "default-src 'self'; script-src 'self'; object-src 'none';"
    response.headers["Content-Security-Policy"] = csp_value
    return response

class FeedBackCorrections(BaseModel):
    message_id:str
    conversation_id:str
    query:str
    answer:str
    correct_solution:str
    
    
class  FeedBackRatings(BaseModel):
    message_id :str
    conversation_id:str
    rating: Literal['positive', 'negative'] | None
    query:str
    answer:str
    
    
class Query(BaseModel):
    query:str
    history:list[dict]
    
class LoginRequest(BaseModel):
    staff_number: str
    password: str
    

def stream_generator(query: str,history:list[dict]):
    try:
        for chunk in pipeline.answer(query,history):
            yield chunk
    except Exception as e:
        logger.error(f"treaming failed : {e}")
 
        raise
    
session ={}
def create_session(response:Response,staff_number):
    session_value =  str(uuid.uuid4()) 
  
    response.set_cookie(
                            key="RAG_COOKIE",
                            value=session_value,
                            httponly=True,
                            path="/",
                            max_age=28800,
                            samesite="lax"
                            
                    )
    session[session_value]=staff_number
    
def get_session(request:Request):
    session_id=request.cookies.get("RAG_COOKIE")
    if session_id  and session_id in session:
        return session[session_id]
    raise HTTPException(status_code=401, detail="Not authenticated")

def delete_cookie(response: Response):
    response.delete_cookie(key="RAG_COOKIE")
    logging.info( "Cookie deleted successfully client side")
    
def is_admin(staff_number):
    database=sqlite3.connect(TLA_DB_PATH)
    cur =database.cursor()
    cur.execute("SELECT * FROM TLAS WHERE staff_number = ? and is_admin =?",(staff_number,1))
    result = cur.fetchone()
    database.close()
    return result is not None

def require_admin(staff_number = Depends(get_session)):
    if is_admin(staff_number):
        return staff_number
    else:
        logger.warning(f"admin access denied: staff_number={staff_number}")
        raise HTTPException(status_code=403, detail="NOT AUTHORIZED")
    
def get_user_name(staff_number):
    database = sqlite3.connect(TLA_DB_PATH)
    cur = database.cursor()
    cur.execute("SELECT name FROM TLAS WHERE staff_number = ?", (staff_number,))
    result = cur.fetchone()
    database.close()
    return result[0] if result is not None else None

        

@app.post("/login")
@limiter.limit("5/minute")
def login(request: Request,data:LoginRequest):
    try:
        database=sqlite3.connect(TLA_DB_PATH)
    except Exception as e:
        logging.error(f"database error :{e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if check_login(database=database, staff_number=data.staff_number, password_attempt=data.password.encode()):
        logging.info(f"login successful: staff_number={data.staff_number}")
        admin_status = is_admin(data.staff_number)
        content = {"is_admin": admin_status}
        cookie = JSONResponse(content=content)
        create_session(response=cookie, staff_number=data.staff_number)
        database.close()
        return cookie
    else:   
            database.close()
            logging.error(f"login failed: staff_number={data.staff_number}")
            raise HTTPException(status_code=401, detail="Invalid credentials")


@app.post("/logout")
@limiter.limit("5/minute")
def logout(request: Request, response: Response):
    delete_cookie(response=response)
    session_id = request.cookies.get("RAG_COOKIE")
    if session_id in session:
        logger.info(f"logout: staff_number={session.get(session_id)}")
        del session[session_id]
    return {"status": "ok"}
        
@app.post("/chat")
@limiter.limit("50/minute")
def rag(request:Request,query:Query,cookie=Depends(get_session))->StreamingResponse:
    stream = StreamingResponse(content=stream_generator(query.query,query.history),media_type="text/plain", headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})
    return stream

@app.post("/feedback")
@limiter.limit("50/minute")
def rating(request:Request,data:FeedBackRatings,staff_number=Depends(get_session))->dict:
    data_dict = data.model_dump()
    user_name = get_user_name(staff_number)
    data_dict["name"] = user_name
    data_dict['timestamp'] = datetime.now(timezone.utc).isoformat()
    try:
        append_jsonl_entry(FEEDBACK_RATING_PATH, data_dict)
        return {'status':'ok'}
            
    except Exception as e:
        logger.error(f"ratings writing error :{e}")
        return {'status': 'error'}
    
@app.post("/feedback/correction")
@limiter.limit("5/minute")
def correction(request:Request,data:FeedBackCorrections,staff_number=Depends(get_session)):
    data_dict = data.model_dump()
    user_name = get_user_name(staff_number)
    data_dict["name"] = user_name
    data_dict['timestamp'] = datetime.now(timezone.utc).isoformat()
    try:
        append_jsonl_entry(path=FEEDBACK_CORRECTION_PATH, entry=data_dict)
        formatting_request=evaluate_correction(query=data.query, answer=data.answer, correct_solution=data.correct_solution,name= user_name)
        if formatting_request["verdict"] =="approved":
            final_markdown = f"""## Name  {user_name}
            
                                 ## Problem {data.query}

                                 {formatting_request['solution_markdown']}"""
            safe_name = re.sub(r'[^\w\s-]', '', data.query).strip().replace(' ', '-')[:50]                    
            file_path = Path(PENDING_CORRECTIONS_PATH) / f"{safe_name}.md"
            write_pending_correction(path=file_path,content=final_markdown)                     
            logging.info(f"[{data_dict['timestamp']}] | User: {user_name} |\n{final_markdown}\n" + "-"*50)
            return {"status": "ok"}
        else:
            logging.info(formatting_request["rejection_reason"])
            
    except Exception as e:
        logging.error(f"correction writing error :{e}")
        return {"status":"error"}
        
   
@app.get("/admin/pending-corrections")
def pending_corrections(admin=Depends(require_admin)):
    dir_path = Path(PENDING_CORRECTIONS_PATH)
    results = []
    for file_path in dir_path.iterdir():
        with open(file_path, mode='r', encoding='utf-8') as file:
            content = file.read()
        results.append({"message_id": file_path.stem, "content": content})
    return results

@app.post("/admin/pending-corrections/{message_id}/approve")
def approve_correction(message_id: str, admin=Depends(require_admin)):
    file_path = Path(PENDING_CORRECTIONS_PATH) / f"{message_id}.md"
    approve_pending_correction(file_path)
    return {"status": "ok"}

@app.post("/admin/pending-corrections/{message_id}/reject")
def reject_correction(message_id: str, admin=Depends(require_admin)):
    file_path = Path(PENDING_CORRECTIONS_PATH) / f"{message_id}.md"
    reject_pending_correction(file_path)
    return {"status": "ok"}


@app.get("/admin.html")
def serve_admin_page(request: Request):
    session_id = request.cookies.get("RAG_COOKIE")
    staff_number = session.get(session_id) if session_id else None
    if staff_number is None or not is_admin(staff_number):
        return RedirectResponse(url="/login.html")
    return FileResponse(Path("src")/"frontend"/"admin.html")

@app.get("/index.html")
def serve_chat_page(request: Request):
    session_id = request.cookies.get("RAG_COOKIE")
    staff_number = session.get(session_id) if session_id else None
    if staff_number is None:
        return RedirectResponse(url="/login.html")
    return FileResponse(Path("src") / "frontend" / "index.html")

app.mount(path='/', app=StaticFiles(directory=str(Path("src") / "frontend"), html=True), name='static')
