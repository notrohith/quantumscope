from app.models.schemas import ComparisonRequest, ComparisonResponse
from app.simulation.comparison import simulate_comparison
from app.models.schemas import IlluminationRequest, IlluminationResponse
from app.simulation.illumination import simulate_illumination
import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import EntanglementRequest, EntanglementResponse, HealthResponse, NoiseRequest, NoiseResponse
from app.simulation.noise import simulate_noise
from app.simulation.entanglement import SimulationError, simulate_entanglement

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Backend health", description="Lightweight service check; does not execute a circuit.")
def health() -> HealthResponse:
    return HealthResponse()


@router.post("/simulate/entanglement", response_model=EntanglementResponse, summary="Prepare an ideal Bell state", description="Select phi_plus, phi_minus, psi_plus, or psi_minus, shots, and an optional seed. Returns exact state metrics and real Aer measurement counts.", response_description="Validated metrics, echoed configuration, and Qiskit Aer provenance")
def entanglement(request: EntanglementRequest) -> EntanglementResponse:
    # A sync route keeps CPU-bound simulation off FastAPI's asynchronous loop.
    try:
        return simulate_entanglement(request)
    except SimulationError as exc:
        logger.exception("Aer entanglement simulation failed")
        raise HTTPException(status_code=503, detail="Qiskit Aer simulation failed. Please retry.") from exc
    except Exception as exc:
        logger.exception("Unexpected entanglement error")
        raise HTTPException(status_code=500, detail="An internal simulation error occurred.") from exc


@router.post("/simulate/noise", response_model=NoiseResponse, summary="Apply local noise or classical readout error", description="Select a Bell state, channel model, strength in [0,0.5], shots, and seed. Returns exact state metrics, an 11-point strength sweep, and sampled counts. Readout flips do not alter the quantum state.", response_description="Validated metrics, echoed configuration, and Qiskit Aer provenance")
def noise(request: NoiseRequest) -> NoiseResponse:
    try:
        return simulate_noise(request)
    except SimulationError as exc:
        logger.exception("Aer noise simulation failed")
        raise HTTPException(status_code=503, detail="Qiskit Aer simulation failed. Please retry.") from exc
    except Exception as exc:
        logger.exception("Unexpected noise simulation error")
        raise HTTPException(status_code=500, detail="An internal simulation error occurred.") from exc


@router.post("/simulate/illumination", response_model=IlluminationResponse, summary="Evaluate qubit target detection", description="Configure reflectivity, backgroundNoise, channelNoise, targetPresent, shots, trials, and seed. Returns one Aer observation and estimated H0/H1 detection rates from independent binomial ensembles.", response_description="Validated metrics, echoed configuration, and Qiskit Aer provenance")
def illumination(request: IlluminationRequest) -> IlluminationResponse:
    try:
        return simulate_illumination(request)
    except SimulationError as exc:
        logger.exception("Aer illumination simulation failed")
        raise HTTPException(status_code=503, detail="Qiskit Aer simulation failed. Please retry.") from exc
    except Exception as exc:
        logger.exception("Unexpected illumination simulation error")
        raise HTTPException(status_code=500, detail="An internal simulation error occurred.") from exc


@router.post("/simulate/compare", response_model=ComparisonResponse, summary="Compare quantum and unentangled control receivers", description="Set shared reflectivity, backgroundNoise, channelNoise, shots, trials, and seed. Returns resource-matched strategy estimates, empirical ROC/AUC, and a nine-point background sweep. No advantage is guaranteed.", response_description="Validated metrics, echoed configuration, and Qiskit Aer provenance")
def comparison(request: ComparisonRequest) -> ComparisonResponse:
    try:
        return simulate_comparison(request)
    except SimulationError as exc:
        logger.exception("Aer comparison simulation failed")
        raise HTTPException(status_code=503, detail="Qiskit Aer simulation failed. Please retry.") from exc
    except Exception as exc:
        logger.exception("Unexpected comparison error")
        raise HTTPException(status_code=500, detail="An internal simulation error occurred.") from exc
