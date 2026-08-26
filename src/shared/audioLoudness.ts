export type AudioLoudness = {
  activeRms: number;
  peak: number;
};

const silenceFloor = 0.012;
const targetVoiceRms = 0.13;
const maxNormalizedPeak = 0.92;
const minVoiceGain = 0.55;
const maxVoiceGain = 2.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function measureAudioLoudness(buffer: AudioBuffer): AudioLoudness {
  let activeSquares = 0;
  let activeSamples = 0;
  let allSquares = 0;
  let allSamples = 0;
  let peak = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      const absolute = Math.abs(data[index] ?? 0);
      peak = Math.max(peak, absolute);
      allSquares += absolute * absolute;
      allSamples += 1;
      if (absolute >= silenceFloor) {
        activeSquares += absolute * absolute;
        activeSamples += 1;
      }
    }
  }

  const rmsSourceSquares = activeSamples ? activeSquares : allSquares;
  const rmsSourceSamples = activeSamples || allSamples || 1;
  return {
    activeRms: Math.sqrt(rmsSourceSquares / rmsSourceSamples),
    peak
  };
}

export function gainForNormalizedVoice(loudness: AudioLoudness) {
  if (!Number.isFinite(loudness.activeRms) || loudness.activeRms <= 0) return 1;
  const rmsGain = targetVoiceRms / loudness.activeRms;
  const peakGain = loudness.peak > 0 ? maxNormalizedPeak / loudness.peak : maxVoiceGain;
  return clamp(Math.min(rmsGain, peakGain), minVoiceGain, maxVoiceGain);
}

export function normalizedVoiceGain(buffer: AudioBuffer) {
  return gainForNormalizedVoice(measureAudioLoudness(buffer));
}
