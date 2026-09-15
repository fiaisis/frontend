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
import { Box, Paper, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ndarray from 'ndarray';
import React, { useLayoutEffect, useMemo, useReducer, useState } from 'react';
import { MdAutoGraph, MdGridOn } from 'react-icons/md';

import { getViewerPlotSx } from './styles';
import ErrorsIcon from '../../h5web/packages/app/src/vis-packs/core/line/ErrorsIcon';
import { getJobTableChromeColors } from '../jobs/constants';

import type { LinePlotData } from '../../lib/types';
import type { AxisScaleType, CustomDomain, Domain } from '@h5web/lib';

const DEFAULT_DOMAIN: Domain = [0.1, 1];
const AXIS_SCALE_OPTIONS: AxisScaleType[] = [ScaleType.Linear, ScaleType.Log, ScaleType.SymLog];

const CURVE_TYPE_LABELS: Record<CurveType, string> = {
  [CurveType.LineOnly]: 'Line',
  [CurveType.GlyphsOnly]: 'Points',
  [CurveType.LineAndGlyphs]: 'Line + Points',
};

const INTERPOLATION_LABELS: Record<Interpolation, string> = {
  [Interpolation.Linear]: 'Linear',
  [Interpolation.Constant]: 'Constant',
};

interface PlotViewerProps {
  linePlotData: LinePlotData[];
  showErrors: boolean;
  onShowErrorsChange: (showErrors: boolean) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}

const PlotViewer: React.FC<PlotViewerProps> = ({
  linePlotData,
  showErrors,
  onShowErrorsChange,
  emptyTitle = 'Select a file to view 1D data',
  emptyMessage = 'Choose a file from the File tree to plot its available 1D datasets.',
}): JSX.Element => {
  const theme = useTheme();
  const viewerChrome = getJobTableChromeColors(theme.palette.mode);
  const hasData = linePlotData.length > 0;
  const [, refreshPlotColors] = useReducer((version: number) => version + 1, 0);

  // H5Web reads computed CSS colors during render, before theme styles commit.
  // Read them again after the DOM updates without remounting the plot and losing zoom.
  useLayoutEffect(() => {
    refreshPlotColors();
  }, [theme]);

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

  return (
    <Box
      sx={{
        ...getViewerPlotSx(theme),
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Paper
        elevation={0}
        sx={{ borderRadius: 0, flexShrink: 0, backgroundColor: viewerChrome.header, color: viewerChrome.text }}
      >
        <Box
          component="fieldset"
          disabled={!hasData}
          {...(!hasData ? { inert: '' } : {})}
          aria-label="1D plot controls"
          sx={{ display: 'flex', border: 0, p: 0, m: 0, minWidth: 0 }}
          className="toolbar"
        >
          <Toolbar>
            <DomainWidget
              dataDomain={autoDomain}
              customDomain={customYDomain}
              scaleType={yScaleType}
              disabled={!hasData}
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
            <ToggleBtn
              label="Grid"
              Icon={MdGridOn}
              value={lineShowGrid}
              onToggle={() => setLineShowGrid(!lineShowGrid)}
            />
            <Separator />
            <ToggleBtn
              label="Error bars"
              Icon={ErrorsIcon}
              value={showErrors}
              onToggle={() => onShowErrorsChange(!showErrors)}
            />
            <Separator />
            <Menu label="Aspect" Icon={MdAutoGraph}>
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
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {primaryData ? (
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
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {emptyTitle}
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(viewerChrome.text, 0.75) }}>
                {emptyMessage}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PlotViewer;
