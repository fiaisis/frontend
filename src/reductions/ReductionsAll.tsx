import React, { useCallback, useEffect, useState } from 'react';
import ReductionsBase, { Reduction, headerStyles } from './ReductionsBase';
import { useTheme } from '@mui/material/styles';
import { TableCell } from '@mui/material';
import { Link } from 'react-router-dom';

const ReductionsAll: React.FC = () => {
  const fiaApiUrl = process.env.REACT_APP_FIA_REST_API_URL;
  const theme = useTheme();

  const [reductions, setReductions] = useState<Reduction[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
      const query = `limit=${rowsPerPage}&offset=${offset}&order_direction=${orderDirection}&include_run=true`;
      const response = await fetch(`${fiaApiUrl}/jobs?${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      // Filter out any reductions that don't have a valid run object
      const filteredData = data.filter((reduction: Reduction) => reduction.run !== null);

      setReductions(filteredData);
    } catch (error) {
      console.error('Error fetching reductions:', error);
    }
  }, [currentPage, rowsPerPage, orderBy, orderDirection, fiaApiUrl]);

  useEffect(() => {
    fetchTotalCount();
    fetchReductions();
  }, [fetchTotalCount, fetchReductions]);

  const handleChangePage = (event: unknown, newPage: number): void => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  const handleSort = (property: string): void => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setCurrentPage(0);
  };

  return (
    <ReductionsBase
      selectedInstrument="All"
      reductions={reductions}
      totalRows={totalRows}
      currentPage={currentPage}
      rowsPerPage={rowsPerPage}
      handleChangePage={handleChangePage}
      handleChangeRowsPerPage={handleChangeRowsPerPage}
      handleSort={handleSort}
      orderBy={orderBy}
      orderDirection={orderDirection}
      customHeaders={<TableCell sx={{ width: '10%', ...headerStyles(theme) }}>Instrument</TableCell>}
      customRowCells={(reduction: Reduction) => (
        <TableCell sx={{ width: '10%' }}>
          <Link
            to={`/reduction-history/${reduction.run.instrument_name}`}
            style={{
              color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
              textDecoration: 'none',
            }}
          >
            {reduction.run.instrument_name}
          </Link>
        </TableCell>
      )}
    />
  );
};

export default ReductionsAll;
