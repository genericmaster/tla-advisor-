import json
"""deals with formatting of both the query and retrieved context so that the generatoe only sees one input """
def ollama_prompt_builder(query: str, retrived_chunks: dict) -> str:
    chunks = retrived_chunks['documents']
    flattened = [item for sublist in chunks for item in sublist]
    numbered_chunks = "\n\n".join(
        f"[Chunk {i+1}]\n{chunk}" for i, chunk in enumerate(flattened)
    )
    prompt = "Context:\n" + numbered_chunks + "\n\nQuestion:\n" + query
    return prompt
"""Deals with building prompt for model responsible for formatting responses into proper structure."""

def build_correction_prompt(query, answer, correct_solution)->json:
    prompt_dict = {
    "query": query,
    "answer": answer,
    "correct_solution": correct_solution
     }
    
    return json.dumps(prompt_dict,ensure_ascii=False)
    

    