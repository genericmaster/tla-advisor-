
#a function that does recursive chunking to ensure fetched chunks have a richer meaning
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import CHUNK_SIZE,CHUNK_OVERLAP
def text_splitting(text:str)->list[str]:
    splitter =RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE,chunk_overlap=CHUNK_OVERLAP)
    return splitter.split_text(text)
