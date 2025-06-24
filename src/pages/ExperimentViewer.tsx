import { Box, Grid2, Typography, useTheme } from '@mui/material';
import React, { useEffect } from 'react';
import { fiaApi } from '../lib/api';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { FileMenuTree } from '../components/FileMenuTree';
import { SelectedFile } from '../components/experimentviewer/SelectedFile';
import ReactECharts from 'echarts-for-react';
import { plottingApi } from '../lib/plotting-api';
import { EChartsOption, SeriesOption } from 'echarts';

interface Job {
  outputs: string;
  run: {
    filename: string;
  };
}

export type file = {
  name: string;
  heatMap: boolean;
  slices: number[];
};

type heatmap = {
  name: string;
};

export type RunsTreeItem = {
  parent: boolean;
  label: string;
  id: string;
};

const ExperimentViewer = (): React.ReactElement => {
  const [runs, setRuns] = React.useState<TreeViewBaseItem<RunsTreeItem>[]>([]);
  const [files, setFiles] = React.useState<string[]>([]);
  const [activeFiles, setActiveFiles] = React.useState<file[]>([]);
  const [options, setOptions] = React.useState<EChartsOption>();
  const [activeHeatmap, setActiveHeatmap] = React.useState<heatmap>();
  const theme = useTheme();
  const fetchRuns = async (RB: string): Promise<TreeViewBaseItem<RunsTreeItem>[]> => {
    const data: Job[] = await fiaApi
      .get('/jobs', {
        params: {
          filters: `{"experiment_number_in":[${RB}], "job_state_in": ["SUCCESSFUL"]}`,
          include_run: 'true',
        },
      })
      .then((res) => res.data);
    const something: { fileName: string; outputs: string[] }[] = [];

    data.forEach((job) => {
      something.push({ fileName: job.run.filename, outputs: JSON.parse(job.outputs.replace(/'/g, '"')) });
    });

    // Collapse duplicate fileName entries and combine their outputs
    const collapsedResults: { fileName: string; outputs: string[] }[] = [];

    something.forEach((item) => {
      const existingItem = collapsedResults.find((result) => result.fileName === item.fileName);

      if (existingItem) {
        // If fileName already exists, combine the outputs
        existingItem.outputs = [...existingItem.outputs, ...item.outputs];
      } else {
        // If fileName is new, add it to the results
        collapsedResults.push({ fileName: item.fileName, outputs: [...item.outputs] });
      }
    });

    const richTreeData: TreeViewBaseItem<RunsTreeItem>[] = [];

    collapsedResults.forEach((item) => {
      richTreeData.push({
        id: item.fileName + ' ' + item.outputs.toString(),
        label: item.fileName,
        parent: true,
        children: item.outputs.map((output, index) => ({ id: output + index, label: output, parent: false })),
      });
    });

    return richTreeData;
  };

  const fetchData = async (filename: string, slice: number): Promise<number[]> => {
    return await plottingApi
      .get('data', {
        params: {
          file: filename,
          path: '/mantid_workspace_1/workspace/values',
          selection: slice,
        },
      })
      .then((res) => res.data);
  };

  const fetchAxis = async (filename: string): Promise<number[]> => {
    return await plottingApi
      .get('data', {
        params: {
          file: filename,
          path: '/mantid_workspace_1/workspace/axis1',
        },
      })
      .then((res) => res.data);
  };

  const fetchHeatmapData = async (filename: string): Promise<[][]> => {
    const data = await plottingApi
      .get('processed_data', {
        params: {
          filename: filename,
          path: '/mantid_workspace_1/workspace/values',
        },
      })
      .then((res) => res.data);
    console.log('data from server', data);
    return data;
  };

  useEffect(() => {
    (async () => {
      setRuns(await fetchRuns('2420251'));
    })();
  }, []);

  useEffect(() => {
    if (activeFiles.length > 0) {
      (async () => {
        const data: number[][] = [];
        const fetchPromises = activeFiles.flatMap((file) => {
          if (file.slices.length > 0) {
            return file.slices.map(async (slice) => {
              const result = await fetchData(file.name.slice(0, -1), slice);
              data.push(result);
              return result;
            });
          } else {
            return [
              (async () => {
                const result = await fetchData(file.name.slice(0, -1), 0);
                data.push(result);
                return result;
              })(),
            ];
          }
        });

        // Wait for all fetch operations to complete
        await Promise.all(fetchPromises);

        const axis = await fetchAxis('OSIRIS151097,151096,151095_graphite_002_Reduced-individual.nxs');
        setOptions(computeOptions1DOptions(data, axis));
      })();
      return;
    } else {
      console.log('options removed');
      setOptions(undefined);
    }
    if (activeHeatmap) {
      (async () => {
        await fetchHeatmapData(activeHeatmap.name.slice(0, -1)).then((data) => {
          setOptions(computeOptions2DOptions(data));
        });
      })();
    }
  }, [activeFiles, activeHeatmap]);

  const setSelectedItem = (item: string): void => {
    if (files.includes(item)) {
      // If item exists, remove it
      setFiles(files.filter((file) => file !== item));
    } else {
      // If item doesn't exist, add it
      setFiles([...files, item]);
    }
  };

  const selectItemForPlotting = (file: file): void => {
    if (file.heatMap) {
      setActiveFiles([]);
      if (activeHeatmap?.name === file.name) {
        setActiveHeatmap(undefined);
        return;
      }
      setActiveHeatmap({ name: file.name });
      return;
    }
    if (activeFiles.includes(file)) {
      setActiveFiles(activeFiles.filter((file) => file !== file));
    } else {
      console.log('setting file');
      setActiveFiles([...activeFiles, file]);
    }
  };

  const computeOptions1DOptions = (data: number[][], axis: number[]): EChartsOption => {
    console.log(data);
    const seriesUnpacked: SeriesOption[] = data.map((item, index) => ({
      name: index.toString(),
      type: 'line',
      data: item,
    }));
    return {
      xAxis: {
        type: 'category',
        data: axis,
      },
      yAxis: {},
      tooltip: {
        trigger: 'item',
      },
      series: seriesUnpacked,
    };
  };

  const computeOptions2DOptions = (data: number[][]): EChartsOption => {
    return {
      grid: { top: 8, right: 8, bottom: 24, left: 36 },
      xAxis: {
        type: 'category',
      },
      yAxis: {
        type: 'category',
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
      },
      series: [
        {
          type: 'heatmap',
          data: data,
        },
      ],
      tooltip: {
        trigger: 'item',
      },
    };
  };

  return (
    <Box>
      <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary, padding: '20px' }}>
        Experiment Viewer
      </Typography>
      <Grid2 container spacing={6}>
        <Grid2 size={2}>
          <FileMenuTree items={runs} setSelectedItem={setSelectedItem} />
        </Grid2>
        {files.length > 0 && (
          <>
            <Grid2 size={4}>
              <Box
                sx={{
                  padding: '12px 16px',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '4px',
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                {files.map((file) => (
                  <Box key={file} sx={{ marginBottom: 1, marginLeft: 2, marginRight: 2 }}>
                    <SelectedFile name={file} onSelect={selectItemForPlotting}></SelectedFile>
                  </Box>
                ))}
              </Box>
            </Grid2>
            {options && (
              <Grid2 size={6}>
                <ReactECharts style={{}} option={options} />
              </Grid2>
            )}
          </>
        )}
      </Grid2>
    </Box>
  );
};

export default ExperimentViewer;
