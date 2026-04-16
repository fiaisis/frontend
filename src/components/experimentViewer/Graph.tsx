import React, { useMemo, useState } from 'react';
import ndarray from 'ndarray';
import {
  CurveType,
  DomainWidget,
  getDomain,
  Interpolation,
  LineVis,
  Menu,
  RadioGroup,
  ScaleSelector,
  ScaleType,
  Separator,
  ToggleBtn,
  Toolbar,
  useSafeDomain,
} from '@h5web/lib';
import type { AxisScaleType, CustomDomain, Domain } from '@h5web/lib';
import type { LinePlotData } from '../../lib/types';
import { Box, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const DEFAULT_DOMAIN: Domain = [0.1, 1];
const AXIS_SCALE_OPTIONS: AxisScaleType[] = [ScaleType.Linear, ScaleType.Log, ScaleType.SymLog];

const CURVE_TYPE_LABELS: Record<CurveType, string> = {
  [CurveType.LineOnly]: 'Line',
  [CurveType.GlyphsOnly]: 'Glyphs',
  [CurveType.LineAndGlyphs]: 'Line + Glyphs',
};

const INTERPOLATION_LABELS: Record<Interpolation, string> = {
  [Interpolation.Linear]: 'Linear',
  [Interpolation.Constant]: 'Constant',
};

interface PlotViewerProps {
  linePlotData: LinePlotData[];
  showErrors: boolean;
  onShowErrorsChange: (showErrors: boolean) => void;
}

const PlotViewer: React.FC<PlotViewerProps> = ({ linePlotData, showErrors, onShowErrorsChange }): JSX.Element => {
  const theme = useTheme();
  const hasData = linePlotData.length > 0;

  // State for line plot controls
  const [lineShowGrid, setLineShowGrid] = useState(true);
  const [xScaleType, setXScaleType] = useState<AxisScaleType>(ScaleType.Linear);
  const [yScaleType, setYScaleType] = useState<AxisScaleType>(ScaleType.Linear);
  const [customYDomain, setCustomYDomain] = useState<CustomDomain>([null, null]);
  const [curveType, setCurveType] = useState<CurveType>(CurveType.LineOnly);
  const [interpolation, setInterpolation] = useState<Interpolation>(Interpolation.Linear);

  // Sort data by domain size (largest first) to ensure the file with the biggest domain is primary
  // This prevents crashes when auxiliary data has a larger domain than primary
  const sortedData = hasData ? [...linePlotData].sort((a, b) => b.data.length - a.data.length) : [];

  // Render line plots - largest domain as primary, rest as auxiliaries
  const primaryData = sortedData[0];
  const primaryLength = primaryData?.data.length ?? DEFAULT_DOMAIN.length;
  const primaryArray = ndarray(primaryData?.data ?? DEFAULT_DOMAIN, [primaryLength]);

  // Create error array if available and showErrors is true
  const primaryErrorsArray =
    showErrors && primaryData?.errors ? ndarray(primaryData.errors, [primaryData.errors.length]) : undefined;

  // Create auxiliaries for additional lines with error bars
  // Pad auxiliary arrays with NaN to match primary length (NaN values won't render)
  const auxiliaries = primaryData
    ? sortedData.slice(1).map((data) => {
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
      })
    : [];

  // Calculate combined Y domain across all data to ensure proper graph sizing
  // Start with primary data domain
  let combinedDomain = primaryData ? getDomain(primaryArray, yScaleType, primaryErrorsArray) : DEFAULT_DOMAIN;

  // Extend domain to include all auxiliaries
  for (const aux of auxiliaries) {
    const auxDomain = getDomain(aux.array, yScaleType, aux.errors);
    if (auxDomain && combinedDomain) {
      combinedDomain = [Math.min(combinedDomain[0], auxDomain[0]), Math.max(combinedDomain[1], auxDomain[1])];
    }
  }

  const autoDomain = combinedDomain || DEFAULT_DOMAIN;
  const effectiveYDomain = useMemo<Domain>(
    () => [customYDomain[0] ?? autoDomain[0], customYDomain[1] ?? autoDomain[1]],
    [autoDomain, customYDomain]
  );
  const [safeYDomain] = useSafeDomain(effectiveYDomain, autoDomain, yScaleType);

  // Handle empty state
  if (!primaryData) {
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

  const h5WebThemeTokens = {
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    '--h5w-btn-hover--bgColor': theme.palette.action.hover,
    '--h5w-btn-hover--shadowColor': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.28 : 0.16),
    '--h5w-btnRaised--bgColor': theme.palette.background.default,
    '--h5w-btnRaised--shadowColor': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.3 : 0.18),
    '--h5w-btnRaised-hover--shadowColor': alpha(
      theme.palette.text.primary,
      theme.palette.mode === 'dark' ? 0.42 : 0.24
    ),
    '--h5w-btnPressed--bgColor': alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.18),
    '--h5w-btnPressed--shadowColor': alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.5 : 0.32),
    '--h5w-btnPressed-hover--shadowColor': alpha(
      theme.palette.primary.main,
      theme.palette.mode === 'dark' ? 0.62 : 0.4
    ),
    '--h5w-toolbar--bgColor': theme.palette.background.paper,
    '--h5w-toolbar-label--color': theme.palette.text.secondary,
    '--h5w-toolbar-separator--color': alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.2 : 0.14),
    '--h5w-toolbar-popup--bgColor': theme.palette.background.paper,
    '--h5w-toolbar-input-focus--shadowColor': theme.palette.primary.main,
    '--h5w-selector-arrowIcon--color': theme.palette.text.secondary,
    '--h5w-selector-label--color': theme.palette.text.secondary,
    '--h5w-selector-groupLabel--color': theme.palette.text.secondary,
    '--h5w-selector-menu--bgColor': theme.palette.background.paper,
    '--h5w-selector-option-hover--bgColor': theme.palette.action.hover,
    '--h5w-selector-option-selected--bgColor': alpha(
      theme.palette.primary.main,
      theme.palette.mode === 'dark' ? 0.3 : 0.16
    ),
    '--h5w-selector-option-focus--outlineColor': theme.palette.primary.main,
    '--h5w-domainWidget-popup--bgColor': theme.palette.background.paper,
    '--h5w-domainControls--colorAlt': theme.palette.text.primary,
    '--h5w-domainControls-boundInput--shadowColor': alpha(
      theme.palette.text.primary,
      theme.palette.mode === 'dark' ? 0.3 : 0.16
    ),
    '--h5w-domainControls-boundInput-focus--shadowColor': theme.palette.primary.main,
    '--h5w-domainControls-boundInput-editing--bgColor': theme.palette.background.default,
    '--h5w-domainControls-boundInput-editing--borderColor': theme.palette.primary.main,
    '--h5w-error--color': theme.palette.error.main,
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Paper elevation={1} sx={h5WebThemeTokens}>
        <Box sx={{ display: 'flex' }} className={'toolbar'}>
          <Toolbar>
            <DomainWidget
              dataDomain={autoDomain}
              customDomain={customYDomain}
              scaleType={yScaleType}
              onCustomDomainChange={setCustomYDomain}
            />
            <Separator />
            {/* Y-axis scale selector */}
            <ScaleSelector
              value={yScaleType}
              onScaleChange={setYScaleType}
              options={AXIS_SCALE_OPTIONS}
              label="Y scale"
            />
            <Separator />
            {/* X-axis scale selector */}
            <ScaleSelector
              value={xScaleType}
              onScaleChange={setXScaleType}
              options={AXIS_SCALE_OPTIONS}
              label="X scale"
            />
            <Separator />
            <ToggleBtn label="Grid" value={lineShowGrid} onToggle={() => setLineShowGrid(!lineShowGrid)} />
            <Separator />
            <ToggleBtn label="Error bars" value={showErrors} onToggle={() => onShowErrorsChange(!showErrors)} />
            <Separator />
            <Menu label="Aspect">
              <RadioGroup
                name="curve-type"
                label="Curve type"
                value={curveType}
                options={Object.values(CurveType) as CurveType[]}
                optionsLabels={CURVE_TYPE_LABELS}
                onChange={setCurveType}
              />
              <RadioGroup
                name="interpolation"
                label="Interpolation"
                value={interpolation}
                options={Object.values(Interpolation) as Interpolation[]}
                optionsLabels={INTERPOLATION_LABELS}
                disabled={curveType === CurveType.GlyphsOnly}
                onChange={setInterpolation}
              />
            </Menu>
          </Toolbar>
        </Box>
      </Paper>
      <LineVis
        dataArray={primaryArray}
        domain={safeYDomain}
        errorsArray={primaryErrorsArray}
        showErrors={showErrors}
        auxiliaries={auxiliaries.length > 0 ? auxiliaries : undefined}
        showGrid={lineShowGrid}
        scaleType={yScaleType}
        curveType={curveType}
        interpolation={interpolation}
        abscissaParams={{ label: 'Index', scaleType: xScaleType }}
      />
    </Box>
  );
};

export default PlotViewer;
