import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Box,
  Typography,
  Grid,
  Button,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
} from '@mui/material';
import { useTheme, Theme } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BuildIcon from '@mui/icons-material/Build';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import ScheduleIcon from '@mui/icons-material/Schedule';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import JoinFullIcon from '@mui/icons-material/JoinFull';
import SchemaIcon from '@mui/icons-material/Schema';
import ImageAspectRatioIcon from '@mui/icons-material/ImageAspectRatio';
import { CSSObject } from '@mui/system';
import { instruments } from '../InstrumentData';
import ReactGA from 'react-ga4';

export const headerStyles = (theme: Theme): CSSObject => ({
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  fontWeight: 'bold',
  borderRight: `1px solid #1f4996`,
  '&:last-child': {
    borderRight: 'none',
  },
});

export interface Reduction {
  id: number;
  start: string;
  end: string;
  state: string;
  status_message: string;
  runner_image: string;
  inputs: {
    [key: string]: string | number | boolean | null;
  };
  outputs: string;
  stacktrace: string;
  script: {
    value: string;
  };
  run: {
    experiment_number: number;
    filename: string;
    run_start: string;
    run_end: string;
    title: string;
    users: string;
    good_frames: number;
    raw_frames: number;
    instrument_name: string;
  };
}

interface ReductionsBaseProps {
  selectedInstrument: string;
  handleInstrumentChange?: (event: any) => void;
  reductions: Reduction[];
  totalRows: number;
  currentPage: number;
  rowsPerPage: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSort: (property: string) => void;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  customHeaders?: React.ReactNode;
  customRowCells?: (reduction: Reduction) => React.ReactNode;
  children?: React.ReactNode;
}

