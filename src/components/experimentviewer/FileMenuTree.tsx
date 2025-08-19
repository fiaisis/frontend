import { RichTreeView, TreeItem, TreeItemProps, TreeViewBaseItem, useTreeViewApiRef } from '@mui/x-tree-view';
import { Box, Tooltip, useTheme } from '@mui/material';
import React from 'react';
import { RunsTreeItem } from '../../pages/ExperimentViewer';

interface FileMenuTreeProps {
  items: TreeViewBaseItem<RunsTreeItem>[];
  setSelectedItem: (item: string) => void;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(props: TreeItemProps, ref: React.Ref<HTMLLIElement>) {
  if (props.children) {
    return (
      <TreeItem
        sx={{
          color: '#86b4ff',
        }}
        {...props}
        ref={ref}
      />
    );
  } else {
    return (
      <Tooltip title={props.label} arrow placement={'right'}>
        <TreeItem
          sx={{
            color: '#ff868a',
          }}
          {...props}
          ref={ref}
        />
      </Tooltip>
    );
  }
});

export const FileMenuTree = (props: FileMenuTreeProps): React.ReactElement => {
  const apiRef = useTreeViewApiRef();
  const theme = useTheme();

  return (
    <Box
      sx={{
        padding: '12px 16px',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '4px',
        backgroundColor: theme.palette.background.paper,
        overflow: 'auto',
      }}
    >
      <RichTreeView
        multiSelect
        checkboxSelection
        onItemSelectionToggle={(event, itemId) => props.setSelectedItem(itemId)}
        apiRef={apiRef}
        items={props.items}
        sx={{
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        slots={{ item: CustomTreeItem }}
      />
    </Box>
  );
};
