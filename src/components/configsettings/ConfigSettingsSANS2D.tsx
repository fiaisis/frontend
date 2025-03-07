// React components
import React from 'react';

// Local components
import ConfigSettingsGeneral from './ConfigSettingsGeneral';
import FileUploader from './FileUploader';
import UploadButton from './UploadButton';

// API base URL for SANS2D-specific requests
const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
const instrument_url = `${fiaApiUrl}/extras/sans2d`;

const ConfigSettingsSANS2D: React.FC = () => {
  // File uploader logic for SANS2D
  const { selectedFile, uploadMessage, handleFileSelection, handleFileUpload } = FileUploader(instrument_url);

  return (
    // Render ConfigSettingsGeneral with additional SANS2D-specific elements
    <ConfigSettingsGeneral onFileUpload={handleFileUpload}>
      <UploadButton onChange={handleFileSelection} selectedFile={selectedFile} uploadMessage={uploadMessage} />
    </ConfigSettingsGeneral>
  );
};

export default ConfigSettingsSANS2D;
