import { mount } from 'cypress/react';
import React from 'react';

import Instruments from '../../src/pages/Instruments';

describe('<Instruments />', () => {
  beforeEach(() => {
    mount(<Instruments />);
  });
});
