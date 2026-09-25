import { Job } from './types';

export const getRunReductionHistoryUrl = (
  run: Pick<Job['run'], 'filename' | 'instrument_name'>,
  reductionId?: number | null
): string => {
  const params = new URLSearchParams();
  if (run.filename) params.set('filters', JSON.stringify({ filename: run.filename }));
  if (reductionId != null) params.set('reductionId', String(reductionId));
  return `/reduction-history/${encodeURIComponent(run.instrument_name)}?${params.toString()}`;
};
