from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from .engine import ENGINE

app = FastAPI(title="Cementing Calculation API", version="0.1.0")

class PipeModel(BaseModel):
    od: float
    id: float
    wt: float
    length: float
    md: float
    tvd: float
    grade: str = ""

class HoleOverlapModel(BaseModel):
    openHoleId: float = Field(8.5, alias="openHoleId")
    linerOverlap: float = 300
    shoeTrackLength: float = 200

class MudModel(BaseModel):
    ppg: float = 13.0

class CalcRequest(BaseModel):
    casing: PipeModel
    liner: PipeModel
    dp1: PipeModel
    dp2: Optional[PipeModel] = None
    mud: MudModel
    holeOverlap: HoleOverlapModel

class CalcResponse(BaseModel):
    cementVolume: float
    mudPPG: float
    annulusAreaFt2: float

@app.post("/calculate", response_model=CalcResponse)
def calculate(req: CalcRequest):
    try:
        result = ENGINE.calculate(req.model_dump(by_alias=True))
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}
