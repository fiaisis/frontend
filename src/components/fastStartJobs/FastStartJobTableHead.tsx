import { Box, CSSObject, SxProps, TableCell, TableHead, TableRow, TableSortLabel, useTheme } from '@mui/material';
import { Theme } from '@mui/material/styles';
import React from 'react';

import { getJobTableChromeColors, JOB_TABLE_HEADER_HEIGHT } from '../jobs/constants';

interface SortableHeaderCellProps {
  headerName: string;
  sortKey: string;
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  align?: 'center' | 'left' | 'right';
  sx?: SxProps<Theme>;
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

const highlightHover = (theme: Theme): React.CSSProperties => {
  const tableChrome = getJobTableChromeColors(theme.palette.mode);

  return {
    backgroundColor: tableChrome.hover,
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
  const isActive = orderBy === sortKey;
  const theme = useTheme();
  const tableChrome = getJobTableChromeColors(theme.palette.mode);

  return (
    <TableCell align={align} sx={sx} onClick={() => onSort(sortKey)} style={{ cursor: 'pointer' }}>
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

export interface FastStartJobTableHeadProps {
  orderBy: string;
  orderDirection: 'asc' | 'desc';
  handleSort: (key: string) => void;
}

const FastStartJobTableHead: React.FC<FastStartJobTableHeadProps> = ({ handleSort, orderBy, orderDirection }) => {
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
        <TableCell align="center" sx={headerStyles(theme)}>
          Status
        </TableCell>
        <SortableHeaderCell
          headerName="Job ID"
          sortKey="id"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Experiment number"
          sortKey="experiment_number"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Job start"
          sortKey="start"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ ...headerStyles(theme), '&:hover': highlightHover(theme) }}
        />
        <SortableHeaderCell
          headerName="Job end"
          sortKey="end"
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={handleSort}
          sx={{ ...headerStyles(theme), borderRight: 0, '&:hover': highlightHover(theme) }}
        />
      </TableRow>
    </TableHead>
  );
};

export default FastStartJobTableHead;
