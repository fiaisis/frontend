import React, { Suspense, useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Divider,
} from '@mui/material';
import {
  useDataContext,
  useDatasetValue,
  useToNumArray,
  useMappedArray,
  isDataset,
  assertArrayShape,
  assertNumericLikeType,
} from '@h5web/app';
import {
  HeatmapVis,
  ScaleType,
  DimensionMapper,
  useSlicedDimsAndMapping,
  useDomain,
  useVisDomain,
  useSafeDomain,
  INTERPOLATORS,
  ColorMap,
  getSliceSelection,
  ColorBar,
} from '@h5web/lib';
import { DiscoveredDataset, fetchData1D } from '../../lib/plottingServiceAPI';
import type { DimensionMapping } from '@h5web/shared/vis-models';

interface MDViewerInnerProps {
  filepath: string;
  datasets: DiscoveredDataset[];
  initialDataset?: DiscoveredDataset;
}

const DEFAULT_COLOR_MAP: ColorMap = 'Viridis';

const MDViewerInner: React.FC<MDViewerInnerProps> = ({ filepath, datasets, initialDataset }) => {
  const [selectedPath, setSelectedPath] = useState<string>(initialDataset?.path || (datasets.length > 0 ? datasets[0].path : ''));
  const [dimMapping, setDimMapping] = useState<DimensionMapping>([]);
  
  // Coordinate values state: Maps dimension index -> array of physical values
  const [axesValues, setAxesValues] = useState<Record<number, number[]>>({});

  // Intensity Controls state
  const [colorMap, setColorMap] = useState<ColorMap>(DEFAULT_COLOR_MAP);
  const [invertColorMap, setInvertColorMap] = useState<boolean>(false);
  const [scaleType, setScaleType] = useState<ScaleType>(ScaleType.Linear);
  const [customMin, setCustomMin] = useState<string>('');
  const [customMax, setCustomMax] = useState<string>('');

  const { entitiesStore } = useDataContext();
  
  const selectedDatasetInfo = useMemo(() => datasets.find(d => d.path === selectedPath), [datasets, selectedPath]);

  // Read dataset from h5web context
  const entity = selectedPath ? entitiesStore.get(selectedPath) : undefined;

  // If there's no dataset selected (e.g. file is empty or only 1D), return early
  if (!selectedPath) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">No valid datasets available</Typography>
        <Typography variant="body2" color="text.secondary">This file might not contain any multi-dimensional datasets supported by this viewer.</Typography>
      </Box>
    );
  }

  // Initialize dimension mapping when dataset changes
  useEffect(() => {
    if (isDataset(entity) && entity.shape && entity.shape.length >= 2) {
      const dims = entity.shape as number[];
      const n = dims.length;
      // Map last dimension to x, second-to-last to y, rest to slice 0
      const newMapping: DimensionMapping = Array(n).fill(0);
      newMapping[n - 1] = 'x';
      newMapping[n - 2] = 'y';
      setDimMapping(newMapping);
    }
  }, [entity]);

  // Attempt to find coordinate datasets for the sliced dimensions
  useEffect(() => {
    if (!selectedDatasetInfo || !selectedDatasetInfo.shape) return;

    const fetchAxes = async () => {
      const newAxesValues: Record<number, number[]> = {};
      const dims = selectedDatasetInfo.shape;

      for (let i = 0; i < dims.length; i++) {
        const dimSize = dims[i];
        // Find a 1D dataset of the same size that might be an axis
        const candidate = datasets.find(d => d.is1D && d.shape[0] === dimSize && d.path !== selectedPath && !d.path.includes('error'));
        
        if (candidate) {
          try {
            const data = await fetchData1D(filepath, candidate.path);
            newAxesValues[i] = data;
          } catch (e) {
            console.error(`Failed to fetch axis data for dimension ${i} from ${candidate.path}`, e);
          }
        }
      }
      setAxesValues(newAxesValues);
    };

    fetchAxes();
  }, [filepath, selectedDatasetInfo, datasets, selectedPath]);

  if (!isDataset(entity)) {
    return <Typography sx={{ p: 2 }}>Loading dataset information...</Typography>;
  }

  try {
    assertArrayShape(entity);
    assertNumericLikeType(entity);
  } catch (e) {
    return <Typography sx={{ p: 2 }} color="error">Unsupported dataset type or shape.</Typography>;
  }

  const dims = entity.shape as number[];

  // Render Slicer using the modified SlicingSlider and DimensionMapper!
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden' }}>
      
      {/* LEFT: Vis Area */}
      <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <style>
          {`
            .hide-default-colorbar [class*="colorBar"] {
              display: none !important;
            }
          `}
        </style>
        
        <Suspense fallback={<Typography>Loading slice...</Typography>}>
          {dims.length >= 2 && dimMapping.length === dims.length ? (
            <SliceRenderer
              dataset={entity}
              dims={dims}
              dimMapping={dimMapping}
              colorMap={colorMap}
              invertColorMap={invertColorMap}
              scaleType={scaleType}
              customMin={customMin}
              customMax={customMax}
              onDomainChange={(domain: any) => {
                setCustomMin(domain[0].toString());
                setCustomMax(domain[1].toString());
              }}
            />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">
                {dims.length < 2 ? '1D and Scalar datasets are not supported by the N-D viewer.' : 'Initializing dimensions...'}
              </Typography>
            </Box>
          )}
        </Suspense>
      </Box>

      {/* RIGHT: Control Panel */}
      <Paper sx={{ width: 320, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRadius: 0, borderLeft: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Dataset Configuration</Typography>
          
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Active Dataset</InputLabel>
            <Select value={selectedPath} label="Active Dataset" onChange={(e) => setSelectedPath(e.target.value as string)}>
              {datasets.map(ds => (
                <MenuItem key={ds.path} value={ds.path}>
                  {ds.path.split('/').pop()} {ds.isPrimary && '(Primary)'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Dimension Mapping</Typography>
          
          {dims.length >= 2 && dimMapping.length === dims.length ? (
             <Box sx={{ bgcolor: 'background.default', p: 1, borderRadius: 1, border: 1, borderColor: 'divider' }}>
               <DimensionMapper
                 dims={dims}
                 dimMapping={dimMapping}
                 axisValues={dimMapping.map((val, idx) => {
                   if (typeof val === 'number' && axesValues[idx]) {
                     return axesValues[idx][val];
                   }
                   return undefined;
                 })}
                 onChange={setDimMapping}
               />
             </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {dims.length < 2 ? '1D Datasets are not supported by this 2D/N-D viewer.' : 'Initializing...'}
            </Typography>
          )}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>Intensity Controls</Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                label="Min"
                size="small"
                fullWidth
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                placeholder="Auto"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Max"
                size="small"
                fullWidth
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                placeholder="Auto"
              />
            </Grid>
          </Grid>
          <Button 
            variant="outlined" 
            fullWidth 
            size="small" 
            sx={{ mb: 2 }}
            onClick={() => {
              setCustomMin('');
              setCustomMax('');
            }}
          >
            Auto Scale
          </Button>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Color Map</InputLabel>
            <Select value={colorMap} label="Color Map" onChange={(e) => setColorMap(e.target.value as ColorMap)}>
              {Object.keys(INTERPOLATORS).map(cmap => (
                <MenuItem key={cmap} value={cmap}>{cmap}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={<Checkbox checked={invertColorMap} onChange={(e) => setInvertColorMap(e.target.checked)} size="small" />}
            label={<Typography variant="body2">Invert Color Map</Typography>}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth size="small">
            <InputLabel>Scale Type</InputLabel>
            <Select value={scaleType} label="Scale Type" onChange={(e) => setScaleType(e.target.value as ScaleType)}>
              <MenuItem value={ScaleType.Linear}>Linear</MenuItem>
              <MenuItem value={ScaleType.Log}>Logarithmic</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>
    </Box>
  );
};

// Extracted inner component to use Suspense correctly for data fetching
function SliceRenderer({
  dataset,
  dims,
  dimMapping,
  colorMap,
  invertColorMap,
  scaleType,
  customMin,
  customMax,
  onDomainChange,
}: any) {
  const selection = getSliceSelection(dimMapping);
  
  // This will suspend while fetching the data
  const value = useDatasetValue(dataset, selection);
  
  const numArray = useToNumArray(value);
  const mappingArgs = useSlicedDimsAndMapping(dims, dimMapping);
  const dataArray = useMappedArray(numArray, ...mappingArgs);

  const parsedMin = customMin !== '' ? parseFloat(customMin) : undefined;
  const parsedMax = customMax !== '' ? parseFloat(customMax) : undefined;
  
  const customDomain: [number | undefined, number | undefined] = [
    !isNaN(parsedMin as number) ? parsedMin : undefined,
    !isNaN(parsedMax as number) ? parsedMax : undefined,
  ];

  const dataDomain = useDomain(dataArray, scaleType);
  const visDomain = useVisDomain(customDomain, dataDomain || [0, 1]);
  const [safeDomain] = useSafeDomain(visDomain, dataDomain || [0, 1], scaleType);

  return (
    <Box sx={{ flex: 1, width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'row' }}>
      <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
        <HeatmapVis
          className="hide-default-colorbar"
          dataArray={dataArray}
          domain={safeDomain}
          colorMap={colorMap}
          invertColorMap={invertColorMap}
          scaleType={scaleType}
          title={dataset.name}
        />
      </Box>
      <Box sx={{ width: '80px', ml: 2, display: 'flex', flexDirection: 'column' }}>
        <ColorBar
          domain={safeDomain}
          scaleType={scaleType}
          colorMap={colorMap}
          invertColorMap={invertColorMap}
          withBounds={true}
          onBoundChange={onDomainChange}
        />
      </Box>
    </Box>
  );
}

export default MDViewerInner;
