import json
def append_jsonl_entry(path, entry):
    with open(file=path, mode='a', encoding='utf-8') as file:
        file.write(json.dumps(entry) + "\n")