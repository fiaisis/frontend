import { Box, Grid2, Typography, useTheme } from '@mui/material';
import React, { useEffect } from 'react';
import { fiaApi } from '../lib/api';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { FileMenuTree } from '../components/FileMenuTree';
import PlotController from '../components/experimentviewer/PlotController';

interface Job {
  outputs: string;
  run: {
    filename: string;
  };
}

type file = {
  name: string;
  heatMap: boolean;
  slices: number[];
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

  //
  // const fetchAxis = async (filename: string): Promise<number[]> => {
  //   return await plottingApi
  //     .get('data', {
  //       params: {
  //         file: filename,
  //         path: '/mantid_workspace_1/workspace/axis1',
  //       },
  //     })
  //     .then((res) => res.data);
  // };
  //

  useEffect(() => {
    (async () => {
      setRuns(await fetchRuns('2420251'));
    })();
  }, []);

  const setSelectedItem = (item: string): void => {
    if (files.includes(item)) {
      // If item exists, remove it
      setFiles(files.filter((file) => file !== item));
      setActiveFiles(activeFiles.filter((file) => file.name !== item));
    } else {
      // If item doesn't exist, add it
      setFiles([...files, item]);
    }
  };

  return (
    <Box>
      <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary, padding: '20px' }}>
        Experiment Viewer
      </Typography>
      <Grid2 container spacing={2}>
        <Grid2 size={2}>
          <FileMenuTree items={runs} setSelectedItem={setSelectedItem} />
        </Grid2>
        {files.length > 0 && <PlotController shortListedFiles={files} />}
      </Grid2>
    </Box>
  );
};

export default ExperimentViewer;
