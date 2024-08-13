// React components
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Material UI components
import {
  Box,
  Button,
  Collapse,
  Grid,
  Icon,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
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
import JoinInnerIcon from '@mui/icons-material/JoinInner';
import SchemaIcon from '@mui/icons-material/Schema';
import ImageAspectRatioIcon from '@mui/icons-material/ImageAspectRatio';

// Represents a single run with metadata and frame statistics
interface Run {
  experiment_number: number;
  filename: string;
  run_start: string;
  run_end: string;
  title: string;
  users: string;
  good_frames: number;
  raw_frames: number;
  instrument_name: string;
}

// Describes the details of a reduction
interface Reduction {
  id: number;
  start: string;
  end: string;
  state: string;
  status_message: string;
  inputs: {
    [key: string]: string | number | boolean | null;
  };
  outputs: string;
  runner_image: string;
  stacktrace: string;
  script: {
    value: string;
  };
  run: Run;
}

const AllReductionHistory: React.FC = () => {
  const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
  const theme = useTheme();
  const [reductions, setReductions] = useState<Reduction[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // Page index starts at 0 for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');

  const fetchTotalCount = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${fiaApiUrl}/jobs/count`);
      const data = await response.json();
      setTotalRows(data.count);
    } catch (error) {
      console.error('Error fetching run count:', error);
    }
  }, [fiaApiUrl]);

  const fetchReductions = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('scigateway:token');
      const offset = currentPage * rowsPerPage;
      const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true`;
      const response = await fetch(`${fiaApiUrl}/jobs?${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('EXPERIMENT', data);
      setReductions(data);
    } catch (error) {
      console.error('Error fetching reductions:', error);
    }
  }, [currentPage, rowsPerPage, orderDirection, fiaApiUrl]);

  useEffect(() => {
    fetchTotalCount();
    fetchReductions();
  }, [fetchTotalCount, fetchReductions, currentPage, rowsPerPage]);

  const handleSort = (property: string): void => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setCurrentPage(0); // Reset to the first page
  };

  const handleChangePage = (event: unknown, newPage: number): void => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const headerStyles = {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
    fontWeight: 'bold',
    borderRight: `1px solid #1f4996`,
    '&:last-child': {
      borderRight: 'none',
    },
  };

  return (
    <div style={{ padding: '20px' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" marginBottom="20px">
        <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
          All reductions
        </Typography>
      </Box>

      {reductions.length === 0 ? (
        <Typography variant="h6" style={{ textAlign: 'center', marginTop: '20px', color: theme.palette.text.primary }}>
          No reductions to show
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
          <TableContainer component={Paper} style={{ maxHeight: '740px', overflowY: 'scroll' }}>
            <Table aria-label="collapsible table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={{ ...headerStyles, width: '5%' }} colSpan={2}></TableCell>
                  <TableCell
                    style={{ ...headerStyles, width: '12%' }}
                    sortDirection={orderBy === 'experiment_number' ? orderDirection : false}
                    onClick={() => handleSort('experiment_number')}
                  >
                    Experiment Number {orderBy === 'experiment_number' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell
                    style={{ ...headerStyles, width: '10%' }}
                    sortDirection={orderBy === 'filename' ? orderDirection : false}
                    onClick={() => handleSort('filename')}
                  >
                    Filename {orderBy === 'filename' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell
                    style={{ ...headerStyles, width: '10%' }}
                    sortDirection={orderBy === 'run_start' ? orderDirection : false}
                    onClick={() => handleSort('run_start')}
                  >
                    Run start {orderBy === 'run_start' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell
                    style={{ ...headerStyles, width: '10%' }}
                    sortDirection={orderBy === 'run_end' ? orderDirection : false}
                    onClick={() => handleSort('run_end')}
                  >
                    Run end {orderBy === 'run_end' ? (orderDirection === 'asc' ? '↑' : '↓') : ''}
                  </TableCell>
                  <TableCell style={{ ...headerStyles, width: '28%' }}>Title</TableCell>
                  <TableCell style={{ ...headerStyles, width: '15%' }}>Instrument</TableCell>
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

function Row({ reduction, index }: { reduction: Reduction; index: number }): JSX.Element {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const fiaDataViewerUrl = process.env.REACT_APP_FIA_DATA_VIEWER_URL;

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
          return <Icon>help_outline</Icon>;
      }
    };
    return (
      <Tooltip title={state}>
        <span>{getIconComponent()}</span>
      </Tooltip>
    );
  };

  const formatDateTime = (dateTimeStr: string | null): string => {
    if (dateTimeStr === null) {
      return '';
    }
    return dateTimeStr.replace('T', '\n');
  };

  const extractFileName = (path: string): string => {
    const fileNameWithExtension = path.split('/').pop();

    if (typeof fileNameWithExtension === 'undefined') {
      return '';
    }
    const fileName = fileNameWithExtension.split('.')[0];
    return fileName;
  };

  const getFileTypeIcon = (fileName: string): JSX.Element => {
    if (fileName.endsWith('.nxspe')) {
      return <JoinFullIcon fontSize="small" style={{ marginRight: '8px' }} />;
    } else if (fileName.endsWith('.nxs')) {
      return <JoinInnerIcon fontSize="small" style={{ marginRight: '8px' }} />;
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
        // If outputs is a list, replace single quotes with double quotes to form
        // a valid JSON string before parsing
        const preParsedOutputs = reduction.outputs.replace(/'/g, '"');
        outputs = JSON.parse(preParsedOutputs);
      } else {
        // Cast to a list if just a single file
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
                      title={reduction.runner_image}
                    >
                      {output}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    style={{ marginLeft: '10px' }}
                    onClick={() => {
                      const url = `${fiaDataViewerUrl}/view/${reduction.run.instrument_name}/${reduction.run.experiment_number}/${output}`;
                      window.open(url, '_blank');
                    }}
                  >
                    View
                  </Button>
                  <Tooltip title="Will be added in the future">
                    <span>
                      {/* Span is necessary because tooltip doesn't work directly on disabled elements */}
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
      console.error('Failed to parse reduction_outputs as JSON:', reduction.outputs);
      console.error('Error:', error);
      return <TableCell>{reduction.outputs}</TableCell>;
    }
  };

  const renderReductionStatus = (): JSX.Element => {
    if (reduction.state === 'ERROR') {
      return (
        <Typography variant="subtitle1" style={{ color: theme.palette.error.dark, fontWeight: 'bold' }}>
          [ERROR] {reduction.status_message}
        </Typography>
      );
    } else if (reduction.state === 'SUCCESSFUL') {
      return (
        <Typography variant="subtitle1" style={{ color: theme.palette.success.main, fontWeight: 'bold' }}>
          [SUCCESS] Reduction performed successfully
        </Typography>
      );
    } else if (reduction.state === 'NOT_STARTED') {
      return (
        <Typography variant="subtitle1" style={{ color: theme.palette.grey[700], fontWeight: 'bold' }}>
          [NOT STARTED] This reduction has not been started yet
        </Typography>
      );
    } else if (reduction.state === 'UNSUCCESSFUL') {
      return (
        <Typography variant="subtitle1" style={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>
          [UNSUCCESSFUL] {reduction.status_message}
        </Typography>
      );
    } else {
      return <></>;
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

  const rowStyles = {
    backgroundColor:
      index % 2 === 0
        ? theme.palette.mode === 'light'
          ? '#f0f0f0' // Light mode, odd rows
          : theme.palette.mode === 'dark'
          ? '#2d2d2d' // Dark mode, odd rows
          : '#000000' // High contrast mode,  odd rows
        : theme.palette.background.default, // All even rows (default background color)
  };

  const hoverStyles = (theme: Theme, index: number): React.CSSProperties => {
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

  const openMinimalWindow = (reductionId: number): void => {
    const url = `/fia/value-editor/${reductionId}`;
    const windowName = 'ValueEditorWindow';
    const features = 'width=1200,height=800,resizable=no';
    window.open(url, windowName, features);
  };

  return (
    <>
      <TableRow
        sx={{
          ...rowStyles,
          '&:hover': hoverStyles(theme, index),
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell>
          <IconButton aria-label="expand row" size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <ReductionStatusIcon state={reduction.state} />
        </TableCell>
        <TableCell component="th" scope="row">
          {reduction.run.experiment_number}
        </TableCell>
        <TableCell>{extractFileName(reduction.run.filename)}</TableCell>
        <TableCell>{formatDateTime(reduction.run.run_start)}</TableCell>
        <TableCell>{formatDateTime(reduction.run.run_end)}</TableCell>
        <TableCell>{reduction.run.title}</TableCell>
        <TableCell>
          <Link
            to={`/reduction-history/${reduction.run.instrument_name}`}
            style={{
              fontWeight: 'bold',
              color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
            }}
          >
            {reduction.run.instrument_name}
          </Link>
        </TableCell>
      </TableRow>
      <TableRow sx={rowStyles}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={2}>
              <Typography variant="h6" gutterBottom component="div">
                {renderReductionStatus()}
              </Typography>
              <Grid container spacing={3} sx={{ '@media (max-width:600px)': { flexDirection: 'column' } }}>
                <Grid item xs={4} sx={{ '@media (max-width:600px)': { width: '100%' } }}>
                  <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
                    {reduction.state === 'UNSUCCESSFUL' || reduction.state === 'ERROR'
                      ? 'Stacktrace output'
                      : 'Reduction outputs'}
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {reduction.state === 'NOT_STARTED' ? (
                      <Typography variant="body2" style={{ margin: 2 }}>
                        No output files to show
                      </Typography>
                    ) : reduction.state === 'SUCCESSFUL' && !reduction.outputs ? (
                      <Typography variant="body2" style={{ margin: 2 }}>
                        Output files missing
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

                <Grid item xs={3} sx={{ '@media (max-width:600px)': { width: '100%' } }}>
                  <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
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
                    <Typography variant="body2">{reduction.id}</Typography>
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

                <Grid item xs={5} sx={{ '@media (max-width:600px)': { width: '100%' } }}>
                  <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
                    Reduction inputs
                  </Typography>
                  <Box sx={{ maxHeight: 140, overflowY: 'auto', marginBottom: 2 }}>{renderReductionInputs()}</Box>
                  <Box display="flex" justifyContent="right">
                    <Button variant="contained" sx={{ marginRight: 1 }} onClick={() => openMinimalWindow(reduction.id)}>
                      Value editor
                    </Button>
                    <Tooltip title="Will be added in the future">
                      <span>
                        {/* Span is necessary because tooltip doesn't work directly on disabled elements */}
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
}

export default AllReductionHistory;
