import logging
from datetime import datetime,timezone
from typing import Literal
from fastapi import FastAPI,Request
from pydantic import BaseModel
from tla_advisor.start_up import pipeline
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from tla_advisor.feedback.feedback_path import  append_jsonl_entry
from tla_advisor.feedback.feedback_regulariser import evaluate_correction
from config import  FEEDBACK_RATING_PATH,FEEDBACK_CORRECTION_PATH

logger = logging.getLogger(__name__)
app = FastAPI()


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
    query: str
    answer: str
    correct_solution: str
    user_id: str| None=None
    
class  FeedBackRatings(BaseModel):
    message_id :str
    conversation_id:str
    rating: Literal['positive', 'negative'] | None
    query:str
    answer:str
    user_id: str |None =None 
    
class Query(BaseModel):
    query:str
    history:list[dict]
    
def stream_generator(query: str,history:list[dict]):
    try:
        for chunk in pipeline.answer(query,history):
            yield chunk
    except Exception as e:
        logger.error(f"treaming failed : {e}")
 
        raise

@app.post("/chat")
def rag(query:Query)->StreamingResponse:
    stream = StreamingResponse(content=stream_generator(query.query,query.history),media_type="text/plain", headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})
    return stream

@app.post("/feedback")
def rating(data:FeedBackRatings)->dict:
    data_dict = data.model_dump()
    data_dict['timestamp'] = datetime.now(timezone.utc).isoformat()
    try:
        append_jsonl_entry(FEEDBACK_RATING_PATH, data_dict)
        return {'status':'ok'}
            
    except Exception as e:
        logger.error(f"ratings writing error :{e}")
        return {'status': 'error'}
    
@app.post("/feedback/correction")
def correction(data:FeedBackCorrections):
    data_dict = data.model_dump()
    data_dict['timestamp'] = datetime.now(timezone.utc).isoformat()
    try:
        append_jsonl_entry(FEEDBACK_CORRECTION_PATH, data_dict)
        formatting_request=evaluate_correction(data.query, data.answer, data.correct_solution)
        if formatting_request["verdict"] =="approved":
            final_markdown = f"""## Problem {data.query}
 
                                 {formatting_request['solution_markdown']}"""
            print(f"[{data_dict['timestamp']}] | User: {data.user_id} |\n{final_markdown}\n" + "-"*50)
        else:
            print( formatting_request["rejection_reason"])
            
    except Exception as e:
        logger.error(f"correction writing error :{e}")
        
   
        


app.mount(path='/',app=StaticFiles(directory='src/frontend',html=True),name='static')
