from sqlalchemy import Column, Integer, String, Float
import database

class Candidate(database.Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    resume_text = Column(String)
    job_description = Column(String)
    tfidf_score = Column(Float)
    bert_score = Column(Float)
    skill_match_score = Column(Float, default=0.0)
    matched_skills = Column(String, default="")
    missing_skills = Column(String, default="")
    final_score = Column(Float)
