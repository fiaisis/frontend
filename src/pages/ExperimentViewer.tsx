import { Box, Grid2, Typography, useTheme } from '@mui/material';
import React, { useEffect } from 'react';
import { fiaApi } from '../lib/api';
import { TreeViewBaseItem } from '@mui/x-tree-view';
import { FileMenuTree } from '../components/FileMenuTree';
import PlotController from '../components/experimentviewer/PlotController';
import { useParams } from 'react-router-dom';
import { Job } from '../lib/types';

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
  const { jobId } = useParams<{ jobId: string }>();
  const { instrumentName } = useParams<{ instrumentName: string }>();
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
    const formatedData: { fileName: string; outputs: string[] }[] = [];

    // Parse output files to JSON
    data.forEach((job) => {
      let parsedOutputs;
      // Sometimes "outputs" can be null, so we have to check for it
      if (typeof job.outputs == 'string') {
        // Some "outputs" can be a string or a list of strings, this is a check for it
        if (job.outputs.startsWith('[') && job.outputs.endsWith(']')) {
          parsedOutputs = JSON.parse(job.outputs.replace(/'/g, '"'));
        } else {
          parsedOutputs = [job.outputs];
        }
        formatedData.push({ fileName: job.run.filename, outputs: parsedOutputs });
      }
    });

    console.log(formatedData);
    // Collapse duplicate fileName entries and combine their outputs
    const collapsedResults: { fileName: string; outputs: string[] }[] = [];

    formatedData.forEach((item) => {
      const existingItem = collapsedResults.find((result) => result.fileName === item.fileName);

      if (existingItem) {
        // If fileName already exists, combine the outputs, dedupe outputs by using a Set
        existingItem.outputs = [...new Set([...existingItem.outputs, ...item.outputs])];
      } else {
        // If fileName is new, add it to the results
        collapsedResults.push({ fileName: item.fileName, outputs: [...item.outputs] });
      }
    });

    const richTreeData: TreeViewBaseItem<RunsTreeItem>[] = [];
    const filteredResults = collapsedResults.map((item) => ({
      ...item,
      outputs: item.outputs.filter((output) => !output.endsWith('.txt')),
    }));
    filteredResults.forEach((item) => {
      richTreeData.push({
        id: item.fileName + ' ' + item.outputs.toString(),
        label: item.fileName,
        parent: true,
        children: item.outputs.map((output, index) => ({ id: output, label: output, parent: false })),
      });
    });
    return richTreeData;
  };

  useEffect(() => {
    (async () => {
      setRuns(await fetchRuns(jobId));
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
        {files.length > 0 && (
          <PlotController shortListedFiles={files} experimentNumber={jobId} instrument={instrumentName} />
        )}
      </Grid2>
    </Box>
  );
};

export default ExperimentViewer;
