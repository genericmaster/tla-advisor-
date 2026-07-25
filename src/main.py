import logging
from fastapi import FastAPI,Request
from pydantic import BaseModel
from tla_advisor.start_up import pipeline
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

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

app.mount(path='/',app=StaticFiles(directory='src/frontend',html=True),name='static')