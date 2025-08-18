import { Box, Checkbox, FormControlLabel, Stack, Switch, TextField, Typography, useTheme } from '@mui/material';
import React, { useEffect } from 'react';
import { plottingApi } from '../../lib/plotting-api';
import Grid from '@mui/material/Grid2';
import { FileToPlot } from './PlotController';

interface SelectedFileProps {
  name: string;
  selected: boolean;
  heatmap: boolean;
  instrument: string;
  experimentNumber: string;
  updateSelected: (selectedFile: FileToPlot) => void;
}

interface Meta {
  shape: number;
}

export const SelectedFile = (props: SelectedFileProps): React.ReactElement => {
  const theme = useTheme();
  const [heatmap, setHeatmap] = React.useState<boolean>(props.heatmap);
  const [selected, setSelected] = React.useState<boolean>(props.selected);
  const [slicesSelected, setSlicesSelected] = React.useState<string>('');
  const [meta, setMeta] = React.useState<Meta>();

  useEffect(() => {
    (async () => {
      plottingApi
        .get(`/echarts_meta/${props.instrument}/${props.experimentNumber}`, {
          params: {
            filename: `/${props.name}`,
          },
        })
        .then((res) => setMeta(res.data));
    })();
  }, [props.name]);

  useEffect(() => {
    if (selected && !heatmap) {
      props.updateSelected({
        fileName: props.name,
        plotted: selected,
        heatmap: heatmap,
        slices: computeSlices(slicesSelected),
      });
    } else if (selected) {
      props.updateSelected({
        fileName: props.name,
        plotted: selected,
        heatmap: heatmap,
        slices: [],
      });
    } else {
      setHeatmap(false);
      props.updateSelected({ fileName: props.name, plotted: false, heatmap: false, slices: [] });
    }
  }, [selected, heatmap, slicesSelected]);

  const computeSlices = (sliceStr: string): number[] => {
    const sliceArray = sliceStr.trim() === '' ? [] : sliceStr.split(',').map((s) => parseInt(s.trim()));
    return sliceArray.filter((num) => !isNaN(num));
  };

  const switchHeatmap = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setHeatmap(event.target.checked);
  };

  return (
    <Box>
      <Stack direction={'column'}>
        <Grid
          container
          sx={{
            alignItems: 'center',
          }}
        >
          <Grid size={'auto'}>
            <Checkbox checked={selected} onChange={(event) => setSelected(event.target.checked)} />
          </Grid>
          <Grid size={'grow'}>
            <Typography
              variant="h6"
              component="h1"
              style={{
                fontSize: '1rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {props.name}
            </Typography>
          </Grid>
        </Grid>
        {meta && meta.shape > 1 && (
          <Stack direction={'row'} alignItems={'baseline'}>
            <FormControlLabel control={<Switch checked={heatmap} onChange={switchHeatmap} />} label={'Heatmap'} />
            <TextField
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSlicesSelected(event.target.value);
              }}
              disabled={heatmap}
              value={slicesSelected}
              variant={'standard'}
              label={'Slices'}
            />
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
