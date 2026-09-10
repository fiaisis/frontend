import { FormControl, InputLabel, OutlinedInput, Select } from '@mui/material';
import React from 'react';

import InstrumentMenu from './InstrumentMenu';
import { REDUCTION_SUPPORTED_INSTRUMENTS } from '../../lib/instrumentSupport';

interface InstrumentFilterProps {
  selectedInstruments: string[];
  onChange: (instruments: string[]) => void;
}

const InstrumentFilter: React.FC<InstrumentFilterProps> = ({ selectedInstruments, onChange }) => {
  const id = React.useId();
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const menuId = `${id}-menu`;
  const labelId = `${id}-label`;

  return (
    <>
      <FormControl fullWidth size="small">
        <InputLabel id={labelId}>Instruments</InputLabel>
        <Select
          ref={triggerRef}
          id={id}
          labelId={labelId}
          multiple
          value={selectedInstruments}
          input={<OutlinedInput label="Instruments" />}
          renderValue={(selected) => selected.join(', ')}
          // Use the shared instrument menu instead of Select's plain list.
          open={false}
          onOpen={() => setAnchorEl(triggerRef.current)}
          SelectDisplayProps={{
            role: 'button',
            'aria-haspopup': 'menu',
            'aria-expanded': Boolean(anchorEl),
            'aria-controls': anchorEl ? menuId : undefined,
          }}
        />
      </FormControl>
      <InstrumentMenu
        id={menuId}
        labelledBy={labelId}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        multiple
        selectedInstruments={selectedInstruments}
        onSelectInstrument={(instrument) =>
          onChange(
            selectedInstruments.includes(instrument)
              ? selectedInstruments.filter((selected) => selected !== instrument)
              : [...selectedInstruments, instrument]
          )
        }
        support={{ page: 'reduction-history', instruments: REDUCTION_SUPPORTED_INSTRUMENTS }}
      />
    </>
  );
};

export default InstrumentFilter;
