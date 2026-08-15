from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

app = FastAPI(
    title="RideX AI Intelligence Microservice",
    version="1.0.0",
    description="Provides AI Driver Recommendation Ranking, Fraud & GPS Spoofing Detection, and AI Customer Support"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class DriverCandidate(BaseModel):
    id: str
    eta: float  # in minutes
    distance: float  # in km
    rating: float  # 1 to 5
    acceptanceRate: float  # 0 to 100
    cancellationRate: float  # 0 to 100

class RecommendationRequest(BaseModel):
    drivers: List[DriverCandidate]

class FraudCheckRequest(BaseModel):
    driverId: str
    speedKmH: float
    distanceJumpKm: float
    timeDeltaSec: float

class SupportRequest(BaseModel):
    prompt: str
    rideId: Optional[str] = None
    fareAmount: Optional[float] = None

@app.get("/")
def read_root():
    return {"service": "RideX AI Microservice", "status": "online"}

@app.post("/recommend-drivers")
def recommend_drivers(req: RecommendationRequest):
    if not req.drivers:
        return {"ranked_drivers": []}

    ranked = []
    for d in req.drivers:
        # Score Formula:
        # 40% ETA penalty + 25% distance penalty + 15% Rating + 10% Acceptance - 10% Cancellation
        eta_score = max(0, 100 - (d.eta * 10))
        dist_score = max(0, 100 - (d.distance * 15))
        rating_score = (d.rating / 5.0) * 100

        final_score = (
            (0.40 * eta_score) +
            (0.25 * dist_score) +
            (0.15 * rating_score) +
            (0.10 * d.acceptanceRate) -
            (0.10 * d.cancellationRate)
        )
        ranked.append({
            "driverId": d.id,
            "aiScore": round(float(final_score), 2),
            "eta": d.eta,
            "rating": d.rating
        })

    # Sort descending by aiScore
    ranked.sort(key=lambda x: x["aiScore"], reverse=True)
    return {"ranked_drivers": ranked}

@app.post("/detect-fraud")
def detect_fraud(req: FraudCheckRequest):
    reasons = []
    risk_score = 0.05

    # Fraud criteria
    if req.speedKmH > 180:
        risk_score += 0.60
        reasons.append("Impossible vehicular speed recorded (>180 km/h)")
    if req.timeDeltaSec > 0 and (req.distanceJumpKm / (req.timeDeltaSec / 3600.0)) > 250:
        risk_score += 0.35
        reasons.append("GPS spatial jump anomaly detected")

    risk_score = min(0.99, risk_score)
    risk_level = "HIGH" if risk_score > 0.60 else ("MEDIUM" if risk_score > 0.30 else "LOW")

    return {
        "driverId": req.driverId,
        "riskScore": round(float(risk_score), 2),
        "riskLevel": risk_level,
        "reasons": reasons if reasons else ["Telemetry within normal bounds"]
    }

@app.post("/support-assistant")
def support_assistant(req: SupportRequest):
    prompt_lower = req.prompt.lower()
    
    if "refund" in prompt_lower or "cancel" in prompt_lower:
        return {
            "reply": "I understand your concern regarding refund or cancellation charges. I am flagging this ticket for immediate human support agent review to process your request.",
            "requiresHumanHandoff": True
        }
    elif "extra" in prompt_lower or "fare" in prompt_lower:
        fare_text = f" of ${req.fareAmount:.2f}" if req.fareAmount else ""
        return {
            "reply": f"The total fare{fare_text} includes base price, time rate, distance fee, and applicable taxes. Peak surge multiplier applies when driver supply is limited in your pick-up area.",
            "requiresHumanHandoff": False
        }
    else:
        return {
            "reply": "Hello! I am RideX Assistant. How can I help you with your trip, driver details, or receipt today?",
            "requiresHumanHandoff": False
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
