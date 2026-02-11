import React from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Radio,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { FileConfig } from '../../lib/types';

interface FileCardProps {
  file: FileConfig;
  fileIndex: number;
  filename: string;
  activeViewerTab: '1d' | '2d';
  selected2DFile: string | null;
  inputMode: 'text' | 'chips';
  onInputModeChange: (mode: 'text' | 'chips') => void;
  onFileToggle: (index: number) => void;
  onDatasetChange: (index: number, datasetPath: string) => void;
  onSelectionChange: (index: number, selections: number[]) => void;
  onSelect2DFile?: (filename: string) => void;
}

const FileCard: React.FC<FileCardProps> = ({
  file,
  fileIndex,
  filename,
  activeViewerTab,
  selected2DFile,
  inputMode,
  onInputModeChange,
  onFileToggle,
  onDatasetChange,
  onSelectionChange,
  onSelect2DFile,
}): JSX.Element => {
  return (
    <Card
      variant="outlined"
      sx={{
        border: file.enabled ? 2 : 1,
        borderColor: file.enabled ? 'primary.main' : 'divider',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* File selection - checkbox in 1D mode, radio in 2D mode */}
        <FormControlLabel
          control={
            activeViewerTab === '2d' ? (
              <Radio
                size="small"
                checked={selected2DFile === filename}
                onChange={() => onSelect2DFile?.(filename)}
              />
            ) : (
              <Checkbox size="small" checked={file.enabled} onChange={() => onFileToggle(fileIndex)} />
            )
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <InsertDriveFileIcon fontSize="small" color="action" />
              <Typography
                variant="body2"
                sx={{
                  wordBreak: 'break-all',
                  fontSize: '0.8rem',
                }}
              >
                {filename}
              </Typography>
            </Box>
          }
          sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
        />

        {/* File controls - only show in 1D mode if enabled */}
        {activeViewerTab === '1d' && file.enabled && (
          <Box sx={{ mt: 2, ml: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Dataset selector - dropdown for discovered datasets */}
            <Box>
              {file.isDiscovered && file.discoveredDatasets && file.discoveredDatasets.length > 0 ? (
                // Show dropdown for discovered datasets
                <FormControl fullWidth size="small">
                  <InputLabel id={`dataset-select-label-${fileIndex}`}>
                    Dataset ({file.discoveredDatasets.length} found)
                  </InputLabel>
                  <Select
                    labelId={`dataset-select-label-${fileIndex}`}
                    value={file.path || ''}
                    label={`Dataset (${file.discoveredDatasets.length} found)`}
                    onChange={(e) => {
                      if (e.target.value) {
                        onDatasetChange(fileIndex, e.target.value);
                      }
                    }}
                    displayEmpty
                    sx={{
                      fontSize: '0.875rem',
                    }}
                  >
                    {!file.path && (
                      <MenuItem value="" disabled>
                        <em>Select a dataset</em>
                      </MenuItem>
                    )}
                    {file.discoveredDatasets.map((dataset) => (
                      <MenuItem
                        key={dataset.path}
                        value={dataset.path}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          py: 1.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                            mb: 0.5,
                          }}
                        >
                          {dataset.path}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          {dataset.isPrimary && (
                            <Chip
                              label="Primary"
                              size="small"
                              color="success"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          )}
                          <Chip
                            label={dataset.shape.join(' × ')}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                          <Chip
                            label={dataset.is2D ? '2D' : '1D'}
                            size="small"
                            color={dataset.is2D ? 'secondary' : 'primary'}
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                          <Chip
                            label={dataset.dtype.class}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                          {dataset.errorPath && (
                            <Chip
                              label="Supports error bars"
                              size="small"
                              color="info"
                              sx={{ height: 18, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : file.isDiscovered ? (
                // Datasets discovered but none found
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    No numeric datasets found
                  </Typography>
                </Box>
              ) : (
                // Discovering datasets
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                    Discovering datasets...
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Selection input - only for 2D datasets being sliced to 1D */}
            {file.path && file.selectedDatasetIs2D && (
              <Box>
                {/* Mode toggle */}
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                >
                  <Typography variant="body2" fontWeight="500">
                    Slice Selection (2D → 1D)
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    value={inputMode}
                    exclusive
                    onChange={(_, newMode) => newMode && onInputModeChange(newMode)}
                    sx={{ height: 24 }}
                  >
                    <ToggleButton value="text" sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>
                      Text
                    </ToggleButton>
                    <ToggleButton value="chips" sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>
                      Chips
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Text input mode */}
                {inputMode === 'text' && (
                  <TextField
                    size="small"
                    value={file.selection?.join(',') || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        onSelectionChange(fileIndex, []);
                      } else {
                        const selections = value
                          .split(',')
                          .map((s) => parseInt(s.trim()))
                          .filter((n) => !isNaN(n) && n >= 0);
                        onSelectionChange(fileIndex, selections);
                      }
                    }}
                    placeholder="7,8"
                    fullWidth
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: '0.875rem',
                      },
                    }}
                    helperText="Comma-separated indices (each slice fetched separately)"
                  />
                )}

                {/* Chip-based input mode */}
                {inputMode === 'chips' && (
                  <Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1, minHeight: 32 }}>
                      {(file.selection || []).map((slice, idx) => (
                        <Chip
                          key={idx}
                          label={`Slice ${slice}`}
                          onDelete={() => {
                            const newSelections = file.selection?.filter((_, i) => i !== idx) || [];
                            onSelectionChange(fileIndex, newSelections);
                          }}
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Add slice"
                      slotProps={{ htmlInput: { min: 0 } }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const value = parseInt(input.value);
                          if (!isNaN(value) && value >= 0) {
                            const newSelections = [...(file.selection || []), value];
                            onSelectionChange(fileIndex, newSelections);
                            input.value = '';
                          }
                        }
                      }}
                      fullWidth
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: '0.875rem',
                        },
                      }}
                      helperText="Press Enter to add slice"
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FileCard;
