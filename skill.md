---
name: ai-interview-agent
description: >
  Build an AI-powered interview agent MVP using Groq API (question generation),
  Gemini Live Streaming (voice Q&A), FastAPI (backend), and Vite+React (frontend).
  Use this skill when the user wants to create an interview assistant that ingests
  a Job Description and Resume, generates role-specific questions, conducts a
  voice interview, transcribes answers, and scores the candidate. Trigger whenever
  the user mentions interview agent, AI interviewer, JD + resume analysis, candidate
  scoring, or voice-based interview automation.
---

# AI Interview Agent — MVP Skill

## Overview

This skill guides you in building a full-stack AI interview agent:

```
User uploads JD + Resume
        │
        ▼
[1] Question Generation  ←──  Groq LLM (llama-3 / mixtral)
        │
        ▼
[2] Voice Interview      ←──  Gemini Live Streaming API
    (ask Q → get audio → transcribe → next Q)
        │
        ▼
[3] Transcript Analysis  ←──  Groq LLM
        │
        ▼
[4] Scoring / Evaluation ←──  Groq LLM → JSON score report
```

**Stack:**
- **Backend:** FastAPI + Python 3.11+
- **Frontend:** Vite + React + TailwindCSS
- **LLM (text):** Groq API (`llama3-70b-8192` or `mixtral-8x7b-32768`)
- **LLM (voice):** Google Gemini Live Streaming (`gemini-2.0-flash-live-001`)
- **Audio:** Browser `MediaRecorder` API → WebSocket → Gemini

---

## Project Structure

```
ai-interview-agent/
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── routers/
│   │   ├── questions.py         # POST /api/generate-questions
│   │   ├── transcript.py        # POST /api/analyse-transcript
│   │   └── scoring.py           # POST /api/score
│   ├── services/
│   │   ├── groq_service.py      # Groq API wrapper
│   │   └── gemini_service.py    # Gemini Live streaming handler
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   ├── ws/
│   │   └── interview_ws.py      # WebSocket handler for live voice session
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Upload.jsx        # Step 1: JD + Resume upload
│   │   │   ├── Interview.jsx     # Step 2: Live voice interview
│   │   │   └── Results.jsx       # Step 3: Score report
│   │   ├── components/
│   │   │   ├── AudioRecorder.jsx
│   │   │   ├── QuestionCard.jsx
│   │   │   └── ScoreCard.jsx
│   │   ├── services/
│   │   │   └── api.js            # Axios API calls
│   │   └── App.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── SKILL.md
```

---

## Step 1 — Backend Setup

### `requirements.txt`
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
python-multipart==0.0.9
pydantic==2.7.1
groq==0.9.0
google-generativeai==0.7.2
websockets==12.0
python-dotenv==1.0.1
PyPDF2==3.0.1
python-docx==1.1.2
httpx==0.27.0
```

### `.env.example`
```
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### `main.py`
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import questions, transcript, scoring
from ws.interview_ws import router as ws_router

