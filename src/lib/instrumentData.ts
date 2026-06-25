export type InstrumentData = {
  id: number;
  name: string;
  description: string;
  type: string;
  infoPage: string;
  scientists: string[];
};

export const instruments: InstrumentData[] = [
  {
    id: 1,
    name: 'ALF',
    description:
      'ALF is an alignment facility for single crystals, providing a quick route to assess and align samples for experiments on other ISIS instruments.',
    type: 'Neutron diffraction',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/alf/',
    scientists: ['Helen Walker', 'Russell Ewings'],
  },
  {
    id: 2,
    name: 'ARGUS',
    description:
      'Argus is a general-purpose muon spectrometer for studies of magnetism, superconductivity, charge transport, molecular materials, polymers and semiconductors.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/argus/',
    scientists: [],
  },
  {
    id: 3,
    name: 'CHIPIR',
    description:
      'ChipIr is a dedicated irradiation facility for testing how electronics respond to high-energy atmospheric neutron radiation.',
    type: 'Irradiation',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/chipir/',
    scientists: ['Carlo Cazzaniga', 'Christopher Frost', 'Maria Kastriotou'],
  },
  {
    id: 4,
    name: 'CHRONUS',
    description:
      'Chronus is a muon spectrometer in the RIKEN-RAL facility, supporting zero-field, longitudinal-field and transverse-field measurements.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/chronus/',
    scientists: [],
  },
  {
    id: 5,
    name: 'CRISP',
    description:
      'Crisp is a neutron reflectometer for high-resolution studies of interfacial phenomena, including liquid surfaces and polarised neutron reflectivity.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/crisp/',
    scientists: ['Christy Kinane', 'Robert Dalgliesh'],
  },
  {
    id: 6,
    name: 'EMU',
    description:
      'Emu is a muon spectrometer optimised for zero-field and longitudinal-field measurements over a broad sample environment range.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/emu/',
    scientists: ['John Wilkinson', 'Koji Yokoyama', 'Stephen Cottrell'],
  },
  {
    id: 7,
    name: 'ENGINX',
    description:
      'Engin-X is an engineering diffraction instrument optimised for strain and residual stress measurements deep within crystalline materials.',
    type: 'Engineering diffraction',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/engin-x/',
    scientists: ['Joe Kelleher', 'Ruiyao Zhang', 'Tung Lik Lee'],
  },
  {
    id: 8,
    name: 'GEM',
    description:
      'GEM is a high-intensity, high-resolution neutron diffractometer for studying the structure of disordered materials and crystalline powders.',
    type: 'Crystallography',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/gem/',
    scientists: ['Alex Hannon', 'Gabriel Perez', 'Ivan da Silva'],
  },
  {
    id: 9,
    name: 'HIFI',
    description:
      'HiFi is a high-field muon instrument providing applied longitudinal fields up to 5 T for condensed matter and molecular studies.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/hifi/',
    scientists: ['James Lord', 'Koji Yokoyama', 'Mark Telling'],
  },
  {
    id: 10,
    name: 'HRPD',
    description:
      'HRPD is a high-resolution powder diffractometer for precise structural studies of crystalline materials.',
    type: 'Crystallography',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/hrpd/',
    scientists: ['Dominic Fortes'],
  },
  {
    id: 11,
    name: 'IMAT',
    description:
      'IMAT is a neutron imaging and diffraction instrument for non-destructive and in-situ testing across materials science, engineering and cultural heritage.',
    type: 'Engineering diffraction',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/imat/',
    scientists: ['Ranggi Ramadhan', 'Sylvia Britto', 'Winfried Kockelmann'],
  },
  {
    id: 12,
    name: 'INES',
    description:
      'Ines is a general-purpose diffractometer mainly used for materials characterisation, structure refinement, phase analysis and elemental composition.',
    type: 'Elemental analysis',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/ines/',
    scientists: ['Antonella Scherillo'],
  },
  {
    id: 13,
    name: 'INTER',
    description:
      'Inter is a high-intensity chemical interfaces reflectometer for air-liquid, liquid-liquid, air-solid and liquid-solid interfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/inter/',
    scientists: ['Arwel Hughes', 'Maximilian Skoda', 'Oleksandr Tomchuk'],
  },
  {
    id: 14,
    name: 'IRIS',
    description:
      'Iris is a time-of-flight inverted-geometry crystal analyser spectrometer for quasi-elastic and low-energy high-resolution inelastic spectroscopy.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/iris/',
    scientists: ['Ian Silverwood', 'Mona Sarter'],
  },
  {
    id: 15,
    name: 'LARMOR',
    description:
      'Larmor is a flexible instrument using neutron Larmor precession to support small-angle scattering and advanced neutron scattering techniques.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/larmor/',
    scientists: ['Gregory Smith', 'Robert Dalgliesh', 'Steven Parnell'],
  },
  {
    id: 16,
    name: 'LET',
    description:
      'LET is a cold neutron multi-chopper spectrometer for studying dynamics in condensed matter and the microscopic origins of material properties.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/let/',
    scientists: ['George Wood', 'Ross Stewart'],
  },
  {
    id: 17,
    name: 'LOQ',
    description:
      'LoQ is a small-angle neutron scattering instrument for measuring nanostructure through two-dimensional scattering patterns.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/loq/',
    scientists: ['Leide Cavalcanti', 'Robert Dalgliesh'],
  },
  {
    id: 18,
    name: 'MAPS',
    description:
      'Maps is a direct-geometry chopper spectrometer designed for measuring excitations in single crystals.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/maps/',
    scientists: ['Hamish Cavaye', 'Stewart Parker', 'Travis Williams'],
  },
  {
    id: 19,
    name: 'MARI',
    description:
      'Mari is a chopper spectrometer with wide angular coverage, broad energy range and low background, suited to powders, liquids and phonon studies.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/mari/',
    scientists: ['Duc Le', 'Goran Nilsen'],
  },
  {
    id: 20,
    name: 'MERLIN',
    description: 'Merlin is a high count-rate, medium energy-resolution direct-geometry chopper spectrometer.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/merlin/',
    scientists: ['Devashibhai Adroja', 'Viviane Pecanha Antonio'],
  },
  {
    id: 21,
    name: 'MUSR',
    description: 'MuSR is a general-purpose muon spectrometer with a focus on magnetism and superconductivity.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/musr/',
    scientists: ['Alex Louat', 'Peter Baker', 'Rhea Stewart'],
  },
  {
    id: 36,
    name: 'MUX',
    description:
      'MuX is a negative-muon elemental analysis instrument for non-destructively measuring depth-sensitive elemental composition in cultural heritage objects, biomaterials and energy storage devices.',
    type: 'Elemental analysis',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/mux/',
    scientists: ['Adrian Hillier', 'Sayani Biswas'],
  },
  {
    id: 37,
    name: 'NILE',
    description:
      'NILE is a neutron irradiation facility providing well-characterised mono-energetic neutron beams for electronics testing, detector studies and fusion materials research.',
    type: 'Irradiation',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/nile/',
    scientists: ['Carlo Cazzaniga', 'Christopher Frost', 'Maria Kastriotou'],
  },
  {
    id: 22,
    name: 'NIMROD',
    description:
      'NIMROD is a total scattering instrument for studying structures from interatomic to mesoscopic length scales.',
    type: 'Total scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/nimrod/',
    scientists: ['Tom Headen', 'Tristan Youngs'],
  },
  {
    id: 23,
    name: 'OFFSPEC',
    description:
      'OffSpec is an advanced neutron reflectometer that uses spin-echo methods to study nanometre length scales at interfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/offspec/',
    scientists: ['Mario Campana', 'Stephen Hall'],
  },
  {
    id: 24,
    name: 'OSIRIS',
    description:
      'Osiris is optimised for very low-energy spectroscopy and long-wavelength diffraction, including studies of relatively slow motions in materials.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/osiris/',
    scientists: ['Franz Demmel', 'Sanghamitra Mukhopadhyay'],
  },
  {
    id: 25,
    name: 'PEARL',
    description:
      'Pearl is a high-pressure neutron diffractometer for studying structural changes that occur under applied pressure.',
    type: 'Crystallography',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/pearl/',
    scientists: ['Craig Bull', 'Nick Funnell'],
  },
  {
    id: 26,
    name: 'POLARIS',
    description:
      'Polaris is a medium-resolution, high-intensity powder diffractometer for studying materials with neutron diffraction and total scattering.',
    type: 'Crystallography',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/polaris/',
    scientists: ['Gabriel Perez', 'Helen Playford', 'Paul Henry', 'Ron Smith'],
  },
  {
    id: 27,
    name: 'POLREF',
    description:
      'PolRef is a general-purpose polarised neutron reflectometer for magnetic and non-magnetic buried interfaces and surfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/polref/',
    scientists: ['Andrew Caruana', 'Christy Kinane'],
  },
  {
    id: 38,
    name: 'RF-MUSR',
    description:
      'RF-muSR is a radio-frequency muon spectroscopy instrument using RF pulses or continuous waves to probe resonant states across a range of sample environments.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/rf-musr/',
    scientists: ['Alex Louat', 'James Lord', 'Stephen Cottrell'],
  },
  {
    id: 28,
    name: 'SANDALS',
    description:
      'SANDALS is a total scattering diffractometer designed for investigating the structure of liquids and amorphous materials.',
    type: 'Total scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/sandals/',
    scientists: ['Oliver Alderman', 'Terri-Louise Hughes'],
  },
  {
    id: 29,
    name: 'SANS2D',
    description:
      'SANS2D is a small-angle neutron scattering instrument for studying nanomaterials, soft matter, colloids and biological systems.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/sans2d/',
    scientists: ['James Doutch', 'Lauren Matthews', 'Najet Mahmoudi'],
  },
  {
    id: 30,
    name: 'SURF',
    description: 'Surf is a neutron reflectometer optimised for higher flux measurements of liquid surfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/surf/',
    scientists: ['Arwel Hughes', 'Mario Campana'],
  },
  {
    id: 31,
    name: 'SXD',
    description:
      'SXD is a single-crystal diffractometer using time-of-flight Laue methods to access large three-dimensional volumes of reciprocal space.',
    type: 'Crystallography',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/sxd/',
    scientists: ['Matthias Gutmann', 'Silvia Capelli'],
  },
  {
    id: 32,
    name: 'TOSCA',
    description:
      'Tosca is an indirect-geometry spectrometer optimised for molecular vibration studies in the solid state.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/tosca/',
    scientists: ['Jeff Armstrong', 'Svemir Rudic'],
  },
  {
    id: 33,
    name: 'VESUVIO',
    description:
      'Vesuvio is a unique neutron spectrometer using high-energy neutrons to separate spectra into nuclear momentum distributions.',
    type: 'Neutron diffraction',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/vesuvio/',
    scientists: ['Andrew Seel', 'Anna Marsicano', 'Matthew Krzystyniak'],
  },
  {
    id: 34,
    name: 'WISH',
    description:
      'WISH is a long-wavelength diffractometer for powder diffraction at long d-spacing in magnetic and large-unit-cell systems.',
    type: 'Crystallography',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/wish/',
    scientists: ['Dmitry Khalyavin', 'Fabio Orlandi', 'Pascal Manuel'],
  },
  {
    id: 35,
    name: 'ZOOM',
    description:
      'Zoom is a flexible, high count-rate small-angle scattering instrument complementing LoQ, SANS2D and Larmor.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/zoom/',
    scientists: ['Diego Alba Venero', 'Dirk Honecker', 'Leide Cavalcanti'],
  },
];

export const VALID_INSTRUMENT_NAMES = instruments.map((instrument) => instrument.name.toUpperCase());

export const isValidInstrument = (name: string | undefined): boolean => {
  if (!name) return false;
  return VALID_INSTRUMENT_NAMES.includes(name.toUpperCase());
};
