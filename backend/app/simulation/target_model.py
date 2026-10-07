"""One target/environment implementation shared by both transmitters and labs."""
from qiskit.quantum_info import DensityMatrix, partial_trace
from qiskit_aer.noise import amplitude_damping_error, depolarizing_error


def target_hypotheses(transmitter: DensityMatrix, reflectivity: float, background: float, channel_noise: float):
    reference = partial_trace(transmitter, [0])
    # Native q1q0 ordering: reference first, signal second. H0 independently replaces signal.
    h0 = reference.tensor(DensityMatrix.from_label("0"))
    h1 = transmitter.evolve(amplitude_damping_error(1-reflectivity).to_quantumchannel(), qargs=[0])
    for strength in (background, channel_noise):
        channel = depolarizing_error(strength, 1).to_quantumchannel()
        h0 = h0.evolve(channel, qargs=[0])
        h1 = h1.evolve(channel, qargs=[0])
    return h0, h1
