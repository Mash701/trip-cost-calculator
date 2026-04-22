from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

df = pd.read_csv("output/vic_suburbs_final.csv").fillna("")
df["suburb_name"] = df["suburb_name"].astype(str)

@app.get("/")
def root():
    return {"message": "Suburb API is running"}

@app.get("/suburbs")
def get_suburbs(limit: int = 20):
    return df.head(limit).to_dict(orient="records")

@app.get("/search_suburbs")
def search_suburbs(q: str = "", limit: int = 20):
    q = q.strip().upper()
    if not q:
        return []

    matches = df[df["suburb_name"].str.upper().str.contains(q, na=False)]
    matches = matches.head(limit)

    return matches.to_dict(orient="records")