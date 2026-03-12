import '@h5web/app/styles.css';
import { App, createBasicFetcher, H5GroveProvider } from '@h5web/app';
import React, { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { CircularProgress, Stack } from '@mui/material';
import { FileQueryUrl } from './utils/FileQueryUrl';
import { Fallback } from './utils/FallbackPage';

export default function NexusViewer({
  filename,
  apiUrl,
  instrument,
  experimentNumber,
  userNumber,
}: {
  filename: string;
  apiUrl: string;
  instrument?: string;
  experimentNumber?: string;
  userNumber?: string;
}): JSX.Element {
  const [filepath, setFilePath] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [groveApiUrl, setApiUrl] = useState<string>(apiUrl);

  useEffect(() => {
    setLoading(true);
    const loadedToken = localStorage.getItem('scigateway:token') ?? '';
    setToken(loadedToken);
    setApiUrl(
      apiUrl.includes('localhost') ? apiUrl : `${window.location.protocol}//${window.location.hostname}/plottingapi`
    );

    const fileQueryUrl = FileQueryUrl(apiUrl, instrument, experimentNumber, userNumber);
    if (fileQueryUrl == null) {
      throw new Error('The API file query URL was not rendered correctly and returned null');
    }

    const fileQueryParams = `filename=${filename}`;
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };
    if (loadedToken !== '') {
      headers['Authorization'] = `Bearer ${loadedToken}`;
    }

    fetch(`${fileQueryUrl}?${fileQueryParams}`, { method: 'GET', headers })
      .then((res) => res.text())
      .then((data) => {
        const filepath_to_use = data.split('%20').join(' ').split('%C').join(',').replace(/"/g, '');
        setFilePath(filepath_to_use);
      })
      .catch((error) => {
        throw new Error(error);
      })
      .finally(() => setLoading(false));
  }, [apiUrl, instrument, experimentNumber, userNumber, filename]);

  const fetcher = useMemo(() => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return createBasicFetcher({ headers });
  }, [token]);

  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      {loading ? (
        <Stack
          spacing={2}
          sx={{
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            width: '100%',
          }}
        >
          <p>Finding your file</p>
          <CircularProgress />
        </Stack>
      ) : (
        <H5GroveProvider url={groveApiUrl} filepath={filepath} fetcher={fetcher}>
          <App propagateErrors />
        </H5GroveProvider>
      )}
    </ErrorBoundary>
  );
}
