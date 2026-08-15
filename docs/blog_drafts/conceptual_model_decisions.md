# Embeddings: how my from-scratch transformer connects to RAG retrieval

Notes for future writeup:
- nomic-embed-text is structurally the same kind of model I built from scratch (transformer encoder blocks + attention).
- Differences: trained on sentence pairs not next-token; contrastive objective; pooling at the end to collapse per-token vectors into one sentence vector.
- This is the missing piece between my from-scratch work and production RAG — the model architecture is familiar, only the training objective and pooling are new.
- Worth a section on what pooling actually does and why retrieval needs it.


- Vector databases are genuinely powerful — example: stored documents were "does it take files or strings?" 
  and "i really like strings more than files". Query was "find a question on whether the collection takes 
  in a document or text" — different wording, different keywords, but it still returned the right document 
  as the top match. Semantic search working as intended.

  -generator classes must stay decoupled
  - using the same client decison

  