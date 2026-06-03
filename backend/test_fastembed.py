from fastembed import TextEmbedding
from sklearn.metrics.pairwise import cosine_similarity

model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
jd_text = "Software Engineer with Python experience"
resume_text = "I am a chef who cooks food"
resume_text2 = "Software Engineer with Python experience"

embeddings = list(model.embed([jd_text, resume_text, resume_text2]))
sim1 = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
sim2 = cosine_similarity([embeddings[0]], [embeddings[2]])[0][0]
print(f"Similarity 1: {sim1 * 100}")
print(f"Similarity 2: {sim2 * 100}")
