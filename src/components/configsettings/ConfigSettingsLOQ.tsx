// React components
import React from 'react';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';
import UploadButton from './UploadButton';

// API base URL for LOQ-specific requests
const instrument_url = `/extras/loq`;

const ConfigSettingsLOQ: React.FC = () => {
  // File uploader logic for LOQ
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional LOQ-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <UploadButton onChange={handleFileSelection} selectedFile={selectedFile} uploadMessage={uploadMessage} />
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsLOQ;
