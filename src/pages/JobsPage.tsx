import { Link, useHistory, useParams } from 'react-router-dom';
import JobTable from '../components/jobs/JobTable';
import { Box, Button, FormControlLabel, SelectChangeEvent, Switch, Typography, useTheme } from '@mui/material';
import { ArrowBack, Settings } from '@mui/icons-material';
import React, { ReactElement, useState } from 'react';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import InstrumentConfigDrawer from '../components/configsettings/InstrumentConfigDrawer';
import { jwtDecode } from 'jwt-decode';
import IMATView from '../components/IMAT/IMATView';

const JobsPage: React.FC = (): ReactElement => {
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const history = useHistory();
  const [selectedInstrument, setSelectedInstrument] = React.useState<string>(instrumentName || 'ALL');
  const theme = useTheme();
  const [currentPage, setCurrentPage] = React.useState<number>(0); // This must be pulled up for navigation
  const [asUser, setAsUser] = useState<boolean>(() => {
    // Whether to display jobs as a user or not
    const storedValue = localStorage.getItem('asUser');
    return storedValue ? JSON.parse(storedValue) : false; // Default to false
  });
  const [userRole, setUserRole] = useState<'staff' | 'user' | null>(null);
  const handleInstrumentChange = (event: SelectChangeEvent<string>): void => {
    const newInstrument = event.target.value;
    setSelectedInstrument(newInstrument);
    history.push(`/reduction-history/${newInstrument}`);
  };
  const getUserRole = (): 'staff' | 'user' | null => {
    const token = localStorage.getItem('scigateway:token');
    if (!token) return null;
    try {
      const decoded = jwtDecode<{ role?: 'staff' | 'user' }>(token);
      return decoded.role || 'user';
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  React.useEffect(() => {
    setSelectedInstrument(instrumentName || 'ALL');
    setCurrentPage(0);
    setUserRole(getUserRole());
  }, [instrumentName, selectedInstrument]);

  const [configDrawerOpen, setConfigDrawerOpen] = React.useState<boolean>(false);
  const showConfigButton = ['LOQ', 'MARI', 'SANS2D', 'VESUVIO', 'OSIRIS', 'IRIS'].includes(selectedInstrument);

  return (
    <div style={{ padding: '20px', height: '100%' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" flexDirection="column">
          <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
            {selectedInstrument} reductions
          </Typography>
          <Box sx={{ height: '24px' }}>
            {selectedInstrument !== 'ALL' && (
              <Typography
                variant="body1"
                component={Link}
                to="/reduction-history/ALL"
                sx={{
                  color: theme.palette.mode === 'dark' ? '#86b4ff' : theme.palette.primary.main,
                  display: 'flex',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                <ArrowBack style={{ marginRight: '4px' }} />
                View reductions for all instruments
              </Typography>
            )}
          </Box>
        </Box>
        <Box display="flex" alignItems="center">
          {userRole === 'staff' && (
            <FormControlLabel
              control={<Switch checked={asUser} onChange={() => setAsUser(!asUser)} color="secondary" />}
              label={
                <Typography variant="body1" color={theme.palette.text.primary}>
                  View as user
                </Typography>
              }
              sx={{ marginRight: '16px' }}
            />
          )}
          <Button
            variant="contained"
            startIcon={<Settings />}
            onClick={() => setConfigDrawerOpen(true)}
            disabled={!showConfigButton}
            sx={{ marginRight: '20px' }}
          >
            Config
          </Button>
          <InstrumentSelector selectedInstrument={selectedInstrument} handleInstrumentChange={handleInstrumentChange} />
        </Box>
      </Box>
      <InstrumentConfigDrawer
        drawerOpen={configDrawerOpen}
        setDrawerOpen={setConfigDrawerOpen}
        selectedInstrument={selectedInstrument}
      />
      {selectedInstrument === 'IMAT' ? (
        <IMATView />
      ) : (
        <JobTable
          selectedInstrument={selectedInstrument}
          currentPage={currentPage}
          handlePageChange={setCurrentPage}
          asUser={asUser}
        />
      )}
    </div>
  );
};

export default JobsPage;
