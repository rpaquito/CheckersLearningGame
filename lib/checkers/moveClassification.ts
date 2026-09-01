export type MoveQuality = 'boa' | 'imprecisao' | 'erro';

// Difference between the best available move's evaluation and the played
// move's evaluation, both from the perspective of whoever moved. Never
// negative: a played move that scores better than the reference (can
// happen with a shallower reference search) counts as zero loss.
export function evalLoss(bestEval: number, playedEval: number): number {
  return Math.max(0, bestEval - playedEval);
}

// Checkers-recalibrated thresholds (spec §3) -- NOT chess's centipawn scale.
// Checkers' material scale here is man=100/king=275 and swings are
// generally smaller-magnitude than chess (no queen-scale blunders).
// Provisional, same "verify by playing" caveat as the search depth/time
// numbers in difficulty.ts.
export function classifyMove(loss: number): MoveQuality {
  if (loss < 0) {
    throw new RangeError('loss não pode ser negativo');
  }
  if (loss <= 15) return 'boa';
  if (loss <= 50) return 'imprecisao';
  return 'erro';
}
