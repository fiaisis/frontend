/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React, { useState } from 'react';
import axios, { AxiosResponse } from 'axios';

const FileUpload = (url: string) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [response, setResponse] = useState<AxiosResponse | null>(null);

  const handleFileUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }

    const formData = new FormData();
    try {
      if (selectedFile) {
        formData.append('file', selectedFile as File, selectedFile.name as string);
        const theResponse = await axios.post(url + '/' + selectedFile.name, formData);
        setResponse(theResponse);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      console.error(e.response.statusText, e.response.data.detail);
    }
  };

  return { response, handleFileUpload };
};

export default FileUpload;
