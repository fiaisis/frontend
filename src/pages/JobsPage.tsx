import { Link, useHistory, useParams } from 'react-router-dom';
import JobTable from '../components/jobs/JobTable';
import { Box, Button, SelectChangeEvent, Typography, useTheme } from '@mui/material';
import { ArrowBack, Settings } from '@mui/icons-material';
import React, { ReactElement } from 'react';
import InstrumentSelector from '../components/jobs/InstrumentSelector';
import InstrumentConfigDrawer from '../components/configsettings/InstrumentConfigDrawer';

const JobsPage: React.FC = (): ReactElement => {
  const { instrumentName } = useParams<{ instrumentName: string }>();
  const history = useHistory();
  const [selectedInstrument, setSelectedInstrument] = React.useState<string>(instrumentName || 'ALL');
  const theme = useTheme();
  const [currentPage, setCurrentPage] = React.useState<number>(0); // This must be pulled up for navigation
  const handleInstrumentChange = (event: SelectChangeEvent<string>): void => {
    const newInstrument = event.target.value;
    setSelectedInstrument(newInstrument);
    history.push(`/reduction-history/${newInstrument}`);
  };

  React.useEffect(() => {
    setSelectedInstrument(instrumentName || 'ALL');
    setCurrentPage(0);
  }, [instrumentName, selectedInstrument]);

  const [configDrawerOpen, setConfigDrawerOpen] = React.useState<boolean>(false);
  const showConfigButton = selectedInstrument === 'LOQ' || selectedInstrument === 'MARI';

  return (
    <div style={{ padding: '20px', height: '100%' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display={'flex'} flexDirection={'column'}>
          <Typography variant="h3" component="h1" style={{ color: theme.palette.text.primary }}>
            {selectedInstrument} Reductions
          </Typography>
          {selectedInstrument !== 'ALL' ? (
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
          ) : null}
        </Box>
        <Box display={'flex'} alignItems={'center'}>
          {showConfigButton && (
            <Button
              variant="contained"
              startIcon={<Settings />}
              onClick={() => setConfigDrawerOpen(true)}
              style={{ marginRight: '20px' }}
            >
              Config
            </Button>
          )}
          <InstrumentSelector selectedInstrument={selectedInstrument} handleInstrumentChange={handleInstrumentChange} />
        </Box>
      </Box>
      <InstrumentConfigDrawer
        drawerOpen={configDrawerOpen}
        setDrawerOpen={setConfigDrawerOpen}
        selectedInstrument={selectedInstrument}
      />
      <JobTable selectedInstrument={selectedInstrument} currentPage={currentPage} handlePageChange={setCurrentPage} />
    </div>
  );
};

export default JobsPage;
