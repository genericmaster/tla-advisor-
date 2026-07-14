import logging
from fastapi import FastAPI
from pydantic import BaseModel
from tla_advisor.start_up import pipeline
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
app = FastAPI()

class Query(BaseModel):
    query:str
    
def stream_generator(query: str):
    try:
        for chunk in pipeline.answer(query):
            yield chunk
    except Exception as e:
        logger.error(f"treaming failed : {e}")
        raise

@app.post("/chat")
def rag(query:Query)->StreamingResponse:
    stream = StreamingResponse(content=stream_generator(query.query),media_type="text/plain", headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})
    return stream
