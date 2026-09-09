export const viewerColumnsSx = {
  display: 'flex',
  flexDirection: { xs: 'column', md: 'row' },
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  gap: 0,
  overflow: 'hidden',
} as const;

export const viewerSidebarSx = {
  width: { xs: '100%', md: 320 },
  minWidth: 0,
  flexShrink: 0,
  boxSizing: 'border-box',
} as const;

export const viewerContentSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  // Overlap adjacent panel borders to keep the shared edge one pixel wide.
  ml: { xs: 0, md: '-1px' },
  mt: { xs: '-1px', md: 0 },
} as const;
