from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn
import csv
import io
import os

import models
import database
import ai_engine

database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def analyze_resumes(
    job_description: str = Form(None),
    jd_file: UploadFile = File(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(database.get_db)
):
    jd_text = ""
    if jd_file and jd_file.filename:
        content = await jd_file.read()
        if jd_file.filename.endswith(".pdf"):
            jd_text = ai_engine.extract_text_from_pdf(content)
        elif jd_file.filename.endswith(".docx"):
            jd_text = ai_engine.extract_text_from_docx(content)
    elif job_description:
        jd_text = job_description
        
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description text or file is required")
        
    if not files:
        raise HTTPException(status_code=400, detail="At least one resume file is required")

    results = []
    
    for file in files:
        content = await file.read()
        text = ""
        filename = file.filename
        
        if filename.endswith(".pdf"):
            text = ai_engine.extract_text_from_pdf(content)
        elif filename.endswith(".docx"):
            text = ai_engine.extract_text_from_docx(content)
            
        if text.strip():
            # Calculate raw scores
            tfidf_score = ai_engine.compute_tfidf_similarity(jd_text, text)
            bert_score = ai_engine.compute_bert_similarity(jd_text, text)
            skill_match_score, matched_skills, missing_skills = ai_engine.compute_skill_match(jd_text, text)
            
            results.append({
                "name": filename,
                "resume_text": text,
                "raw_tfidf": tfidf_score,
                "raw_bert": bert_score,
                "skill_match": skill_match_score,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills
            })

    if not results:
        raise HTTPException(status_code=400, detail="No readable text found in resumes")

    # Dynamic Batch Scaling (55 - 92 range)
    for res in results:
        res["weighted_raw"] = (res["raw_tfidf"] * 0.40) + (res["raw_bert"] * 0.30) + (res["skill_match"] * 0.30)
        
    max_score = max(r["weighted_raw"] for r in results)
    min_score = min(r["weighted_raw"] for r in results)
    
    final_results = []
    
    for res in results:
        if max_score > min_score:
            # Scale to 55-92 range
            normalized = (res["weighted_raw"] - min_score) / (max_score - min_score)
            scaled_final = 55.0 + (normalized * (92.0 - 55.0))
        else:
            scaled_final = 80.0
            
        scaled_tfidf = min(100.0, res["raw_tfidf"] * (scaled_final / (res["weighted_raw"] + 0.001)))
        scaled_bert = min(100.0, res["raw_bert"] * (scaled_final / (res["weighted_raw"] + 0.001)))
        scaled_skill = min(100.0, res["skill_match"] * (scaled_final / (res["weighted_raw"] + 0.001)))

        candidate = models.Candidate(
            name=res["name"],
            resume_text=res["resume_text"],
            job_description=jd_text,
            tfidf_score=scaled_tfidf,
            bert_score=scaled_bert,
            skill_match_score=scaled_skill,
            matched_skills=",".join(res["matched_skills"]),
            missing_skills=",".join(res["missing_skills"]),
            final_score=scaled_final
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        
        final_results.append({
            "id": candidate.id,
            "name": candidate.name,
            "tfidf_score": round(candidate.tfidf_score, 2),
            "bert_score": round(candidate.bert_score, 2),
            "skill_match_score": round(candidate.skill_match_score, 2),
            "matched_skills": res["matched_skills"],
            "missing_skills": res["missing_skills"],
            "resume_text": res["resume_text"],
            "final_score": round(candidate.final_score, 2)
        })
        
    final_results.sort(key=lambda x: x["final_score"], reverse=True)
    
    results = []
    for i, candidate in enumerate(final_results):
        results.append({
            "id": candidate["id"],
            "name": candidate["name"],
            "tfidf_score": candidate["tfidf_score"],
            "bert_score": candidate["bert_score"],
            "skill_match_score": candidate["skill_match_score"],
            "matched_skills": candidate["matched_skills"],
            "missing_skills": candidate["missing_skills"],
            "resume_text": candidate["resume_text"],
            "final_score": candidate["final_score"],
            "rank": i + 1
        })
    return {"results": results}

@app.get("/api/export")
def export_results(db: Session = Depends(database.get_db)):
    candidates = db.query(models.Candidate).order_by(models.Candidate.final_score.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rank", "Name", "Final Score", "TF-IDF Score", "BERT Score", "Skill Match Score", "Matched Skills", "Missing Skills"])
    
    for i, c in enumerate(candidates):
        writer.writerow([
            i + 1,
            c.name,
            round(c.final_score, 2),
            round(c.tfidf_score, 2),
            round(c.bert_score, 2),
            round(c.skill_match_score, 2),
            c.matched_skills,
            c.missing_skills
        ])
        
    return Response(
        content=output.getvalue(), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=candidates.csv"}
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
