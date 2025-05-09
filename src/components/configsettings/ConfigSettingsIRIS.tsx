// React components
import React from 'react';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';
import UploadButton from './UploadButton';

// API base URL for IRIS-specific requests
const instrument_url = `/extras/iris`;

const ConfigSettingsIRIS: React.FC = () => {
  // File uploader logic for IRIS
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional IRIS-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <UploadButton onChange={handleFileSelection} selectedFile={selectedFile} uploadMessage={uploadMessage} />
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsIRIS;
