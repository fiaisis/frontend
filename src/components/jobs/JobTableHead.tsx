import { Box, CSSObject, SxProps, TableCell, TableHead, TableRow, TableSortLabel, useTheme } from '@mui/material';
import React from 'react';
import { Theme } from '@mui/material/styles';

interface SortableHeaderCellProps {
  headerName: string; // Title of the column
  sortKey: string; // The key related to sorting, like 'experiment_number'
  orderBy: string; // Currently sorted column
  orderDirection: 'asc' | 'desc'; // Current sort direction
  onSort: (key: string) => void; // Function to handle sorting when clicked
  align?: 'center' | 'left' | 'right'; // Text alignment
  sx?: SxProps<Theme>; // Additional styles
}

const headerStyles = (theme: Theme): CSSObject => ({
  color: theme.palette.primary.contrastText,
  backgroundColor: theme.palette.primary.main,
  fontWeight: 'bold',
  borderRight: '2px solid #1f4996',
  '&:last-child': {
    borderRight: 'none',
  },
});

const SortableHeaderCell: React.FC<SortableHeaderCellProps> = ({
  headerName,
  sortKey,
  orderBy,
  orderDirection,
  onSort,
  align = 'center',
  sx,
}) => {
  const isActive = orderBy === sortKey; // Check if the column is actively sorted

  return (
    <TableCell align={align} sx={sx} onClick={() => onSort(sortKey)}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {headerName}
        {isActive && (
          <TableSortLabel
            active
            direction={orderDirection}
            sx={{
              '& .MuiTableSortLabel-icon': {
                color: 'white !important', // Custom styling for active arrow
              },
            }}
          />
        )}
      </Box>
    </TableCell>
  );
};

interface JobTableHeadProps {
  selectedInstrument: string;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  handleSort: (key: string) => void;
}

const JobTableHead: React.FC<JobTableHeadProps> = ({ selectedInstrument, handleSort, orderBy, orderDirection }) => {
  const theme = useTheme();
  return (
    <TableHead sx={{ '& th': { py: 0.5 } }}>
      <TableRow>
        <TableCell sx={{ ...headerStyles(theme), width: '10%' }} colSpan={2}>
          {selectedInstrument}
        </TableCell>
        <SortableHeaderCell
          headerName="Experiment Number"
          sortKey="experiment_number"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          align="center"
          sx={{ width: '12%', ...headerStyles(theme) }}
        />
        <SortableHeaderCell
          headerName="Filename"
          align="center"
          sortKey="filename"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '8%', ...headerStyles(theme) }}
        />
        <SortableHeaderCell
          headerName="Run Start"
          sortKey="run_start"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          align="center"
          sx={{ width: '12%', ...headerStyles(theme) }}
        />
        <SortableHeaderCell
          align={'center'}
          headerName="Run End"
          sortKey="run_end"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme) }}
        />
        <SortableHeaderCell
          align={'center'}
          headerName="Job Start"
          sortKey="start"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme) }}
        />
        <SortableHeaderCell
          align={'center'}
          headerName="Job End"
          sortKey="end"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme) }}
        />
        <TableCell sx={{ width: '24%', ...headerStyles(theme) }} align={'left'}>
          Title
        </TableCell>
        {selectedInstrument === 'ALL' && (
          <TableCell sx={{ width: '10%', ...headerStyles(theme) }}>Instrument</TableCell>
        )}
      </TableRow>
    </TableHead>
  );
};

export default JobTableHead;
