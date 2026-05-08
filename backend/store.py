from typing import Dict
from models.schemas import JD, Candidate

# In-memory stores
jds: Dict[str, JD] = {}
candidates: Dict[str, Dict[str, Candidate]] = {}  # jd_id -> {candidate_id -> Candidate}
