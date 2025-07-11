import { Box, Grid2, useTheme } from '@mui/material';
import { SelectedFile } from './SelectedFile';
import React, { useEffect } from 'react';
import { plottingApi } from '../../lib/plotting-api';
import Graph from './Graph';

interface PlotControllerProps {
  shortListedFiles: string[];
}

export type FileToPlot = {
  fileName: string;
  plotted: boolean;
  heatmap: boolean;
  slices: number[] | undefined;
};

type Metadata = {
  shape: number[];
};

const PlotController = (props: PlotControllerProps): React.ReactElement => {
  const theme = useTheme();
  const [files, setFiles] = React.useState<FileToPlot[]>([]);

  const fetchMetadata = async (fileName: string): Promise<Metadata> => {
    return plottingApi
      .get('/meta', {
        params: {
          file: fileName,
          path: 'mantid_workspace_1/workspace/values',
        },
      })
      .then((res) => {
        return res.data as Metadata;
      });
  };

  useEffect(() => {
    (async () => {
      const tempFileArray: FileToPlot[] = [];
      for (const fileName of props.shortListedFiles) {
        const metadata = await fetchMetadata(fileName.slice(0, -1));
        if (metadata.shape[0] > 1) {
          tempFileArray.push({ fileName: fileName, plotted: true, heatmap: false, slices: [] });
        } else {
          tempFileArray.push({ fileName: fileName, plotted: true, heatmap: false, slices: [] });
        }
      }
      setFiles(tempFileArray);
    })();
  }, [props.shortListedFiles]);

  const updateSelectedFile = (selectedFile: FileToPlot): void => {
    files[files.findIndex((file) => file.fileName === selectedFile.fileName)] = selectedFile;
    setFiles([...files]);
  };

  return (
    <>
      <Grid2 size={2}>
        {files.map((file) => (
          <Box
            key={file.fileName}
            sx={{
              marginBottom: 1,
              marginLeft: 2,
              marginRight: 2,
              padding: '12px 16px',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '4px',
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <SelectedFile
              name={file.fileName}
              selected={file.plotted}
              heatmap={file.heatmap}
              updateSelected={updateSelectedFile}
            ></SelectedFile>
          </Box>
        ))}
      </Grid2>
      {files.length > 0 && (
        <Grid2 size={'grow'}>
          <Box
            sx={{
              bgcolor: '#000',
              marginRight: '32px',
            }}
          >
            <Graph filesToBePlotted={files} />
          </Box>
        </Grid2>
      )}
    </>
  );
};

export default PlotController;
