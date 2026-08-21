import { Box, CSSObject, SxProps, TableCell, TableHead, TableRow, TableSortLabel, useTheme } from '@mui/material';
import { Theme } from '@mui/material/styles';
import React from 'react';

import { getJobTableChromeColors, JOB_TABLE_HEADER_HEIGHT } from './constants';

interface SortableHeaderCellProps {
  headerName: string; // Title of the column
  sortKey: string; // The key related to sorting, like 'experiment_number'
  orderBy: string; // Currently sorted column
  orderDirection: 'asc' | 'desc'; // Current sort direction
  onSort: (key: string) => void; // Function to handle sorting when clicked
  align?: 'center' | 'left' | 'right'; // Text alignment
  sx?: SxProps<Theme>; // Additional styles
}

const headerStyles = (theme: Theme): CSSObject => {
  const tableChrome = getJobTableChromeColors(theme.palette.mode);

  return {
    color: tableChrome.text,
    backgroundColor: tableChrome.header,
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    borderRight: `1px solid ${tableChrome.border}`,
  };
};

const SortableHeaderCell: React.FC<SortableHeaderCellProps> = ({
  headerName,
  sortKey,
  orderBy,
  orderDirection,
  onSort,
  align = 'left',
  sx,
}) => {
  const isActive = orderBy === sortKey; // Check if the column is actively sorted
  const theme = useTheme();
  const tableChrome = getJobTableChromeColors(theme.palette.mode);

  return (
    <TableCell align={align} sx={sx} onClick={() => onSort(sortKey)}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: isActive ? tableChrome.accent : tableChrome.text,
          whiteSpace: 'nowrap',
        }}
      >
        {headerName}
        {isActive && (
          <TableSortLabel
            active
            direction={orderDirection}
            sx={{
              '& .MuiTableSortLabel-icon': {
                color: `${tableChrome.accent} !important`,
              },
            }}
          />
        )}
      </Box>
    </TableCell>
  );
};

const highlightHover = (theme: Theme): React.CSSProperties => {
  const tableChrome = getJobTableChromeColors(theme.palette.mode);

  return {
    backgroundColor: tableChrome.hover,
  };
};

interface JobTableHeadProps {
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  handleSort: (key: string) => void;
  allSelected: boolean;
  someSelected: boolean;
  toggleSelectAll: () => void;
}

const JobTableHead: React.FC<JobTableHeadProps> = ({ handleSort, orderBy, orderDirection }) => {
  const theme = useTheme();
  const tableChrome = getJobTableChromeColors(theme.palette.mode);
  return (
    <TableHead
      sx={{
        '& th': {
          py: 0.25,
          borderTop: `1px solid ${tableChrome.border}`,
          borderBottom: `1px solid ${tableChrome.border}`,
        },
        height: JOB_TABLE_HEADER_HEIGHT,
      }}
    >
      <TableRow>
        <SortableHeaderCell
          headerName="Experiment number"
          sortKey="experiment_number"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '14%', ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Filename"
          sortKey="filename"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Run start"
          sortKey="run_start"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          align={'center'}
          headerName="Run end"
          sortKey="run_end"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Job start"
          sortKey="start"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Job end"
          sortKey="end"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ width: '12%', ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <TableCell
          data-border-continuation="header-gutter"
          sx={{ width: '28%', ...headerStyles(theme), borderRight: 0 }}
          align="left"
          colSpan={2}
        >
          Title
        </TableCell>
      </TableRow>
    </TableHead>
  );
};

export default JobTableHead;
