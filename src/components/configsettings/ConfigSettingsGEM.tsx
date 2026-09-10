import React from 'react';

import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';
import UploadButton from './UploadButton';

// API base URL for GEM-specific requests
const instrument_url = `/extras/gem`;

const ConfigSettingsGEM: React.FC = () => {
  // File uploader logic for GEM
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional GEM-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <UploadButton onChange={handleFileSelection} selectedFile={selectedFile} uploadMessage={uploadMessage} />
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsGEM;
