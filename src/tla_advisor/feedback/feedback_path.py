import json

def append_jsonl_entry(path, entry):
    with open(file=path, mode='a', encoding='utf-8') as file:
        file.write(json.dumps(entry) + "\n")
   
"responsible for writing approved user corrections to pending corrections folder"     
def write_pending_correction(path, content):
    with open(file=path, mode='w', encoding='utf-8') as file:
        file.write(content)