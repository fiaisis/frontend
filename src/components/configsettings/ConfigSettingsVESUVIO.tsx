// React components
import React from 'react';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';
import UploadButton from './UploadButton';

// API base URL for VESUVIO-specific request
const instrument_url = `extras/vesuvio`;

const ConfigSettingsVESUVIO: React.FC = () => {
  // File uploader logic for VESUVIO
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional VESUVIO-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <UploadButton onChange={handleFileSelection} selectedFile={selectedFile} uploadMessage={uploadMessage} />
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsVESUVIO;
