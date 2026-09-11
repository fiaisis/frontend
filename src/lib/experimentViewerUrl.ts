interface ExperimentViewerParameters {
  instrument?: string | null;
  experiment?: number | null;
  filename?: string | null;
  search?: boolean;
  jobId?: number;
  file?: string;
}

export const getExperimentViewerUrl = ({
  instrument,
  experiment,
  filename,
  search,
  jobId,
  file,
}: ExperimentViewerParameters = {}): string => {
  const query = new URLSearchParams();
  if (instrument) query.set('instrument', instrument);
  if (experiment !== undefined && experiment !== null) query.set('experiment', String(experiment));
  if (filename) query.set('filename', filename);
  if (search !== undefined) query.set('search', String(search));
  if (jobId !== undefined) query.set('jobId', String(jobId));
  if (file) query.set('file', file);
  const queryString = query.toString();
  return `/experiment-viewer${queryString ? `?${queryString}` : ''}`;
};
