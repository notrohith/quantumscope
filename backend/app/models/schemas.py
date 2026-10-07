"""Wire contracts retain the frontend's existing metric and measurement names."""

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator


class BellState(StrEnum):
    PHI_PLUS = "phi_plus"
    PHI_MINUS = "phi_minus"
    PSI_PLUS = "psi_plus"
    PSI_MINUS = "psi_minus"


ALLOWED_SHOTS = (512, 1024, 2048, 4096, 8192)
Probability = Annotated[float, Field(ge=0, le=1)]


class EntanglementRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    state: BellState
    shots: StrictInt = 2048
    seed: Annotated[int, Field(strict=True, ge=0, le=2**32 - 1)] = 42

    @field_validator("shots")
    @classmethod
    def validate_shots(cls, value: int) -> int:
        if value not in ALLOWED_SHOTS:
            raise ValueError(f"shots must be one of {ALLOWED_SHOTS}")
        return value


class Measurement(BaseModel):
    outcome: Literal["00", "01", "10", "11"]
    probability: Probability


class EntanglementResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    state: BellState
    shots: int
    seed: int
    counts: dict[str, int]
    measurements: list[Measurement]
    concurrence: Probability
    fidelity: Probability
    reduced_entropy: Probability = Field(alias="reducedEntropy")
    zz_correlation: float = Field(ge=-1, le=1, alias="zzCorrelation")
    engine: Literal["qiskit-aer"] = "qiskit-aer"
    bit_order: Literal["q0q1"] = Field(default="q0q1", alias="bitOrder")


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["quantumscope-backend"] = "quantumscope-backend"
    simulation_engine: Literal["qiskit-aer"] = "qiskit-aer"


class NoiseType(StrEnum):
    DEPOLARIZING = "depolarizing"
    AMPLITUDE_DAMPING = "amplitude_damping"
    PHASE_DAMPING = "phase_damping"
    READOUT_ERROR = "readout_error"


class NoiseRequest(EntanglementRequest):
    model: NoiseType
    strength: Annotated[float, Field(strict=True, ge=0, le=0.5, allow_inf_nan=False)]


class NoiseSweepPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    noise: float = Field(ge=0, le=0.5)
    concurrence: Probability
    fidelity: Probability
    reduced_entropy: Probability = Field(alias="reducedEntropy")
    quantum_zz_correlation: float = Field(ge=-1, le=1, alias="quantumZZCorrelation")
    # Exact expected recorded correlation; selected-run measuredZZ is sampled.
    measured_zz_correlation: float = Field(ge=-1, le=1, alias="measuredZZCorrelation")


class NoiseResponse(NoiseRequest):
    model_config = ConfigDict(populate_by_name=True, extra="forbid")
    counts: dict[str, int]
    measurements: list[Measurement]
    initial_concurrence: Probability = Field(alias="initialConcurrence")
    final_concurrence: Probability = Field(alias="finalConcurrence")
    fidelity: Probability
    reduced_entropy: Probability = Field(alias="reducedEntropy")
    quantum_zz_correlation: float = Field(ge=-1, le=1, alias="quantumZZCorrelation")
    measured_zz_correlation: float = Field(ge=-1, le=1, alias="measuredZZCorrelation")
    trend: list[NoiseSweepPoint] = Field(min_length=11, max_length=11)
    engine: Literal["qiskit-aer"] = "qiskit-aer"
    bit_order: Literal["q0q1"] = Field(default="q0q1", alias="bitOrder")


class TargetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    reflectivity: Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)] = 0.1
    background_noise: Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False, alias="backgroundNoise")] = 0.25
    channel_noise: Annotated[float, Field(strict=True, ge=0, le=0.5, allow_inf_nan=False, alias="channelNoise")] = 0.1
    shots: StrictInt = 2048
    seed: Annotated[int, Field(strict=True, ge=0, le=2**32 - 1)] = 42

    @field_validator("shots")
    @classmethod
    def validate_shots(cls, value: int) -> int:
        return EntanglementRequest.validate_shots(value)


