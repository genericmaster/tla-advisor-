# Persistence and storage internals:
-Chroma stores data in two parts working together: a SQLite database file for structured data (collection names, document IDs, original text, metadata) and a folder of binary files for the vectors themselves.
-The binary files implement an HNSW index — a graph structure that makes similarity search fast at scale. Don't need to understand HNSW deeply; just know vector DBs need specialised indexes because naive distance-to-every-vector doesn't scale.
-PersistentClient(path=...) writes both to disk in the specified folder. Restart the program, data is still there.
-The folder is opaque — don't touch individual files. Copy the whole folder as a unit if backing up.
-The index is tied to your embedding model's dimension and metric. Change embedding models, you have to rebuild from scratch.

# idompotency

An operation is idempotent if running it once or running it ten times gives the same result.
Matters in real systems because crashes, retries, and accidental re-runs happen. Idempotent operations are safe to repeat; non-idempotent ones cause bugs.

# chroma db

- create_collection(name) — strict. Errors if the collection already exists. Use when you want to guarantee you're not silently overwriting something.
- get_collection(name) — strict the other way. Errors if it doesn't exist. Use when you expect existing data.
- get_or_create_collection(name) — idempotent. Returns the existing one if found, creates a fresh one if not. Use for exploration and for "I don't care if it's new or old, just give me a handle."

# add vs upsert for documents:

- add with an existing ID — Chroma silently skips. The duplicate isn't created, but no error either.
- upsert — explicit "update if exists, insert if not." Use when you want to overwrite.
Defaults are conservative: Chroma prefers silent skip over silent overwrite, so accidentally re-running add doesn't corrupt your data.