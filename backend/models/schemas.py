from pydantic import BaseModel
from typing import List, Optional

# --- JD & Candidate ---
class CreateJDRequest(BaseModel):
    title: str
    description: str

class JD(BaseModel):
    id: str
    title: str
    description: str

class AddCandidateRequest(BaseModel):
    name: str
    resume_text: str

class Question(BaseModel):
    id: int
    text: str
    category: str
    difficulty: str

class Candidate(BaseModel):
    id: str
    name: str
    resume_text: str
    questions: List[Question] = []
    transcript: List[dict] = []   # [{role: "ai"|"user", text: "...", question_index: 0}]
    scores: Optional[dict] = None

# --- Question generation ---
class GenerateQuestionsResponse(BaseModel):
    questions: List[Question]

# --- Scoring ---
class ScoreFromTranscriptRequest(BaseModel):
    job_description: str
    transcript: List[dict]

class CategoryScore(BaseModel):
    category: str
    score: int
    feedback: str

class ScoringResponse(BaseModel):
    overall_score: int
    category_scores: List[CategoryScore]
    strengths: List[str]
    improvements: List[str]
    hiring_recommendation: str
