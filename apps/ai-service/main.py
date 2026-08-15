from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np

app = FastAPI(
    title="RideX AI Enterprise Subsystem",
    version="2.0.0",
    description="Python FastAPI Subsystem for AI Driver Ranking and Kinematic Fraud / GPS Spoofing Evaluation"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CandidateDriver(BaseModel):
    id: str
    etaMinutes: float
    distanceKm: float
    rating: float
    acceptanceRate: float
    cancellationRate: float

class RankRequest(BaseModel):
    drivers: List[CandidateDriver]

class FraudEvaluationRequest(BaseModel):
    driverId: str
    speedKmH: float
    displacementKm: float
    timeDeltaSeconds: float

@app.get("/health")
def health():
    return {"status": "ok", "subsystem": "ai-fraud-engine"}

@app.post("/v1/dispatch/rank")
def rank_dispatch_candidates(req: RankRequest):
    if not req.drivers:
        return {"rankedCandidates": []}

    ranked = []
    for d in req.drivers:
        # Score Formula:
        # Score = (0.35 * ETA) + (0.25 * Dist) + (0.15 * Rating) + (0.15 * AcceptRate) + (0.10 * CancelRate)
        eta_score = max(0, 100 - (d.etaMinutes * 10))
        dist_score = max(0, 100 - (d.distanceKm * 15))
        rating_score = (d.rating / 5.0) * 100

        composite_score = (
            (0.35 * eta_score) +
            (0.25 * dist_score) +
            (0.15 * rating_score) +
            (0.15 * d.acceptanceRate) -
            (0.10 * d.cancellationRate)
        )
        ranked.append({
            "driverId": d.id,
            "score": round(float(composite_score), 2),
            "etaMinutes": d.etaMinutes,
            "rating": d.rating
        })

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return {"rankedCandidates": ranked}

@app.post("/v1/fraud/evaluate")
def evaluate_kinematic_fraud(req: FraudEvaluationRequest):
    flags = []
    risk_score = 0.05

    # Kinematic speed ceiling check (>180 km/h)
    if req.speedKmH > 180:
        risk_score += 0.60
        flags.append("KINEMATIC_SPEED_CEILING_EXCEEDED")

    # Displacement jump check (>250 km/h instantaneous equivalent)
    if req.timeDeltaSeconds > 0:
        calculated_velocity = (req.displacementKm / (req.timeDeltaSeconds / 3600.0))
        if calculated_velocity > 250:
            risk_score += 0.35
            flags.append("INSTANTANEOUS_GPS_DISPLACEMENT_JUMP")

    risk_score = min(0.99, risk_score)
    risk_level = "HIGH" if risk_score > 0.60 else ("MEDIUM" if risk_score > 0.30 else "LOW")

    return {
        "driverId": req.driverId,
        "riskScore": round(float(risk_score), 2),
        "riskLevel": risk_level,
        "gpsSpoofingFlags": flags if flags else ["TELEMETRY_VALID"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
