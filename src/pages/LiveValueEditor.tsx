// React components
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

// Material UI components
import { Alert, Box, Button, CircularProgress, Snackbar, Typography, useTheme } from '@mui/material';
import { Save } from '@mui/icons-material';

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

    useEffect(() => {
        fetchScript();
    }, [fetchScript]);

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

                <Box sx={{ flex: 1, borderTop: 3, borderColor: 'divider' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : (
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
                    )}
                </Box>
            </Box>
        </>
    );
};

export default LiveValueEditor;
