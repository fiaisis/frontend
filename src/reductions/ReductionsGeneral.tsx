// React components
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';

// Material UI components
import { SelectChangeEvent, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Local data
import ReductionsBase, { Reduction } from './ReductionsBase';
import { instruments } from '../InstrumentData';

const ReductionsGeneral: React.FC = () => {
  const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const history = useHistory();
  const theme = useTheme();

  const [reductions, setReductions] = useState<Reduction[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedInstrument, setSelectedInstrument] = useState<string>(instrumentName || instruments[0].name);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<string>('run_start');

  useEffect(() => {
    if (instrumentName && instruments.some((i) => i.name === instrumentName)) {
      setSelectedInstrument(instrumentName);
    } else {
      setSelectedInstrument(instruments[0].name);
      history.replace(`/reduction-history/${instruments[0].name}`);
    }
  }, [instrumentName, history]);

  const fetchTotalCount = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${fiaApiUrl}/instrument/${selectedInstrument}/jobs/count`);
      const data = await response.json();
      setTotalRows(data.count);
    } catch (error) {
      console.error('Error fetching run count:', error);
    }
  }, [selectedInstrument, fiaApiUrl]);

  const fetchReductions = useCallback(async (): Promise<void> => {
    try {
      const isDev = process.env.REACT_APP_DEV_MODE === 'true';
      const token = isDev ? null : localStorage.getItem('scigateway:token');
      const offset = currentPage * rowsPerPage;
      const query = `limit=${rowsPerPage}&offset=${offset}&order_by=${orderBy}&order_direction=${orderDirection}&include_run=true`;
      const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${fiaApiUrl}/instrument/${selectedInstrument}/jobs?${query}`, {
        method: 'GET',
        headers,
      });
      const data = await response.json();
      setReductions(data);
    } catch (error) {
      console.error('Error fetching reductions:', error);
    }
  }, [selectedInstrument, currentPage, rowsPerPage, orderBy, orderDirection, fiaApiUrl]);

  useEffect(() => {
    fetchTotalCount();
    fetchReductions();
  }, [fetchTotalCount, fetchReductions]);

  const handleInstrumentChange = (event: SelectChangeEvent<string>): void => {
    const newInstrument = event.target.value;
    setSelectedInstrument(newInstrument);
    setCurrentPage(0);
    history.push(`/reduction-history/${newInstrument}`);
    fetchTotalCount();
    fetchReductions();
  };

  const handleSort = (property: string): void => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setCurrentPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number): void => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  return (
    <ReductionsBase
      selectedInstrument={selectedInstrument}
      handleInstrumentChange={handleInstrumentChange}
      reductions={reductions}
      totalRows={totalRows}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
      handleSort={handleSort}
      orderBy={orderBy}
      orderDirection={orderDirection}
    >
      <Typography
        variant="body1"
        component={Link}
        to="/reduction-history/all"
        style={{
          color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          marginTop: '10px',
        }}
      >
        <ArrowBack style={{ marginRight: '4px' }} />
        View reductions for all instruments
      </Typography>
    </ReductionsBase>
  );
};

export default ReductionsGeneral;
