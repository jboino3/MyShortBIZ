from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uuid

app = FastAPI(title="myShortBiz API")

# Allow React dev server
origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BizCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Biz(BizCreate):
    id: str

DB: dict[str, Biz] = {}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "myShortBiz"}

@app.get("/api/business", response_model=List[Biz])
def list_businesses():
    return list(DB.values())

@app.post("/api/business", response_model=Biz, status_code=201)
def create_business(payload: BizCreate):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    biz = Biz(id=str(uuid.uuid4()), **payload.dict())
    DB[biz.id] = biz
    return biz

@app.delete("/api/business/{biz_id}", status_code=204)
def delete_business(biz_id: str):
    if biz_id not in DB:
        raise HTTPException(status_code=404, detail="Not found")
    del DB[biz_id]
    return None


