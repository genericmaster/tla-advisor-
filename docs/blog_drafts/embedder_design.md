# Building the embedder for a RAG system

Angles worth covering in the post:

- Why we built an abstract base class for one implementation
  (testability and substitutability, not anticipated multi-backend support)

- The split between secret config (.env), non-secret config (config file), 
  and component code (embedder.py) — and why each lives where it lives

- Constructor injection in plain terms — "components don't fetch their 
  dependencies, they receive them"

- The Liskov violation we caught: concrete `embed` having an extra parameter
  the abstract didn't declare. Why subclass signatures must match exactly.

- Module-level side effects as an anti-pattern: importing a file shouldn't
  do work, only define things

- The mental model shift: "where does X come from?" → answered by reading
  one file (startup), not by tracing globals across the codebase