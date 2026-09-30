import { fftMagnitudes } from './fft';

export type SpectralBurst = { startMs: number; endMs: number; lowHz: number; highHz: number; score: number };
export type Spectrogram = { cols: number; rows: number; maxHz: number; db: number[][]; bursts: SpectralBurst[] };

export function spectrogram(b: AudioBuffer, cols = 192, rows = 96): Spectrogram {
  const d = b.getChannelData(0), sr = b.sampleRate, n = 512;
  const hop = Math.max(1, Math.floor(Math.max(1, d.length - n) / Math.max(1, cols - 1)));
  const dbs: number[][] = [], energy: number[] = [], bands: { low: number; high: number }[] = [];
  for (let c = 0; c < cols; c++) {
    const start = Math.min(Math.max(0, d.length - n), c * hop), m = fftMagnitudes(d, n, start), row: number[] = [];
    let total = 0, peak = 0;
    for (let k = 1; k < m.length; k++) if (k * sr / n >= 8000) { total += m[k]; peak = Math.max(peak, m[k]); }
    const threshold = peak * .22;
    let lo = 0, hi = 0;
    for (let k = 1; k < m.length; k++) {
      const f = k * sr / n;
      if (f >= 8000 && m[k] >= threshold) { if (!lo) lo = f; hi = f; }
    }
    for (let r = 0; r < rows; r++) {
      const k = 1 + Math.floor(r * (m.length - 1) / rows), mag = m[k];
      row.push(20 * Math.log10(Math.max(1e-7, mag)));
    }
    dbs.push(row); energy.push(total); bands.push({ low: lo || 8000, high: hi || sr / 2 });
  }
  const sorted = [...energy].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] || 0, bursts: SpectralBurst[] = [];
  for (let i = 0; i < energy.length; i++) if (energy[i] > Math.max(median * 5, .01)) {
    const startMs = i * hop / sr * 1000, endMs = (i * hop + n) / sr * 1000, last = bursts[bursts.length - 1], band = bands[i];
    if (last && startMs - last.endMs < 35) {
      last.endMs = endMs; last.lowHz = Math.min(last.lowHz, band.low); last.highHz = Math.max(last.highHz, band.high); last.score = Math.max(last.score, energy[i] / Math.max(median, 1e-9));
    } else bursts.push({ startMs, endMs, lowHz: band.low, highHz: band.high, score: energy[i] / Math.max(median, 1e-9) });
  }
  return { cols, rows, maxHz: sr / 2, db: dbs, bursts: bursts.slice(0, 8) };
}

export function drawSpectrogram(canvas: HTMLCanvasElement, s: Spectrogram) {
  const x = canvas.getContext('2d');
  if (!x) return;
  const w = canvas.width / s.cols, h = canvas.height / s.rows;
  x.fillStyle = '#080c12';
  x.fillRect(0, 0, canvas.width, canvas.height);
  for (let c = 0; c < s.cols; c++) for (let r = 0; r < s.rows; r++) {
    const v = Math.max(0, Math.min(1, (s.db[c][r] + 90) / 75)), hue = 190 + 90 * v;
    x.fillStyle = `hsl(${hue} 80% ${8 + 52 * v}%)`;
    x.fillRect(c * w, canvas.height - (r + 1) * h, Math.ceil(w) + .5, Math.ceil(h) + .5);
  }
}
