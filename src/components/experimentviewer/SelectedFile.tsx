import { Box, Checkbox, FormControlLabel, Stack, Switch, TextField, Typography, useTheme } from '@mui/material';
import React, { useEffect } from 'react';
import { plottingApi } from '../../lib/plotting-api';
import Grid from '@mui/material/Grid2';
import { file } from '../../pages/ExperimentViewer';

interface SelectedFileProps {
  name: string;
  onSelect: (file: file) => void;
}

interface Meta {
  shape: number[];
}

export const SelectedFile = (props: SelectedFileProps): React.ReactElement => {
  const theme = useTheme();
  const [heatmap, setHeatmap] = React.useState<boolean>(false);
  const [slicesSelected, setSlicesSelected] = React.useState<string>('');
  const [meta, setMeta] = React.useState<Meta>({ shape: [] });

  useEffect(() => {
    (async () => {
      plottingApi
        .get('/meta/', {
          params: {
            file: `/${props.name.slice(0, -1)}`,
            path: `/mantid_workspace_1/workspace/values`,
          },
        })
        .then((res) => setMeta(res.data));
    })();
  }, []);

  const onCheckBoxChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const slicesArray = slicesSelected.split(',').map((s) => parseInt(s));
    if (isNaN(slicesArray[0])) {
      slicesArray.pop();
    }
    props.onSelect({ name: props.name, heatMap: heatmap, slices: slicesArray });
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
          <Grid size={1}>
            <Checkbox onChange={onCheckBoxChange} />
          </Grid>
          <Grid size={11}>
            <Typography
              variant="h6"
              component="h1"
              style={{
                fontSize: '1.2rem',
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
        {meta.shape[0] > 1 && (
          <Stack direction={'row'} alignItems={'baseline'}>
            <FormControlLabel control={<Switch checked={heatmap} onChange={switchHeatmap} />} label={'Heatmap'} />
            <TextField
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setSlicesSelected(event.target.value);
              }}
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
