import json
import logging
from tla_advisor.prompt_processing.build_prompt import build_correction_prompt
from tla_advisor.start_up import regulariser_generator

logger = logging.getLogger(__name__)

def evaluate_correction(query:str, answer:str, correct_solution:str) -> dict:
    base_prompt = build_correction_prompt(query,answer,correct_solution)
    try:
        request =regulariser_generator.generate(prompt=base_prompt,history=[])
        response = "".join(request)
        response_dict=json.loads(response)
        logger.info("regulariser successful")
        return response_dict
    except Exception as e:
         logger.error(f"regulariser failed as : {e}")
         return {"verdict": "rejected", "rejection_reason": "unparseable", "solution_markdown": None}
    
        


    