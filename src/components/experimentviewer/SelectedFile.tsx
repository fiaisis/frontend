import { Box, Checkbox, FormControlLabel, Stack, Switch, Typography, useTheme } from '@mui/material';
import React, { useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import { FileToPlot, Metadata } from './PlotController';

interface SelectedFileProps {
  name: string;
  selected: boolean;
  heatmap: boolean;
  meta: Metadata;
  instrument: string;
  experimentNumber: string;
  updateSelected: (selectedFile: FileToPlot) => void;
}

export const SelectedFile = (props: SelectedFileProps): React.ReactElement => {
  const theme = useTheme();
  const [heatmap, setHeatmap] = React.useState<boolean>(props.heatmap);
  const [selected, setSelected] = React.useState<boolean>(props.selected);

  useEffect(() => {
    setSelected(props.selected);
  }, [props.selected]);

  useEffect(() => {
    if (selected) {
      props.updateSelected({
        fileName: props.name,
        plotted: selected,
        plotAsHeatmap: heatmap,
        slices: [],
        meta: props.meta,
        visualMapMin: undefined,
        visualMapMax: undefined,
      });
    } else {
      setHeatmap(false);
      props.updateSelected({
        fileName: props.name,
        plotted: false,
        plotAsHeatmap: false,
        slices: [],
        meta: props.meta,
        visualMapMin: undefined,
        visualMapMax: undefined,
      });
    }
  }, [selected, heatmap]);

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
        {props.meta.shape > 1 && (
          <Stack direction={'row'} alignItems={'baseline'} spacing={2}>
            <FormControlLabel control={<Switch checked={heatmap} onChange={switchHeatmap} />} label={'Heatmap'} />
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
