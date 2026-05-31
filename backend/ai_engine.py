import fitz  # PyMuPDF
import docx
import spacy
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

nlp = spacy.load("en_core_web_sm")
model = SentenceTransformer('all-MiniLM-L6-v2')

def extract_text_from_pdf(content: bytes) -> str:
    doc = fitz.open(stream=content, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_docx(content: bytes) -> str:
    import io
    doc = docx.Document(io.BytesIO(content))
    return "\n".join([para.text for para in doc.paragraphs])

def compute_tfidf_similarity(jd_text: str, resume_text: str) -> float:
    vectorizer = TfidfVectorizer(stop_words='english')
    try:
        tfidf_matrix = vectorizer.fit_transform([jd_text, resume_text])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(similarity * 100)
    except:
        return 0.0

def compute_bert_similarity(jd_text: str, resume_text: str) -> float:
    try:
        embeddings = model.encode([jd_text, resume_text])
        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity * 100)
    except:
        return 0.0

def extract_skills(text: str) -> set:
    doc = nlp(text)
    skills = set()
    for ent in doc.ents:
        if ent.label_ in ["ORG", "PRODUCT", "WORK_OF_ART", "GPE"]:
            skills.add(ent.text.lower())
    
    # Simple heuristic to extract uppercase words and known tech terms that Spacy misses
    for token in doc:
        if token.pos_ in ["PROPN", "NOUN"] and (token.is_upper or token.is_title):
            skills.add(token.text.lower())
            
    # Filter out generic words
    generic = {"experience", "team", "development", "work", "years", "degree", "knowledge", "skills", "ability", "role", "environment", "application", "software", "system", "requirements", "design", "business", "data", "science", "computer", "engineering", "project", "product", "solutions", "support", "management", "tools", "using", "building", "creating", "working"}
    return skills - generic

def compute_skill_match(jd_text: str, resume_text: str) -> tuple[float, list[str], list[str]]:
    jd_skills = extract_skills(jd_text)
    if not jd_skills:
        return 100.0, [], []
    
    resume_text_lower = resume_text.lower()
    matched = []
    missing = []
    
    for skill in jd_skills:
        if skill in resume_text_lower:
            matched.append(skill)
        else:
            missing.append(skill)
            
    score = (len(matched) / len(jd_skills)) * 100.0
    return score, matched, missing
