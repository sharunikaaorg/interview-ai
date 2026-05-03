import os
import json
from groq import AsyncGroq
from models.schemas import Question, ScoringResponse, CategoryScore
from dotenv import load_dotenv

load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

def _strip_fences(content: str) -> str:
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    return content.strip()

async def generate_questions_from_groq(job_description: str, resume_text: str, num_questions: int = 8):
    system_prompt = """You are an expert technical interviewer. 
    Analyze the job description and resume and return ONLY valid JSON.
    Do not include any markdown formatting or code fences."""

    user_prompt = f"""JD: {job_description}
Resume: {resume_text}

Generate {num_questions} interview questions covering:
- 40% Technical (role-specific skills from JD)
- 30% Behavioral (past experience from resume)  
- 30% Situational (problem-solving scenarios)

Return JSON array: 
[{{"id":1,"text":"...","category":"technical","difficulty":"medium"}}, ...]

Categories must be one of: "technical", "behavioral", "situational"
Difficulty must be one of: "easy", "medium", "hard"
"""
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        content = _strip_fences(response.choices[0].message.content.strip())
        return [Question(**q) for q in json.loads(content)]
    except Exception as e:
        print(f"Error generating questions: {e}")
        return [
            Question(id=1, text="Tell me about yourself and your background.", category="behavioral", difficulty="easy"),
            Question(id=2, text="What interests you about this role?", category="behavioral", difficulty="easy"),
            Question(id=3, text="Describe a challenging project you worked on.", category="behavioral", difficulty="medium"),
            Question(id=4, text="How would you approach solving a complex technical problem?", category="technical", difficulty="medium")
        ]

async def score_from_transcript_with_groq(job_description: str, transcript: list):
    """Score interview from the full conversation transcript."""
    system_prompt = """You are a senior hiring manager. Score this interview based on the full conversation transcript. Return ONLY valid JSON without markdown formatting."""

    user_prompt = f"""Job Description: {job_description}

Full Interview Transcript:
{json.dumps(transcript, indent=2)}

Analyze the candidate's responses and return JSON with:
- overall_score (0-100)
- category_scores: [{{"category": "technical", "score": 0-100, "feedback": "detailed feedback"}}, ...]
- strengths: ["strength1", "strength2"]
- improvements: ["improvement1", "improvement2"]  
- hiring_recommendation: "Strong Yes"|"Yes"|"Maybe"|"No"

Score based on: technical competency, communication clarity, problem-solving, cultural fit, relevant experience."""

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1500
        )
        content = _strip_fences(response.choices[0].message.content.strip())
        data = json.loads(content)
        return ScoringResponse(
            overall_score=data["overall_score"],
            category_scores=[CategoryScore(**s) for s in data["category_scores"]],
            strengths=data["strengths"],
            improvements=data["improvements"],
            hiring_recommendation=data["hiring_recommendation"]
        )
    except Exception as e:
        print(f"Error scoring interview: {e}")
        return ScoringResponse(
            overall_score=50,
            category_scores=[
                CategoryScore(category="technical", score=50, feedback="Unable to evaluate"),
                CategoryScore(category="behavioral", score=50, feedback="Unable to evaluate"),
                CategoryScore(category="situational", score=50, feedback="Unable to evaluate")
            ],
            strengths=["Analysis pending"],
            improvements=["Analysis pending"],
            hiring_recommendation="Maybe"
        )
