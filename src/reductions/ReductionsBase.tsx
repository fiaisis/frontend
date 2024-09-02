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
import { CSSObject } from '@mui/system';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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

const DATA_VIEWER_URL = process.env.REACT_APP_FIA_DATA_VIEWER_URL;

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

const openMinimalWindow = (reductionId: number): void => {
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
    return dateTimeStr.replace('T', ' ');
  };

  const extractFileName = (path: string): string => {
    const fileNameWithExtension = path.split('/').pop();
    if (typeof fileNameWithExtension === 'undefined') {
      return '';
    }
    return fileNameWithExtension.split('.')[0];
  };

  const Row: React.FC<{ reduction: Reduction; index: number }> = ({ reduction, index }) => {
    const [open, setOpen] = useState(false);

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
                <Box display="flex" justifyContent="space-between" alignItems="center" maxHeight="80px" width="100%">
                  <Box flex="1" textAlign="left" sx={{ overflowWrap: 'break-word' }}>
                    {output}
                  </Box>
                  <Box>
                    <Button
                      variant="contained"
                      style={{ marginLeft: '10px' }}
                      onClick={() => {
                        const url = `${DATA_VIEWER_URL}/view/${reduction.run.instrument_name}/${reduction.run.experiment_number}/${output}`;
                        window.open(url, '_blank');
                        ReactGA.event({
                          category: 'Button',
                          action: 'Click',
                          label: 'View button',
                          value: reduction.id,
                        });
                      }}
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
        <Typography key={index} variant="body2" sx={{ fontWeight: 'bold' }}>
          {`${key}: ${value}`}
        </Typography>
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
                          {reduction.stacktrace}
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
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Reduction ID: {reduction.id}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Instrument: {reduction.run.instrument_name}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Reduction start: {formatDateTime(reduction.start)}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Reduction end: {formatDateTime(reduction.end)}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Good frames: {reduction.run.good_frames.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Raw frames: {reduction.run.raw_frames.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Users: {reduction.run.users}
                    </Typography>
                  </Grid>
                  <Grid item xs={5}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Reduction inputs
                    </Typography>
                    <Box sx={{ maxHeight: 140, overflowY: 'auto', marginBottom: 2 }}>{renderReductionInputs()}</Box>
                    <Box display="flex" justifyContent="right">
                      <Button
                        variant="contained"
                        sx={{ marginRight: 1 }}
                        onClick={() => openMinimalWindow(reduction.id)}
                      >
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
          {selectedInstrument} reduction history
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

