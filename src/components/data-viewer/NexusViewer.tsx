import '@h5web/app/styles.css';
import { App, createBasicFetcher, H5GroveProvider } from '@h5web/app';
import React, { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { CircularProgress, Stack } from '@mui/material';
import { FileQueryUrl } from './utils/FileQueryUrl';
import { Fallback } from './utils/FallbackPage';
import { h5Api } from '../../lib/api';

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

  const absoluteGroveApiUrl = new URL(apiUrl, window.location.origin).toString();

  useEffect(() => {
    setLoading(true);
    const loadedToken = localStorage.getItem('scigateway:token') ?? '';
    setToken(loadedToken);

    const fileQueryUrl = FileQueryUrl(instrument, experimentNumber, userNumber);
    if (fileQueryUrl == null) {
      setLoading(false);
      throw new Error('The API file query URL was not rendered correctly and returned null');
    }

    const fileQueryParams = `filename=${filename}`;

    h5Api
      .get(`${fileQueryUrl}?${fileQueryParams}`)
      .then((res) => {
        // Axios handles text response vs JSON differently, so we check if data is string or object
        const dataStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const filepath_to_use = dataStr.split('%20').join(' ').split('%C').join(',').replace(/"/g, '');
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
    const basicFetcher = createBasicFetcher({ headers });
    return (url: string, options: Record<string, string>) => {
      const fixedUrl = url.replace(/\/+(\?|$)/, '$1');
      return basicFetcher(fixedUrl, options);
    };
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
        <H5GroveProvider url={absoluteGroveApiUrl} filepath={filepath} fetcher={fetcher}>
          <App propagateErrors />
        </H5GroveProvider>
      )}
    </ErrorBoundary>
  );
}
