
#deals with formatting of both the query and retrieved context so that the generatoe obly sees one input 
def ollama_prompt_builder(query:str,retrived_chunks:dict)->str:
    
    #chunk processing
    chunks = retrived_chunks['documents']
    flattened = [item for sublist in chunks for item in sublist] 
    context = "\n\n".join(flattened)
    prompt ="Context:\n" + context + "\n\nQuestion:\n" + query
    return prompt

