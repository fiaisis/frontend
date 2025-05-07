// React components
import React from 'react';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';
import UploadButton from './UploadButton';

// API base URL for OSIRIS-specific requests
const instrument_url = `/extras/osiris`;

const ConfigSettingsOSIRIS: React.FC = () => {
  // File uploader logic for OSIRIS
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional OSIRIS-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <UploadButton onChange={handleFileSelection} selectedFile={selectedFile} uploadMessage={uploadMessage} />
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsOSIRIS;