app = FastAPI(title="AI Interview Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(questions.router, prefix="/api")
app.include_router(transcript.router, prefix="/api")
app.include_router(scoring.router, prefix="/api")
app.include_router(ws_router)
```

---

## Step 2 — Pydantic Schemas

### `models/schemas.py`
```python
from pydantic import BaseModel
from typing import List, Optional

class GenerateQuestionsRequest(BaseModel):
    job_description: str
    resume_text: str
    num_questions: int = 8

class Question(BaseModel):
    id: int
    text: str
    category: str          # e.g. "technical", "behavioral", "situational"
    difficulty: str        # "easy" | "medium" | "hard"

class GenerateQuestionsResponse(BaseModel):
    questions: List[Question]

class AnalyseTranscriptRequest(BaseModel):
    question: str
    answer_transcript: str

class AnalyseTranscriptResponse(BaseModel):
    summary: str
    key_points: List[str]
    sentiment: str

class ScoringRequest(BaseModel):
    job_description: str
    questions_and_answers: List[dict]  # [{question, answer, category}]

class CategoryScore(BaseModel):
    category: str
    score: int             # 0-100
    feedback: str

class ScoringResponse(BaseModel):
    overall_score: int
    category_scores: List[CategoryScore]
    strengths: List[str]
    improvements: List[str]
    hiring_recommendation: str   # "Strong Yes" | "Yes" | "Maybe" | "No"
```

---

## Step 3 — Three Core API Endpoints

### 3A. `routers/questions.py` — Question Generation

```python
from fastapi import APIRouter, UploadFile, File, Form
from models.schemas import GenerateQuestionsResponse
from services.groq_service import generate_questions_from_groq

router = APIRouter()

@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(
    job_description: str = Form(...),
    resume_text: str = Form(...),
    num_questions: int = Form(8)
):
    questions = await generate_questions_from_groq(
        job_description, resume_text, num_questions
    )
    return GenerateQuestionsResponse(questions=questions)
```

**Groq prompt strategy** (in `groq_service.py`):
```
System: You are an expert technical interviewer. 
        Analyse the JD and resume and return ONLY valid JSON.

User: JD: {job_description}
      Resume: {resume_text}
      
      Generate {num_questions} interview questions covering:
      - 40% Technical (role-specific skills from JD)
      - 30% Behavioral (past experience from resume)  
      - 30% Situational (problem-solving scenarios)
      
      Return JSON array: 
      [{"id":1,"text":"...","category":"technical","difficulty":"medium"}, ...]
```

Parse with `json.loads()` after stripping code fences.

---

### 3B. `routers/transcript.py` — Transcript Analysis

```python
from fastapi import APIRouter
from models.schemas import AnalyseTranscriptRequest, AnalyseTranscriptResponse
from services.groq_service import analyse_transcript_with_groq

router = APIRouter()

@router.post("/analyse-transcript", response_model=AnalyseTranscriptResponse)
async def analyse_transcript(req: AnalyseTranscriptRequest):
    result = await analyse_transcript_with_groq(req.question, req.answer_transcript)
    return result
```

**Groq prompt strategy:**
```
Given interview question: "{question}"
Candidate answered: "{answer_transcript}"

Return JSON:
{
  "summary": "one sentence summary",
  "key_points": ["point1", "point2"],
  "sentiment": "confident|hesitant|unclear"
}
```

---

### 3C. `routers/scoring.py` — Scoring / Evaluation

```python
from fastapi import APIRouter
from models.schemas import ScoringRequest, ScoringResponse
from services.groq_service import score_interview_with_groq

router = APIRouter()

@router.post("/score", response_model=ScoringResponse)
async def score_interview(req: ScoringRequest):
    result = await score_interview_with_groq(
        req.job_description, req.questions_and_answers
    )
    return result
```

**Groq prompt strategy:**
```
You are a senior hiring manager. Score this interview.

JD: {job_description}
Q&A: {questions_and_answers as JSON}

Return JSON with:
- overall_score (0-100)
- category_scores: [{category, score, feedback}]
- strengths: [list]
- improvements: [list]
- hiring_recommendation: "Strong Yes"|"Yes"|"Maybe"|"No"
```

---

## Step 4 — Gemini Live Streaming (Voice Interview)

### `services/gemini_service.py`

```python
import asyncio
import google.generativeai as genai
from google.generativeai.types import LiveConnectConfig, SpeechConfig, VoiceConfig
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-2.0-flash-live-001"

async def run_live_interview_session(questions: list, audio_queue: asyncio.Queue, transcript_queue: asyncio.Queue):
    """
    Connects to Gemini Live API.
    Sends questions as text → Gemini speaks them.
    Receives user audio chunks from audio_queue.
    Puts transcripts into transcript_queue.
    """
    config = LiveConnectConfig(
        response_modalities=["TEXT"],   # get text transcript back
        speech_config=SpeechConfig(
            voice_config=VoiceConfig(prebuilt_voice_config={"voice_name": "Puck"})
        ),
        system_instruction=f"""You are a professional interviewer conducting a job interview.
Ask the questions one by one. Wait for the candidate to finish speaking before proceeding.
After each answer, say "Thank you" and move to the next question.
Questions to ask: {[q['text'] for q in questions]}"""
    )

    client = genai.Client()
    async with client.aio.live.connect(model=MODEL, config=config) as session:
        # Send first question trigger
        await session.send(input="Begin the interview. Ask the first question.", end_of_turn=True)

        async def send_audio():
            while True:
                audio_chunk = await audio_queue.get()
                if audio_chunk is None:
                    break
                await session.send(input={"data": audio_chunk, "mime_type": "audio/pcm"})

        async def receive_transcripts():
            async for response in session.receive():
                if response.text:
                    await transcript_queue.put(response.text)

        await asyncio.gather(send_audio(), receive_transcripts())
```

### `ws/interview_ws.py` — WebSocket Bridge

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.gemini_service import run_live_interview_session
import asyncio, json

router = APIRouter()

@router.websocket("/ws/interview")
async def interview_websocket(websocket: WebSocket):
    await websocket.accept()
    
    # Receive questions list from first message
    init_data = await websocket.receive_json()
    questions = init_data["questions"]
    
    audio_queue = asyncio.Queue()
    transcript_queue = asyncio.Queue()
    
    async def forward_audio():
        """Receive audio bytes from browser → put in queue for Gemini"""
        try:
            while True:
                data = await websocket.receive_bytes()
                await audio_queue.put(data)
        except WebSocketDisconnect:
            await audio_queue.put(None)
    
    async def forward_transcripts():
        """Get transcripts from Gemini → send to browser"""
        while True:
            text = await transcript_queue.get()
            if text is None:
                break
            await websocket.send_json({"type": "transcript", "text": text})
    
    await asyncio.gather(
        run_live_interview_session(questions, audio_queue, transcript_queue),
        forward_audio(),
        forward_transcripts()
    )
```

---

## Step 5 — Frontend (Vite + React)

### `vite.config.js`
```js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': { target: 'ws://localhost:8000', ws: true }
    }
  }
}
```

### `src/services/api.js`
```js
import axios from 'axios'

export const generateQuestions = (formData) =>
  axios.post('/api/generate-questions', formData)

export const analyseTranscript = (data) =>
  axios.post('/api/analyse-transcript', data)

export const scoreInterview = (data) =>
  axios.post('/api/score', data)
```

### `src/pages/Upload.jsx` — Step 1
- Textarea for Job Description
- Textarea or file upload for Resume (extract text client-side or send raw)
- Number input for question count
- On submit → call `generateQuestions` → navigate to Interview page passing questions

### `src/pages/Interview.jsx` — Step 2
```
State: { questions, currentIdx, transcripts[], wsRef, isRecording }

1. On mount → open WebSocket('/ws/interview'), send { questions }
2. Receive WS messages:
   - type: "transcript" → append to transcripts[], advance currentIdx
3. AudioRecorder:
   - getUserMedia({ audio: true })
   - MediaRecorder → ondataavailable → ws.send(blob)
4. Show current question + waveform visualizer
5. When all questions done → navigate to Results
```

### `src/components/AudioRecorder.jsx`
```jsx
// Key logic:
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) ws.send(e.data)  // send chunk to backend WS
  }
  recorder.start(250)  // 250ms chunks
  setRecording(true)
}
```

### `src/pages/Results.jsx` — Step 3
- Call `/api/score` with all Q&A pairs
- Display `ScoreCard` with overall score, radar chart per category, strengths/improvements
- Hiring recommendation badge

---

## Step 6 — Data Flow Summary

```
Upload.jsx
  │─ POST /api/generate-questions ──► questions.py ──► Groq LLM
  │                                                       │
  │◄──────────────── [{id, text, category, difficulty}] ──┘
  │
Interview.jsx
  │─ WS /ws/interview ──► interview_ws.py ──► gemini_service.py
  │   send: audio PCM chunks                    │
  │   recv: transcript texts ◄──────────────────┘
  │
  │─ POST /api/analyse-transcript (per answer) ──► Groq LLM
  │
Results.jsx
  │─ POST /api/score ──► scoring.py ──► Groq LLM
  └──────────────────────────────────────────────► ScoringResponse
```

---

## Step 7 — Running the MVP

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in keys
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev            # starts at http://localhost:5173
```

---

## Common Pitfalls & Notes

| Issue | Fix |
|---|---|
| Gemini Live audio format | Must be **PCM 16-bit, 16kHz mono** — resample in browser or backend |
| CORS on WebSocket | FastAPI CORS middleware doesn't cover WS; handle in Nginx or add `allowed_origins` to WS route |
| Groq JSON parsing | Always strip ` ```json ` fences before `json.loads()` |
| Gemini session timeout | Live sessions expire after ~10 min; handle reconnection if interview is long |
| Large resume/JD | Groq context window is 32k tokens for mixtral; truncate if needed |
| Browser audio | Test with Chrome; Safari needs polyfill for `MediaRecorder` |

---

## Environment Variables Needed

```
GROQ_API_KEY       → https://console.groq.com
GEMINI_API_KEY     → https://aistudio.google.com/apikey
```

