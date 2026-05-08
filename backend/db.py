import aiosqlite
import json

DB_PATH = "interview.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS jds (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS candidates (
                id TEXT PRIMARY KEY,
                jd_id TEXT NOT NULL,
                name TEXT NOT NULL,
                resume_text TEXT NOT NULL,
                questions TEXT DEFAULT '[]',
                transcript TEXT DEFAULT '[]',
                scores TEXT,
                FOREIGN KEY (jd_id) REFERENCES jds(id)
            )
        """)
        await db.commit()

def _conn():
    return aiosqlite.connect(DB_PATH)

# --- JD operations ---
async def insert_jd(id, title, description):
    async with _conn() as db:
        await db.execute("INSERT INTO jds VALUES (?, ?, ?)", (id, title, description))
        await db.commit()

async def get_all_jds():
    async with _conn() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM jds") as cur:
            return [dict(r) for r in await cur.fetchall()]

async def get_jd(id):
    async with _conn() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM jds WHERE id = ?", (id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None

# --- Candidate operations ---
async def insert_candidate(id, jd_id, name, resume_text):
    async with _conn() as db:
        await db.execute("INSERT INTO candidates (id, jd_id, name, resume_text) VALUES (?, ?, ?, ?)",
                         (id, jd_id, name, resume_text))
        await db.commit()

async def get_candidates_for_jd(jd_id):
    async with _conn() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM candidates WHERE jd_id = ?", (jd_id,)) as cur:
            rows = [dict(r) for r in await cur.fetchall()]
            for r in rows:
                r["questions"] = json.loads(r["questions"])
                r["transcript"] = json.loads(r["transcript"])
                r["scores"] = json.loads(r["scores"]) if r["scores"] else None
            return rows

async def get_candidate(jd_id, cid):
    async with _conn() as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM candidates WHERE id = ? AND jd_id = ?", (cid, jd_id)) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            r = dict(row)
            r["questions"] = json.loads(r["questions"])
            r["transcript"] = json.loads(r["transcript"])
            r["scores"] = json.loads(r["scores"]) if r["scores"] else None
            return r

async def update_candidate_questions(cid, questions):
    async with _conn() as db:
        await db.execute("UPDATE candidates SET questions = ? WHERE id = ?",
                         (json.dumps([q.model_dump() for q in questions]), cid))
        await db.commit()

async def update_candidate_transcript(cid, transcript):
    async with _conn() as db:
        await db.execute("UPDATE candidates SET transcript = ? WHERE id = ?",
                         (json.dumps(transcript), cid))
        await db.commit()

async def update_candidate_scores(cid, scores):
    async with _conn() as db:
        await db.execute("UPDATE candidates SET scores = ? WHERE id = ?",
                         (json.dumps(scores), cid))
        await db.commit()
