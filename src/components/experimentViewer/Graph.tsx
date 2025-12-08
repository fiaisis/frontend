import React, { useState } from 'react';
import ndarray from 'ndarray';
import { getDomain, LineVis, ScaleType, ScaleSelector, Separator, ToggleBtn, Toolbar } from '@h5web/lib';
import type { LinePlotData } from '../../lib/types';
import { Box, Paper, Typography, useTheme } from '@mui/material';

interface PlotViewerProps {
  linePlotData: LinePlotData[];
  showErrors: boolean;
  onShowErrorsChange: (showErrors: boolean) => void;
}

const PlotViewer: React.FC<PlotViewerProps> = ({ linePlotData, showErrors, onShowErrorsChange }): JSX.Element => {
  const theme = useTheme();

  // State for line plot controls
  const [lineShowGrid, setLineShowGrid] = useState(true);
  const [xScaleType, setXScaleType] = useState<ScaleType.Linear | ScaleType.Log | ScaleType.SymLog>(ScaleType.Linear);
  const [yScaleType, setYScaleType] = useState<ScaleType.Linear | ScaleType.Log | ScaleType.SymLog>(ScaleType.Linear);

  console.log('PlotViewer rendered with data:', linePlotData);

  // Handle empty state
  if (linePlotData.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
            No data selected
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Select files from the left panel to plot
          </Typography>
        </Box>
      </Box>
    );
  }

  // Render line plots - first as primary, rest as auxiliaries
  console.log('Rendering line plots with data:', linePlotData);
  const primaryData = linePlotData[0];
  console.log('Primary data:', primaryData.filename, 'data:', primaryData.data);

  const primaryArray = ndarray(primaryData.data, [primaryData.data.length]);

  // Create error array if available and showErrors is true
  const errorsArray =
    showErrors && primaryData.errors ? ndarray(primaryData.errors, [primaryData.errors.length]) : undefined;

  // Calculate Y domain based on Y scale type
  // getDomain automatically filters out invalid values for log scales:
  // - For Log scale: excludes negative and zero values
  // - For SymLog scale: excludes zero values but allows negative
  // - For Linear scale: includes all values
  const domain = getDomain(primaryArray, yScaleType, errorsArray);
  console.log('Y-axis domain for scale', yScaleType, ':', domain);

  // Create auxiliaries for additional lines with error bars
  const auxiliaries = linePlotData.slice(1).map((data) => ({
    array: ndarray(data.data, [data.data.length]),
    label: data.filename,
    color: data.color,
    errors: showErrors && data.errors ? ndarray(data.errors, [data.errors.length]) : undefined,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Paper
        elevation={1}
        sx={{
          // For more customization please see https://h5web-docs.panosc.eu/?path=/docs/customization--docs
          '--h5w-btn-hover--bgColor': theme.palette.background.default,
          '--h5w-toolbar--bgColor': theme.palette.background.paper,
          '--h5w-btnPressed--bgColor': theme.palette.primary.main,
        }}
      >
        <Box sx={{ display: 'flex' }} className={'toolbar'}>
          <Toolbar>
            {/* Y-axis scale selector */}
            <ScaleSelector
              value={yScaleType}
              onScaleChange={setYScaleType}
              options={[ScaleType.Linear, ScaleType.Log, ScaleType.SymLog]}
              label="Y scale"
            />
            <Separator />
            {/* X-axis scale selector */}
            <ScaleSelector
              value={xScaleType}
              onScaleChange={setXScaleType}
              options={[ScaleType.Linear, ScaleType.Log, ScaleType.SymLog]}
              label="X scale"
            />
            <Separator />
            <ToggleBtn label="Grid" value={lineShowGrid} onToggle={() => setLineShowGrid(!lineShowGrid)} />
            <Separator />
            <ToggleBtn label="Error Bars" value={showErrors} onToggle={() => onShowErrorsChange(!showErrors)} />
          </Toolbar>
        </Box>
      </Paper>
      <LineVis
        dataArray={primaryArray}
        domain={domain}
        errorsArray={errorsArray}
        showErrors={showErrors}
        auxiliaries={auxiliaries.length > 0 ? auxiliaries : undefined}
        showGrid={lineShowGrid}
        scaleType={yScaleType}
        abscissaParams={{ scaleType: xScaleType }}
      />
    </Box>
  );
};

export default PlotViewer;
