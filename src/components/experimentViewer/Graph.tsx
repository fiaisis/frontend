import React, { useState } from 'react';
import ndarray from 'ndarray';
import {
  AXIS_SCALE_TYPES,
  CurveType,
  DomainWidget,
  getCombinedDomain,
  getDomain,
  getSafeDomain,
  getVisDomain,
  Interpolation,
  LineVis,
  Menu,
  RadioGroup,
  ScaleSelector,
  Separator,
  type AxisScaleType,
  type CustomDomain,
  type Domain,
  ScaleType,
  ToggleBtn,
  Toolbar,
} from '@h5web/lib';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import type { LinePlotData } from '../../lib/types';

interface PlotViewerProps {
  linePlotData: LinePlotData[];
  showErrors: boolean;
  onShowErrorsChange: (showErrors: boolean) => void;
}

const DEFAULT_DOMAIN: Domain = [0.1, 1];
const CURVE_TYPE_OPTIONS = Object.values(CurveType) as CurveType[];
const INTERPOLATION_OPTIONS = Object.values(Interpolation) as Interpolation[];

const CURVE_TYPE_LABELS: Record<CurveType, string> = {
  [CurveType.LineOnly]: 'Lines',
  [CurveType.GlyphsOnly]: 'Points',
  [CurveType.LineAndGlyphs]: 'Both',
};

const PlotViewer: React.FC<PlotViewerProps> = ({ linePlotData, showErrors, onShowErrorsChange }): JSX.Element => {
  const theme = useTheme();

  const [showGrid, setShowGrid] = useState(true);
  const [xScaleType, setXScaleType] = useState<AxisScaleType>(ScaleType.Linear);
  const [yScaleType, setYScaleType] = useState<AxisScaleType>(ScaleType.Linear);
  const [curveType, setCurveType] = useState(CurveType.LineOnly);
  const [interpolation, setInterpolation] = useState(Interpolation.Linear);
  const [customDomain, setCustomDomain] = useState<CustomDomain>([null, null]);

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

  // Keep the longest line as primary so auxiliary arrays can be padded safely.
  const sortedData = [...linePlotData].sort((a, b) => b.data.length - a.data.length);
  const primaryData = sortedData[0];
  const primaryLength = primaryData.data.length;

  const primaryArray = ndarray(primaryData.data, [primaryLength]);
  const primaryAbscissas = Float32Array.from({ length: primaryLength }, (_, index) => index);
  const primaryErrorsArray =
    showErrors && primaryData.errors ? ndarray(primaryData.errors, [primaryData.errors.length]) : undefined;

  const auxiliaries = sortedData.slice(1).map((data) => {
    const paddedData = new Float32Array(primaryLength);
    paddedData.set(data.data);
    if (data.data.length < primaryLength) {
      paddedData.fill(NaN, data.data.length);
    }

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
      errors: paddedErrors ? ndarray(paddedErrors, [primaryLength]) : undefined,
    };
  });

  const combinedDomain =
    getCombinedDomain([
      getDomain(primaryArray, yScaleType, primaryErrorsArray),
      ...auxiliaries.map((auxiliary) => getDomain(auxiliary.array, yScaleType, auxiliary.errors)),
    ]) || DEFAULT_DOMAIN;

  const visDomain = getVisDomain(customDomain, combinedDomain);
  const [safeDomain] = getSafeDomain(visDomain, combinedDomain, yScaleType);
  const hasErrorSupport = linePlotData.some((plot) => plot.supportsErrors);
  const toolbarBackground = theme.palette.background.paper;
  const popupBackground =
    theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.background.paper;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Paper
        elevation={1}
        sx={{
          color: theme.palette.text.primary,
          borderBottom: 1,
          borderColor: 'divider',
          '--h5w-btn-hover--bgColor': theme.palette.action.hover,
          '--h5w-toolbar--bgColor': toolbarBackground,
          '--h5w-toolbar-popup--bgColor': popupBackground,
          '--h5w-btnPressed--bgColor': theme.palette.primary.main,
          '--h5w-toolbar-label--color': theme.palette.text.primary,
          '--h5w-toolbar-separator--color': theme.palette.divider,
          '--h5w-selector-label--color': theme.palette.text.primary,
          '--h5w-selector-arrowIcon--color': theme.palette.text.secondary,
          '--h5w-selector-groupLabel--color': theme.palette.text.secondary,
          '--h5w-selector-menu--bgColor': popupBackground,
          '--h5w-selector-option-hover--bgColor': theme.palette.action.hover,
          '--h5w-selector-option-selected--bgColor': theme.palette.action.selected,
          '--h5w-selector-option-focus--outlineColor': theme.palette.primary.main,
          '--h5w-domainWidget-popup--bgColor': popupBackground,
          '--h5w-domainControls--colorAlt': theme.palette.text.primary,
          '--h5w-domainControls-boundInput--shadowColor': theme.palette.divider,
          '--h5w-domainControls-boundInput-focus--shadowColor': theme.palette.primary.main,
          '--h5w-domainControls-boundInput-editing--bgColor': theme.palette.background.paper,
          '--h5w-domainControls-boundInput-editing--borderColor': theme.palette.primary.main,
          '--h5w-toolbar-input--shadowColor': theme.palette.divider,
          '--h5w-toolbar-input-hover--shadowColor': theme.palette.text.secondary,
          '--h5w-toolbar-input-focus--shadowColor': theme.palette.primary.main,
        }}
      >
        <Box sx={{ display: 'flex' }} className="toolbar">
          <Toolbar>
            <DomainWidget
              dataDomain={combinedDomain}
              customDomain={customDomain}
              scaleType={yScaleType}
              onCustomDomainChange={setCustomDomain}
            />
            <Separator />
            <ScaleSelector value={xScaleType} onScaleChange={setXScaleType} options={AXIS_SCALE_TYPES} label="X" />
            <ScaleSelector value={yScaleType} onScaleChange={setYScaleType} options={AXIS_SCALE_TYPES} label="Y" />
            <Separator />
            {hasErrorSupport && (
              <ToggleBtn label="Error Bars" value={showErrors} onToggle={() => onShowErrorsChange(!showErrors)} />
            )}
            <ToggleBtn label="Grid" value={showGrid} onToggle={() => setShowGrid(!showGrid)} />
            <Menu label="Style">
              <RadioGroup
                name="curve-type"
                label="Curve"
                options={CURVE_TYPE_OPTIONS}
                optionsLabels={CURVE_TYPE_LABELS}
                value={curveType}
                onChange={setCurveType}
              />
              <RadioGroup
                name="interpolation"
                label="Interpolation"
                options={INTERPOLATION_OPTIONS}
                disabled={curveType === CurveType.GlyphsOnly}
                value={interpolation}
                onChange={setInterpolation}
              />
            </Menu>
          </Toolbar>
        </Box>
      </Paper>

      <LineVis
        dataArray={primaryArray}
        domain={safeDomain}
        errorsArray={primaryErrorsArray}
        showErrors={showErrors}
        auxiliaries={auxiliaries.length > 0 ? auxiliaries : undefined}
        showGrid={showGrid}
        scaleType={yScaleType}
        curveType={curveType}
        interpolation={interpolation}
        ordinateLabel="Value"
        abscissaParams={{ label: 'Index', scaleType: xScaleType, value: primaryAbscissas }}
      />
    </Box>
  );
};

export default PlotViewer;
