import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { CircularProgress } from '@mui/material';
import { Stack } from '@mui/system';
import { Fallback } from './utils/FallbackPage';
import { TextQueryUrl } from './utils/TextQueryUrl';
import { h5Api } from '../../lib/api';

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

    const textQueryUrl = TextQueryUrl(apiUrl, instrument, experimentNumber, userNumber);
    if (textQueryUrl == null) {
      setLoading(false);
      throw new Error('The API text query URL was not rendered correctly and returned null');
    }

    const textQueryParams = `filename=${filename}`;

    h5Api
      .get(`${textQueryUrl}?${textQueryParams}`)
      .then((res) => {
        setText(res.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        if (loading) {
          setLoading(false);
          throw new Error('Data could not be loaded');
        }
      });
  }, [apiUrl, instrument, experimentNumber, filename]);

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
