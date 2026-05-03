from fastapi import APIRouter, HTTPException, Form
from models.schemas import (
    CreateJDRequest, JD, AddCandidateRequest, Candidate,
    GenerateQuestionsResponse, ScoreFromTranscriptRequest
)
from services.groq_service import generate_questions_from_groq, score_from_transcript_with_groq
import db
import uuid

router = APIRouter()

# --- JD CRUD ---
@router.post("/jds", response_model=JD)
async def create_jd(req: CreateJDRequest):
    jd_id = str(uuid.uuid4())[:8]
    await db.insert_jd(jd_id, req.title, req.description)
    return JD(id=jd_id, title=req.title, description=req.description)

@router.get("/jds", response_model=list[JD])
async def list_jds():
    rows = await db.get_all_jds()
    return [JD(**r) for r in rows]

@router.get("/jds/{jd_id}", response_model=JD)
async def get_jd(jd_id: str):
    row = await db.get_jd(jd_id)
    if not row:
        raise HTTPException(404, "JD not found")
    return JD(**row)

# --- Candidate CRUD ---
@router.post("/jds/{jd_id}/candidates", response_model=Candidate)
async def add_candidate(jd_id: str, req: AddCandidateRequest):
    if not await db.get_jd(jd_id):
        raise HTTPException(404, "JD not found")
    cid = str(uuid.uuid4())[:8]
    await db.insert_candidate(cid, jd_id, req.name, req.resume_text)
    return Candidate(id=cid, name=req.name, resume_text=req.resume_text)

@router.get("/jds/{jd_id}/candidates", response_model=list[Candidate])
async def list_candidates(jd_id: str):
    if not await db.get_jd(jd_id):
        raise HTTPException(404, "JD not found")
    rows = await db.get_candidates_for_jd(jd_id)
    return [Candidate(**r) for r in rows]

@router.get("/jds/{jd_id}/candidates/{cid}", response_model=Candidate)
async def get_candidate(jd_id: str, cid: str):
    row = await db.get_candidate(jd_id, cid)
    if not row:
        raise HTTPException(404, "Candidate not found")
    return Candidate(**row)

# --- Generate questions for a candidate ---
@router.post("/jds/{jd_id}/candidates/{cid}/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(jd_id: str, cid: str, num_questions: int = Form(8)):
    jd = await db.get_jd(jd_id)
    if not jd:
        raise HTTPException(404, "JD not found")
    c = await db.get_candidate(jd_id, cid)
    if not c:
        raise HTTPException(404, "Candidate not found")
    questions = await generate_questions_from_groq(jd["description"], c["resume_text"], num_questions)
    await db.update_candidate_questions(cid, questions)
    return GenerateQuestionsResponse(questions=questions)

# --- Save transcript ---
@router.post("/jds/{jd_id}/candidates/{cid}/transcript")
async def save_transcript(jd_id: str, cid: str, transcript: list[dict]):
    if not await db.get_candidate(jd_id, cid):
        raise HTTPException(404, "Candidate not found")
    await db.update_candidate_transcript(cid, transcript)
    return {"status": "saved", "entries": len(transcript)}

# --- Score from transcript ---
@router.post("/jds/{jd_id}/candidates/{cid}/score")
async def score_candidate(jd_id: str, cid: str):
    jd = await db.get_jd(jd_id)
    if not jd:
        raise HTTPException(404, "JD not found")
    c = await db.get_candidate(jd_id, cid)
    if not c:
        raise HTTPException(404, "Candidate not found")
    if not c["transcript"]:
        raise HTTPException(400, "No transcript to score")
    result = await score_from_transcript_with_groq(jd["description"], c["transcript"])
    await db.update_candidate_scores(cid, result.model_dump())
    return result
