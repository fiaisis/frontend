// React components
import { useState } from 'react';

// Axios components
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const FileUploader = (instrument_url: string) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Callback for choosing a file
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files ? event.target.files[0] : null;
    setSelectedFile(file);
    const newUploadMessage = file ? `Selected file: ${file.name}` : '';
    setUploadMessage(newUploadMessage);
  };

  // Callback for uploading the chosen file
  const handleFileUpload = async (): Promise<void> => {
    console.log('Before SelectedFile');
    if (!selectedFile) return;
    console.log('After selectedFileCheck');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      console.log('FormDataSet');
      await axios.post(`${instrument_url}/${selectedFile.name}`, formData);
      console.log('Axios post made');
      setUploadMessage(`Uploaded file: ${selectedFile.name}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload the file');
    }
  };
  return { selectedFile, uploadMessage, handleFileSelection, handleFileUpload };
};

export default FileUploader;
