import { Box, Grid2, Stack, TextField, useTheme } from '@mui/material';
import { SelectedFile } from './SelectedFile';
import React, { useEffect } from 'react';
import { plottingApi } from '../../lib/plotting-api';
import { Graph } from './Graph';

interface PlotControllerProps {
  shortListedFiles: string[];
  experimentNumber: string;
  instrument: string;
}

export type FileToPlot = {
  fileName: string;
  plotted: boolean;
  plotAsHeatmap: boolean;
  slices: number[] | undefined;
  meta: Metadata;
  visualMapMin?: number;
  visualMapMax?: number;
};

export interface Metadata {
  filename: string;
  shape: number;
  axes_labels: { axes: string };
  x_axis_min: number;
  x_axis_max: number;
  y_axis_min: number;
  y_axis_max: number;
}

const PlotController = (props: PlotControllerProps): React.ReactElement => {
  const theme = useTheme();
  const [files, setFiles] = React.useState<FileToPlot[]>([]);

  // Controls bar state
  const [slicesInput, setSlicesInput] = React.useState<string>('');
  const [vMinInput, setVMinInput] = React.useState<string>('');
  const [vMaxInput, setVMaxInput] = React.useState<string>('');

  const heatmapActive = React.useMemo(() => files.some((f) => f.plotted && f.plotAsHeatmap), [files]);

  const fetchMetadata = async (fileName: string): Promise<Metadata> => {
    return plottingApi
      .get(`/echarts_meta/${props.instrument}/${props.experimentNumber}`, {
        params: {
          filename: fileName,
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
        const metadata = await fetchMetadata(fileName);
        tempFileArray.push({ fileName: fileName, plotted: true, plotAsHeatmap: false, slices: [], meta: metadata });
      }
      setFiles(tempFileArray);
    })();
  }, [props.shortListedFiles]);

  // Initialize controls from current files whenever files list changes
  useEffect(() => {
    const firstPlottedNonHeatmap = files.find((f) => f.plotted && !f.plotAsHeatmap);
    setSlicesInput(
      firstPlottedNonHeatmap && firstPlottedNonHeatmap.slices && firstPlottedNonHeatmap.slices.length > 0
        ? firstPlottedNonHeatmap.slices.join(',')
        : ''
    );

    const firstHeatmap = files.find((f) => f.plotted && f.plotAsHeatmap);
    setVMinInput(firstHeatmap && typeof firstHeatmap.visualMapMin === 'number' ? String(firstHeatmap.visualMapMin) : '');
    setVMaxInput(firstHeatmap && typeof firstHeatmap.visualMapMax === 'number' ? String(firstHeatmap.visualMapMax) : '');
  }, [files]);

  const computeSlices = (sliceStr: string): number[] => {
    const sliceArray = sliceStr.trim() === '' ? [] : sliceStr.split(',').map((s) => parseInt(s.trim(), 10));
    return sliceArray.filter((num) => !isNaN(num));
  };

  const updateSelectedFile = (selectedFile: FileToPlot): void => {
    if (selectedFile.plotAsHeatmap) {
      setFiles((prev) =>
        prev.map((file) =>
          file.fileName === selectedFile.fileName
            ? {
                ...file,
                plotAsHeatmap: selectedFile.plotAsHeatmap,
                // keep existing slices and visualMap values; selection will be handled below
                plotted: true,
              }
            : { ...file, plotted: false }
        )
      );
    } else {
      setFiles((prev) =>
        prev.map((file) =>
          file.fileName === selectedFile.fileName
            ? {
                ...file,
                plotted: selectedFile.plotted,
                plotAsHeatmap: selectedFile.plotAsHeatmap,
                // keep existing slices/visualMap as they are controlled in the top controls bar
              }
            : file
        )
      );
    }
  };

  const onSlicesChange = (val: string): void => {
    setSlicesInput(val);
    const parsed = computeSlices(val);
    setFiles((prev) => prev.map((f) => (f.plotted && !f.plotAsHeatmap ? { ...f, slices: parsed } : f)));
  };

  const onVMinChange = (val: string): void => {
    setVMinInput(val);
    const num = val.trim() === '' ? undefined : Number(val);
    setFiles((prev) => prev.map((f) => (f.plotted && f.plotAsHeatmap ? { ...f, visualMapMin: num } : f)));
  };

  const onVMaxChange = (val: string): void => {
    setVMaxInput(val);
    const num = val.trim() === '' ? undefined : Number(val);
    setFiles((prev) => prev.map((f) => (f.plotted && f.plotAsHeatmap ? { ...f, visualMapMax: num } : f)));
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
              heatmap={file.plotAsHeatmap}
              instrument={props.instrument}
              meta={file.meta}
              experimentNumber={props.experimentNumber}
              updateSelected={updateSelectedFile}
            />
          </Box>
        ))}
      </Grid2>
      {files.length > 0 && (
        <Grid2 size={'grow'}>
          <Box sx={{ bgcolor: '#000' }}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: theme.palette.divider }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={'center'}>
                <TextField
                  label="Slices"
                  variant="standard"
                  value={slicesInput}
                  disabled={heatmapActive}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSlicesChange(e.target.value)}
                  placeholder="e.g. 0,1,2"
                  sx={{ minWidth: 200 }}
                />
                {heatmapActive && (
                  <Stack direction={'row'} spacing={2} alignItems={'center'}>
                    <TextField
                      type="number"
                      label="vMap Min"
                      variant="standard"
                      value={vMinInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onVMinChange(e.target.value)}
                      inputProps={{ step: 'any' }}
                      sx={{ width: 120 }}
                    />
                    <TextField
                      type="number"
                      label="vMap Max"
                      variant="standard"
                      value={vMaxInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onVMaxChange(e.target.value)}
                      inputProps={{ step: 'any' }}
                      sx={{ width: 120 }}
                    />
                  </Stack>
                )}
              </Stack>
            </Box>
            <Graph
              filesToBePlotted={files.filter((file) => file.plotted)}
              experimentNumber={props.experimentNumber}
              instrument={props.instrument}
            />
          </Box>
        </Grid2>
      )}
    </>
  );
};

export default PlotController;
