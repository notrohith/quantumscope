import os
from app.config import parse_origins

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(title="QuantumScope Backend", version="0.8.0", description="Discrete-variable qubit simulations for educational and research exploration. No hardware execution or database.")
allowed_origins = parse_origins(os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)