class IlluminationRequest(TargetRequest):
    target_present: Annotated[bool, Field(strict=True, alias="targetPresent")] = True
    trials: StrictInt = 200

    @field_validator("trials")
    @classmethod
    def validate_trials(cls, value: int) -> int:
        if value not in (100, 200, 500):
            raise ValueError("trials must be 100, 200, or 500 per hypothesis")
        return value


class IlluminationResponse(IlluminationRequest):
    receiver_score: Probability = Field(alias="receiverScore")
    threshold: Probability
    decision: Literal["target", "no_target"]
    detection_probability: Probability = Field(alias="detectionProbability")
    false_alarm_probability: Probability = Field(alias="falseAlarmProbability")
    miss_probability: Probability = Field(alias="missProbability")
    error_probability: Probability = Field(alias="errorProbability")
    mean_h0_score: Probability = Field(alias="meanH0Score")
    mean_h1_score: Probability = Field(alias="meanH1Score")
    exact_h0_score: Probability = Field(alias="exactH0Score")
    exact_h1_score: Probability = Field(alias="exactH1Score")
    detection_count: int = Field(ge=0, alias="detectionCount")
    false_alarm_count: int = Field(ge=0, alias="falseAlarmCount")
    counts: dict[str, int]
    measurements: list[Measurement]
    engine: Literal["qiskit-aer"] = "qiskit-aer"
    model: Literal["qubit-illumination"] = "qubit-illumination"
    bit_order: Literal["q0q1"] = Field(default="q0q1", alias="bitOrder")
    threshold_method: Literal["exact-model-midpoint"] = Field(default="exact-model-midpoint", alias="thresholdMethod")
    trial_sampling: Literal["exact-probability-binomial"] = Field(default="exact-probability-binomial", alias="trialSampling")


class ComparisonRequest(TargetRequest):
    trials: StrictInt = 500

    @field_validator("trials")
    @classmethod
    def validate_trials(cls, value: int) -> int:
        if value not in (200, 500, 1000):
            raise ValueError("trials must be 200, 500, or 1000 per hypothesis")
        return value


class DetectionMetrics(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    detection_probability: Probability = Field(alias="detectionProbability")
    false_alarm_probability: Probability = Field(alias="falseAlarmProbability")
    miss_probability: Probability = Field(alias="missProbability")
    error_probability: Probability = Field(alias="errorProbability")
    detection_count: int = Field(ge=0, alias="detectionCount")
    false_alarm_count: int = Field(ge=0, alias="falseAlarmCount")
    threshold: Probability
    mean_h0_score: Probability = Field(alias="meanH0Score")
    mean_h1_score: Probability = Field(alias="meanH1Score")
    exact_h0_score: Probability = Field(alias="exactH0Score")
    exact_h1_score: Probability = Field(alias="exactH1Score")


class ROCPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    false_alarm_probability: Probability = Field(alias="falseAlarmProbability")
    detection_probability: Probability = Field(alias="detectionProbability")


class ComparisonStrategy(DetectionMetrics):
    shots: int
    trials: int
    roc: list[ROCPoint]
    auc: Probability


class ComparisonSweepPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    background_noise: Probability = Field(alias="backgroundNoise")
    quantum: DetectionMetrics
    control: DetectionMetrics


class ComparisonResponse(ComparisonRequest):
    quantum: ComparisonStrategy
    control: ComparisonStrategy
    sweep: list[ComparisonSweepPoint] = Field(min_length=9, max_length=9)
    engine: Literal["qiskit-aer"] = "qiskit-aer"
    model: Literal["qubit-comparison"] = "qubit-comparison"
    priors: Literal["equal"] = "equal"
    threshold_method: Literal["exact-model-midpoint"] = Field(default="exact-model-midpoint", alias="thresholdMethod")
    trial_sampling: Literal["exact-probability-binomial"] = Field(default="exact-probability-binomial", alias="trialSampling")
