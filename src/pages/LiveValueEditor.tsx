// React components
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

// Material UI components
import { Alert, Box, Button, CircularProgress, Snackbar, Typography, useTheme, IconButton, Collapse, Paper } from '@mui/material';
import { Save, BugReport, ChevronRight, ChevronLeft } from '@mui/icons-material';

// Monaco components
import Editor from '@monaco-editor/react';
import { fiaApi } from '../lib/api';

import NavArrows from '../components/navigation/NavArrows';

const LiveValueEditor: React.FC = () => {
    const theme = useTheme();
    const { instrumentName } = useParams<{ instrumentName: string }>();
    const [scriptValue, setScriptValue] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [traceback, setTraceback] = useState<string | null>(null);
    const [showTraceback, setShowTraceback] = useState(false);
    const userModified = useRef(false);

    const fetchScript = useCallback(async (): Promise<void> => {
        if (!instrumentName) return;
        setLoading(true);
        fiaApi
            .get(`/live-data/${instrumentName}/script`)
            .then((res) => {
                const script = res.data;
                if (typeof script === 'string') {
                    setScriptValue(script);
                } else if (script === null) {
                    setScriptValue('');
                }
            })
            .catch((err) => {
                console.error('Error fetching live data script:', err);
            })
            .finally(() => setLoading(false));
    }, [instrumentName]);

    const fetchTraceback = useCallback(async (): Promise<void> => {
        if (!instrumentName) return;
        fiaApi
            .get(`/live-data/${instrumentName}/traceback`)
            .then((res) => {
                setTraceback(res.data);
                if (res.data && !showTraceback) {
                    setShowTraceback(true);
                }
            })
            .catch((err) => {
                console.error('Error fetching live data traceback:', err);
            });
    }, [instrumentName, showTraceback]);

    useEffect(() => {
        fetchScript();
        fetchTraceback();
    }, [fetchScript, fetchTraceback]);

    const handleSave = async (): Promise<void> => {
        if (!instrumentName) return;

        setSaving(true);
        fiaApi
            .put(`/live-data/${instrumentName}/script`, { value: scriptValue })
            .then(() => {
                setSaveResult({ success: true, message: `Script for ${instrumentName} updated successfully` });
                userModified.current = false;
            })
            .catch((err) => {
                console.error('Failed to update live data script:', err);
                setSaveResult({ success: false, message: `Failed to update script for ${instrumentName}` });
            })
            .finally(() => {
                setSaving(false);
                setSnackbarOpen(true);
                // Clear traceback on save since it might be fixed now
                setTraceback(null);
            });
    };

    return (
        <>
            <NavArrows />
            <Box sx={{ width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, backgroundColor: theme.palette.background.default }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
                            {instrumentName} Live Data Script
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {traceback && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<BugReport />}
                                    onClick={() => setShowTraceback(!showTraceback)}
                                >
                                    {showTraceback ? 'Hide Traceback' : 'Show Traceback'}
                                </Button>
                            )}
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                                onClick={handleSave}
                                disabled={loading || saving}
                                sx={{ minWidth: 120 }}
                            >
                                {saving ? 'Saving...' : 'Save Script'}
                            </Button>
                        </Box>
                    </Box>

                    <Snackbar
                        open={snackbarOpen}
                        autoHideDuration={5000}
                        onClose={(event, reason) => {
                            if (reason !== 'clickaway') {
                                setSnackbarOpen(false);
                            }
                        }}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        {saveResult ? (
                            <Alert
                                onClose={() => setSnackbarOpen(false)}
                                severity={saveResult.success ? 'success' : 'error'}
                                sx={{ width: '100%' }}
                            >
                                {saveResult.message}
                            </Alert>
                        ) : undefined}
                    </Snackbar>
                </Box>

                <Box sx={{ flex: 1, borderTop: 3, borderColor: 'divider', display: 'flex', overflow: 'hidden' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ flex: 1, height: '100%' }}>
                                <Editor
                                    onChange={(newValue) => {
                                        if (newValue !== null) {
                                            setScriptValue(newValue ?? '');
                                            userModified.current = true;
                                        }
                                    }}
                                    height="100%"
                                    defaultLanguage="python"
                                    value={scriptValue}
                                    theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
                                    options={{
                                        minimap: { enabled: true },
                                        fontSize: 14,
                                        automaticLayout: true,
                                    }}
                                />
                            </Box>
                            {traceback && (
                                <Collapse in={showTraceback} orientation="horizontal">
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            width: 500,
                                            height: '100%',
                                            borderLeft: 1,
                                            borderColor: 'divider',
                                            backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f8f8f8',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle2" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <BugReport fontSize="small" /> Traceback
                                            </Typography>
                                            <IconButton size="small" onClick={() => setShowTraceback(false)}>
                                                <ChevronRight />
                                            </IconButton>
                                        </Box>
                                        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
                                            <Typography
                                                variant="body2"
                                                component="pre"
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-all',
                                                    color: theme.palette.error.main,
                                                }}
                                            >
                                                {traceback}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Collapse>
                            )}
                            {!showTraceback && traceback && (
                                <Box
                                    sx={{
                                        borderLeft: 1,
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 0.5,
                                        backgroundColor: theme.palette.background.paper,
                                    }}
                                >
                                    <IconButton size="small" onClick={() => setShowTraceback(true)} color="error">
                                        <ChevronLeft />
                                    </IconButton>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Box>
        </>
    );
};

export default LiveValueEditor;
