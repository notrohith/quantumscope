// Neutral settings exercised by scripts/smoke-test.py. These only populate controls.
export const demoPresets = {
  entanglement: { state: "Bell Φ+" as const, shots: 2048 },
  noise: {
    state: "Bell Φ+" as const,
    model: "Depolarizing" as const,
    strength: 0.2,
    shots: 2048,
  },
  illumination: {
    targetPresent: true,
    reflectivity: 0.1,
    backgroundNoise: 0.25,
    channelNoise: 0.1,
    shots: 2048,
    trials: 200,
  },
  comparison: {
    reflectivity: 0.1,
    backgroundNoise: 0.25,
    channelNoise: 0.1,
    shots: 2048,
    trials: 500,
  },
};
