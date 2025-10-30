import { Box, Checkbox, FormControlLabel, Stack, Switch, TextField, Typography, useTheme } from '@mui/material';
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
  const [slicesSelected, setSlicesSelected] = React.useState<string>('');
  const [visualMapMin, setVisualMapMin] = React.useState<string>('');
  const [visualMapMax, setVisualMapMax] = React.useState<string>('');

  useEffect(() => {
    setSelected(props.selected);
  }, [props.selected]);

  useEffect(() => {
    if (selected) {
      props.updateSelected({
        fileName: props.name,
        plotted: selected,
        plotAsHeatmap: heatmap,
        slices: !heatmap ? computeSlices(slicesSelected) : [],
        meta: props.meta,
        visualMapMin: heatmap && visualMapMin.trim() !== '' ? Number(visualMapMin) : undefined,
        visualMapMax: heatmap && visualMapMax.trim() !== '' ? Number(visualMapMax) : undefined,
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
  }, [selected, heatmap, slicesSelected, visualMapMin, visualMapMax]);

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
        {props.meta.shape > 1 && (
          <Stack direction={'row'} alignItems={'baseline'} spacing={2}>
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
            {heatmap && (
              <Stack direction={'row'} spacing={2} alignItems={'baseline'}>
                <TextField
                  type="number"
                  label="vMap Min"
                  variant="standard"
                  value={visualMapMin}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVisualMapMin(e.target.value)}
                  inputProps={{ step: 'any' }}
                  sx={{ width: 100 }}
                />
                <TextField
                  type="number"
                  label="vMap Max"
                  variant="standard"
                  value={visualMapMax}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVisualMapMax(e.target.value)}
                  inputProps={{ step: 'any' }}
                  sx={{ width: 100 }}
                />
              </Stack>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
