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

  // Sort data by domain size (largest first) to ensure the file with the biggest domain is primary
  // This prevents crashes when auxiliary data has a larger domain than primary
  const sortedData = [...linePlotData].sort((a, b) => b.data.length - a.data.length);

  // Render line plots - largest domain as primary, rest as auxiliaries
  const primaryData = sortedData[0];

  const primaryArray = ndarray(primaryData.data, [primaryData.data.length]);

  // Generate abscissas (x-values) for primary data based on its length
  const primaryAbscissas = Float32Array.from({ length: primaryData.data.length }, (_, i) => i);

  // Create error array if available and showErrors is true
  const primaryErrorsArray =
    showErrors && primaryData.errors ? ndarray(primaryData.errors, [primaryData.errors.length]) : undefined;

  // Create auxiliaries for additional lines with error bars
  // Pad auxiliary arrays with NaN to match primary length (NaN values won't render)
  const primaryLength = primaryData.data.length;
  const auxiliaries = sortedData.slice(1).map((data) => {
    // Pad data array with NaN if shorter than primary
    const paddedData = new Float32Array(primaryLength);
    paddedData.set(data.data);
    if (data.data.length < primaryLength) {
      paddedData.fill(NaN, data.data.length);
    }

    // Pad errors array with NaN if available and shorter than primary
    let paddedErrors: Float32Array | undefined;
    if (showErrors && data.errors) {
      paddedErrors = new Float32Array(primaryLength);
      paddedErrors.set(data.errors);
      if (data.errors.length < primaryLength) {
        paddedErrors.fill(NaN, data.errors.length);
      }
    }

    return {
      array: ndarray(paddedData, [primaryLength]),
      label: data.filename,
      color: data.color,
      errors: paddedErrors ? ndarray(paddedErrors, [primaryLength]) : undefined,
    };
  });

  // Calculate combined Y domain across all data to ensure proper graph sizing
  // Start with primary data domain
  let combinedDomain = getDomain(primaryArray, yScaleType, primaryErrorsArray);

  // Extend domain to include all auxiliaries
  for (const aux of auxiliaries) {
    const auxDomain = getDomain(aux.array, yScaleType, aux.errors);
    if (auxDomain && combinedDomain) {
      combinedDomain = [
        Math.min(combinedDomain[0], auxDomain[0]),
        Math.max(combinedDomain[1], auxDomain[1]),
      ];
    }
  }

  const domain = combinedDomain;

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
        errorsArray={primaryErrorsArray}
        showErrors={showErrors}
        auxiliaries={auxiliaries.length > 0 ? auxiliaries : undefined}
        showGrid={lineShowGrid}
        scaleType={yScaleType}
        abscissaParams={{ scaleType: xScaleType, value: primaryAbscissas }}
      />
    </Box>
  );
};

export default PlotViewer;