const ReductionsBase: React.FC<ReductionsBaseProps> = ({
  selectedInstrument,
  handleInstrumentChange,
  reductions,
  totalRows,
  currentPage,
  rowsPerPage,
  handleChangePage,
  handleChangeRowsPerPage,
  handleSort,
  orderBy,
  orderDirection,
  customHeaders,
  customRowCells,
  children,
}) => {
  const theme = useTheme();

  const DATA_VIEWER_URL = process.env.REACT_APP_FIA_DATA_VIEWER_URL;

  const openValueEditor = (reductionId: number): void => {
    const url = `/fia/value-editor/${reductionId}`;
    const windowName = 'ValueEditorWindow';
    const features = 'width=1200,height=800,resizable=no';
    window.open(url, windowName, features);
    ReactGA.event({
      category: 'Button',
      action: 'Click',
      label: 'Value editor button',
      value: reductionId,
    });
  };

  const openDataViewer = (
    reductionId: number,
    instrumentName: string,
    experimentNumber: number,
    output: string
  ): void => {
    const url = `${DATA_VIEWER_URL}/view/${instrumentName}/${experimentNumber}/${output}`;
    window.open(url, '_blank');
    ReactGA.event({
      category: 'Button',
      action: 'Click',
      label: 'View button',
      value: reductionId,
    });
  };

  const Row: React.FC<{ reduction: Reduction; index: number }> = ({ reduction, index }) => {
    const [open, setOpen] = useState(false);
    const theme = useTheme();

    const ReductionStatusIcon = ({ state }: { state: string }): JSX.Element => {
      const getIconComponent = (): JSX.Element => {
        switch (state) {
          case 'ERROR':
            return <ErrorOutlineIcon color="error" />;
          case 'SUCCESSFUL':
            return <CheckCircleOutlineIcon color="success" />;
          case 'UNSUCCESSFUL':
            return <WarningAmberIcon color="warning" />;
          case 'NOT_STARTED':
            return <HighlightOffIcon color="action" />;
          default:
            return <ErrorOutlineIcon />;
        }
      };
      return (
        <Tooltip title={state}>
          <span>{getIconComponent()}</span>
        </Tooltip>
      );
    };

    const formatDateTime = (dateTimeStr: string | null): string => {
      if (!dateTimeStr) {
        return '';
      }
      return dateTimeStr.replace('T', '\n');
    };

    const extractFileName = (path: string): string => {
      const fileNameWithExtension = path.split('/').pop();
      if (typeof fileNameWithExtension === 'undefined') {
        return '';
      }
      return fileNameWithExtension.split('.')[0];
    };

    const getFileTypeIcon = (fileName: string): JSX.Element => {
      if (fileName.endsWith('.nxspe') || fileName.endsWith('.nxs') || fileName.endsWith('.h5')) {
        return <JoinFullIcon fontSize="small" style={{ marginRight: '8px' }} />;
      } else if (fileName.endsWith('.txt')) {
        return <InsertDriveFileIcon fontSize="small" style={{ marginRight: '8px' }} />;
      } else {
        return <FolderIcon fontSize="small" style={{ marginRight: '8px' }} />;
      }
    };

    const parseReductionOutputs = (): JSX.Element | JSX.Element[] | undefined => {
      try {
        let outputs;
        if (reduction.outputs.startsWith('[') && reduction.outputs.endsWith(']')) {
          const preParsedOutputs = reduction.outputs.replace(/'/g, '"');
          outputs = JSON.parse(preParsedOutputs);
        } else {
          outputs = [reduction.outputs];
        }

        if (Array.isArray(outputs)) {
          return outputs.map((output, index: number) => (
            <TableRow key={index}>
              <TableCell>
                <Box maxHeight="80px" display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Box display="flex" alignItems="center">
                    <Box display="flex" alignItems="center" sx={{ overflow: 'hidden' }}>
                      {getFileTypeIcon(output)}
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '200px',
                        }}
                        title={output}
                      >
                        {output}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Button
                      variant="contained"
                      style={{ marginLeft: '10px' }}
                      onClick={() =>
                        openDataViewer(
                          reduction.id,
                          reduction.run.instrument_name,
                          reduction.run.experiment_number,
                          output
                        )
                      }
                    >
                      View
                    </Button>
                    <Tooltip title="Will be added in the future">
                      <span>
                        <Button variant="contained" style={{ marginLeft: '10px' }} disabled>
                          Download
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          ));
        }
      } catch (error) {
        console.error('Failed to parse job outputs as JSON:', reduction.outputs);
        console.error('Error:', error);
        return <TableCell>{reduction.outputs}</TableCell>;
      }
    };

    const renderReductionInputs = (): JSX.Element | JSX.Element[] => {
      const entries = Object.entries(reduction.inputs);
      if (entries.length === 0) {
        return <Typography sx={{ fontWeight: 'bold' }}>No input data available</Typography>;
      }

      return entries.map(([key, value], index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <BuildIcon fontSize="small" style={{ marginRight: '8px' }} />
          <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
            {key}:
          </Typography>
          <Typography variant="body2">{value}</Typography>
        </Box>
      ));
    };

    const renderReductionStatus = (): JSX.Element => {
      switch (reduction.state) {
        case 'ERROR':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.error.dark, fontWeight: 'bold' }}>
              [ERROR] {reduction.status_message}
            </Typography>
          );
        case 'SUCCESSFUL':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.success.main, fontWeight: 'bold' }}>
              [SUCCESS] Reduction performed successfully
            </Typography>
          );
        case 'NOT_STARTED':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.grey[700], fontWeight: 'bold' }}>
              [NOT STARTED] This reduction has not been started yet
            </Typography>
          );
        case 'UNSUCCESSFUL':
          return (
            <Typography variant="subtitle1" style={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>
              [UNSUCCESSFUL] {reduction.status_message}
            </Typography>
          );
        default:
          return <></>;
      }
    };

    const rowStyles = {
      backgroundColor:
        index % 2 === 0
          ? theme.palette.mode === 'light'
            ? '#f0f0f0' // Light mode, even rows
            : theme.palette.mode === 'dark'
            ? '#2d2d2d' // Dark mode, even rows
            : '#000000' // High contrast mode, even rows
          : theme.palette.background.default, // Odd rows (default background color)
    };

    const hoverStyles = (theme: any, index: number): React.CSSProperties => {
      return {
        backgroundColor:
          theme.palette.mode === 'light'
            ? '#e0e0e0' // Light mode hover color
            : theme.palette.mode === 'dark'
            ? index % 2 === 0
              ? '#4c4c4c' // Dark mode, even rows
              : '#4a4a4a' // Dark mode, odd rows
            : '#ffffff', // High contrast mode hover color
      };
    };

    return (
      <>
        <TableRow sx={{ ...rowStyles, '&:hover': hoverStyles(theme, index) }} onClick={() => setOpen(!open)}>
          <TableCell sx={{ width: '5%' }}>
            <IconButton aria-label="expand row" size="small">
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell sx={{ width: '5%' }}>
            <ReductionStatusIcon state={reduction.state} />
          </TableCell>
          {customRowCells && customRowCells(reduction)}
          <TableCell sx={{ width: '15%' }}>{reduction.run.experiment_number}</TableCell>
          <TableCell sx={{ width: '15%' }}>{extractFileName(reduction.run.filename)}</TableCell>
          <TableCell sx={{ width: '15%' }}>{formatDateTime(reduction.run.run_start)}</TableCell>
          <TableCell sx={{ width: '15%' }}>{formatDateTime(reduction.run.run_end)}</TableCell>
          <TableCell sx={{ width: '30%' }}>{reduction.run.title}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell colSpan={7} style={{ paddingBottom: 0, paddingTop: 0 }}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box margin={2}>
                <Typography variant="h6" gutterBottom>
                  {renderReductionStatus()}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={4}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {reduction.state === 'UNSUCCESSFUL' || reduction.state === 'ERROR'
                        ? 'Stacktrace output'
                        : 'Reduction outputs'}
                    </Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {reduction.state === 'NOT_STARTED' ? (
                        <Typography variant="body2" style={{ margin: 2 }}>
                          No output files to show
                        </Typography>
                      ) : reduction.state === 'UNSUCCESSFUL' || reduction.state === 'ERROR' ? (
                        <Typography variant="body2" style={{ margin: 2, whiteSpace: 'pre-wrap' }}>
                          {reduction.stacktrace ? reduction.stacktrace : 'No detailed stacktrace to show'}
                        </Typography>
                      ) : (
                        <Table size="small" aria-label="details">
                          <TableBody>{parseReductionOutputs()}</TableBody>
                        </Table>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Run details
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <VpnKeyIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Reduction ID:
                      </Typography>
                      <Typography variant="body2">{reduction.id}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <ImageAspectRatioIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Runner image:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '200px',
                        }}
                        title={reduction.runner_image}
                      >
                        {reduction.runner_image}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <SchemaIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Instrument:
                      </Typography>
                      <Typography variant="body2">{reduction.run.instrument_name}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <ScheduleIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Reduction start:
                      </Typography>
                      <Typography variant="body2">{formatDateTime(reduction.start)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <ScheduleIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Reduction end:
                      </Typography>
                      <Typography variant="body2">{formatDateTime(reduction.end)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <StackedBarChartIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Good frames:
                      </Typography>
                      <Typography variant="body2">{reduction.run.good_frames.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <StackedBarChartIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Raw frames:
                      </Typography>
                      <Typography variant="body2">{reduction.run.raw_frames.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <PeopleIcon fontSize="small" style={{ marginRight: '8px' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                        Users:
                      </Typography>
                      <Typography variant="body2">{reduction.run.users}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Reduction inputs
                    </Typography>
                    <Box sx={{ maxHeight: 140, overflowY: 'auto', marginBottom: 2 }}>{renderReductionInputs()}</Box>
                    <Box display="flex" justifyContent="right">
                      <Button variant="contained" sx={{ marginRight: 1 }} onClick={() => openValueEditor(reduction.id)}>
                        Value editor
                      </Button>
                      <Tooltip title="Will be added in the future">
                        <span>
                          <Button variant="contained" color="primary" disabled>
                            Rerun
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom="20px">
        <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
          {selectedInstrument} reductions
        </Typography>
        {handleInstrumentChange && (
          <FormControl style={{ width: '200px', marginLeft: '20px' }}>
            <InputLabel id="instrument-select-label">Instrument</InputLabel>
            <Select
              labelId="instrument-select-label"
              value={selectedInstrument}
              label="Instrument"
              onChange={handleInstrumentChange}
            >
              {instruments.map((instrument) => (
                <MenuItem key={instrument.name} value={instrument.name}>
                  {instrument.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Render children passed from parent */}
      {children}

      {reductions.length === 0 ? (
        <Typography variant="h6" style={{ textAlign: 'center', marginTop: '20px', color: theme.palette.text.primary }}>
          No reductions to show for this instrument
        </Typography>
      ) : (
        <>
          <TablePagination
            component="div"
            count={totalRows}
            page={currentPage}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          <TableContainer component={Paper}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerStyles(theme), width: '8%' }} colSpan={2}>
                    {selectedInstrument}
                  </TableCell>
                  {customHeaders && customHeaders}
                  <TableCell
                    sx={{ width: '12%', ...headerStyles(theme) }}
                    onClick={() => handleSort('experiment_number')}
                  >
                    Experiment Number {orderBy === 'experiment_number' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '10%', ...headerStyles(theme) }} onClick={() => handleSort('filename')}>
                    Filename {orderBy === 'filename' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '15%', ...headerStyles(theme) }} onClick={() => handleSort('run_start')}>
                    Run start {orderBy === 'run_start' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '15%', ...headerStyles(theme) }} onClick={() => handleSort('run_end')}>
                    Run end {orderBy === 'run_end' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell sx={{ width: '40%', ...headerStyles(theme) }}>Title</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reductions.map((reduction, index) => (
                  <Row key={reduction.id} reduction={reduction} index={index} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  );
};

export default ReductionsBase;
