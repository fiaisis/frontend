import React from 'react';
import { useParams } from 'react-router-dom';
import NexusViewer from '../components/data-viewer/NexusViewer';
import TextViewer from '../components/data-viewer/TextViewer';

export default function DataViewer(): JSX.Element {
  const params = useParams<{
    instrument?: string;
    experimentNumber?: string;
    filename?: string;
    userNumber?: string;
  }>();

  // Route could be generic or instrument-specific
  const instrument = params.instrument;
  const experimentNumber = params.experimentNumber;
  const filename = params.filename ?? '';
  const userNumber = params.userNumber;

  const fileExtension = filename.split('.').pop() ?? 'nxs';

  // Connect to Plotting API configured in Vite
  const apiUrl = import.meta.env.VITE_FIA_PLOTTING_API_URL ?? 'http://localhost:4000';
  const textFiles: Array<string> = ['txt', 'csv', 'gss', 'abc', 'prm'];

  return (
    <main className="h5-container" style={{ height: '100vh', width: '100vw' }}>
      {textFiles.includes(fileExtension) ? (
        <TextViewer
          apiUrl={apiUrl}
          experimentNumber={experimentNumber}
          instrument={instrument}
          userNumber={userNumber}
          filename={filename}
        />
      ) : (
        <NexusViewer
          apiUrl={apiUrl}
          experimentNumber={experimentNumber}
          instrument={instrument}
          userNumber={userNumber}
          filename={filename}
        />
      )}
    </main>
  );
}
