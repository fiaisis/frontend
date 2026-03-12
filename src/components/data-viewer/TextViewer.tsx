import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { CircularProgress } from '@mui/material';
import { Stack } from '@mui/system';
import { Fallback } from './utils/FallbackPage';

export default function TextViewer({
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
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    const loadedToken = localStorage.getItem('scigateway:token') ?? '';
    const textQueryUrl = `${apiUrl}/text/instrument/${instrument}/experiment_number/${experimentNumber}`;
    const textQueryParams = `filename=${filename}`;
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };
    if (loadedToken !== '') {
      headers['Authorization'] = `Bearer ${loadedToken}`;
    }

    fetch(`${textQueryUrl}?${textQueryParams}`, { method: 'GET', headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        console.log('res ok');
        return res.text();
      })
      .then((resultText) => {
        setText(resultText);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (loading) {
          setLoading(false);
          throw new Error('Data could not be loaded');
        }
      });
  }, [apiUrl, instrument, experimentNumber, filename, loading]);

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
        <div>
          <pre>{text}</pre>
        </div>
      )}
    </ErrorBoundary>
  );
}
