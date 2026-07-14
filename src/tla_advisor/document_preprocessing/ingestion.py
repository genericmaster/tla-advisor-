
from pathlib import Path
from tla_advisor.document_preprocessing.loader_factory import get_loader
from tla_advisor.retrieval.start_up import vector_store,embedding_model
from tla_advisor.document_preprocessing.splitter import text_splitting
sources = ['data/source_docs/TLA STAFF SUPPORT HANDBOOK.pdf','data/source_docs/BCDR_Tasks.txt']


def ingest_document(source: str) -> None:
    doc_loader= get_loader(source)
    text = doc_loader.load(source)
    chunks = text_splitting(text)
    doc_name = Path(source).stem
    ids = [f"{doc_name}_chunk_{i}" for i in range(len(chunks))]
    embed_chunk = embedding_model.embed(chunks)
    vector_store.add(ids=ids,embeddings=embed_chunk,documents=chunks)
   
for source in sources:
    ingest_document(source)

