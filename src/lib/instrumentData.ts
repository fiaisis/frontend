export type InstrumentData = {
  id: number;
  name: string;
  description: string;
  type: string;
  techniques?: string[];
  infoPage: string;
  image?: {
    url: string;
    alt: string;
  };
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
    image: {
      url: new URL('../images/instruments/alf.jpg', import.meta.url).href,
      alt: 'The inside of the ALF beamline',
    },
    scientists: ['Helen Walker', 'Russell Ewings'],
  },
  {
    id: 2,
    name: 'ARGUS',
    description:
      'Argus is a general-purpose muon spectrometer for studies of magnetism, superconductivity, charge transport, molecular materials, polymers and semiconductors.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/argus/',
    image: {
      url: new URL('../images/instruments/argus.jpg', import.meta.url).href,
      alt: 'A close-up of the Argus circular detector array',
    },
    scientists: [],
  },
  {
    id: 3,
    name: 'CHIPIR',
    description:
      'ChipIr is a dedicated irradiation facility for testing how electronics respond to high-energy atmospheric neutron radiation.',
    type: 'Irradiation',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/chipir/',
    image: {
      url: new URL('../images/instruments/chipir.jpg', import.meta.url).href,
      alt: 'Electronics testing on the ChipIr beamline',
    },
    scientists: ['Carlo Cazzaniga', 'Christopher Frost', 'Maria Kastriotou'],
  },
  {
    id: 4,
    name: 'CHRONUS',
    description:
      'Chronus is a muon spectrometer in the RIKEN-RAL facility, supporting zero-field, longitudinal-field and transverse-field measurements.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/chronus/',
    image: {
      url: new URL('../images/instruments/chronus.jpg', import.meta.url).href,
      alt: 'The Chronus instrument',
    },
    scientists: [],
  },
  {
    id: 5,
    name: 'CRISP',
    description:
      'Crisp is a neutron reflectometer for high-resolution studies of interfacial phenomena, including liquid surfaces and polarised neutron reflectivity.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/crisp/',
    image: {
      url: new URL('../images/instruments/crisp.jpg', import.meta.url).href,
      alt: 'A close-up of a wavelength-shifting fibre detector',
    },
    scientists: ['Christy Kinane', 'Robert Dalgliesh'],
  },
  {
    id: 6,
    name: 'EMU',
    description:
      'Emu is a muon spectrometer optimised for zero-field and longitudinal-field measurements over a broad sample environment range.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/emu/',
    image: {
      url: new URL('../images/instruments/emu.jpg', import.meta.url).href,
      alt: 'The Emu instrument at ISIS',
    },
    scientists: ['John Wilkinson', 'Koji Yokoyama', 'Stephen Cottrell'],
  },
  {
    id: 7,
    name: 'ENGINX',
    description:
      'Engin-X is an engineering diffraction instrument optimised for strain and residual stress measurements deep within crystalline materials.',
    type: 'Engineering diffraction',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/engin-x/',
    image: {
      url: new URL('../images/instruments/enginx.jpg', import.meta.url).href,
      alt: 'The Engin-X instrument at ISIS',
    },
    scientists: ['Joe Kelleher', 'Ruiyao Zhang', 'Tung Lik Lee'],
  },
  {
    id: 8,
    name: 'GEM',
    description:
      'GEM is a high-intensity, high-resolution neutron diffractometer for studying the structure of disordered materials and crystalline powders.',
    type: 'Crystallography',
    techniques: ['Crystallography', 'Neutron diffraction', 'Total scattering'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/gem/',
    image: {
      url: new URL('../images/instruments/gem.jpg', import.meta.url).href,
      alt: 'The detectors of the GEM instrument at ISIS',
    },
    scientists: ['Alex Hannon', 'Gabriel Perez', 'Ivan da Silva'],
  },
  {
    id: 9,
    name: 'HIFI',
    description:
      'HiFi is a high-field muon instrument providing applied longitudinal fields up to 5 T for condensed matter and molecular studies.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/hifi/',
    image: {
      url: new URL('../images/instruments/hifi.jpg', import.meta.url).href,
      alt: 'The HiFi instrument at ISIS',
    },
    scientists: ['James Lord', 'Koji Yokoyama', 'Mark Telling'],
  },
  {
    id: 10,
    name: 'HRPD',
    description:
      'HRPD is a high-resolution powder diffractometer for precise structural studies of crystalline materials.',
    type: 'Crystallography',
    techniques: ['Crystallography', 'Neutron diffraction'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/hrpd/',
    image: {
      url: new URL('../images/instruments/hrpd.jpg', import.meta.url).href,
      alt: 'Part of the HRPD instrument at ISIS',
    },
    scientists: ['Dominic Fortes'],
  },
  {
    id: 11,
    name: 'IMAT',
    description:
      'IMAT is a neutron imaging and diffraction instrument for non-destructive and in-situ testing across materials science, engineering and cultural heritage.',
    type: 'Engineering diffraction',
    techniques: ['Engineering diffraction', 'Neutron imaging'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/imat/',
    image: {
      url: new URL('../images/instruments/imat.jpg', import.meta.url).href,
      alt: 'The inside of the IMAT blockhouse',
    },
    scientists: ['Ranggi Ramadhan', 'Sylvia Britto', 'Winfried Kockelmann'],
  },
  {
    id: 12,
    name: 'INES',
    description:
      'Ines is a general-purpose diffractometer mainly used for materials characterisation, structure refinement, phase analysis and elemental composition.',
    type: 'Elemental analysis',
    techniques: ['Elemental analysis', 'Neutron diffraction'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/ines/',
    image: {
      url: new URL('../images/instruments/ines.jpg', import.meta.url).href,
      alt: 'A copper statue surrounded by a bank of detectors',
    },
    scientists: ['Antonella Scherillo'],
  },
  {
    id: 13,
    name: 'INTER',
    description:
      'Inter is a high-intensity chemical interfaces reflectometer for air-liquid, liquid-liquid, air-solid and liquid-solid interfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/inter/',
    image: {
      url: new URL('../images/instruments/inter.jpg', import.meta.url).href,
      alt: 'The Inter instrument at ISIS',
    },
    scientists: ['Arwel Hughes', 'Maximilian Skoda', 'Oleksandr Tomchuk'],
  },
  {
    id: 14,
    name: 'IRIS',
    description:
      'Iris is a time-of-flight inverted-geometry crystal analyser spectrometer for quasi-elastic and low-energy high-resolution inelastic spectroscopy.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/iris/',
    image: {
      url: new URL('../images/instruments/iris.jpg', import.meta.url).href,
      alt: 'The Iris instrument at ISIS',
    },
    scientists: ['Ian Silverwood', 'Mona Sarter'],
  },
  {
    id: 15,
    name: 'LARMOR',
    description:
      'Larmor is a flexible instrument using neutron Larmor precession to support small-angle scattering and advanced neutron scattering techniques.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/larmor/',
    image: {
      url: new URL('../images/instruments/larmor.jpg', import.meta.url).href,
      alt: 'The Larmor instrument at ISIS',
    },
    scientists: ['Gregory Smith', 'Robert Dalgliesh', 'Steven Parnell'],
  },
  {
    id: 16,
    name: 'LET',
    description:
      'LET is a cold neutron multi-chopper spectrometer for studying dynamics in condensed matter and the microscopic origins of material properties.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/let/',
    image: {
      url: new URL('../images/instruments/let.jpg', import.meta.url).href,
      alt: 'A user loading a sample into the LET instrument',
    },
    scientists: ['George Wood', 'Ross Stewart'],
  },
  {
    id: 17,
    name: 'LOQ',
    description:
      'LoQ is a small-angle neutron scattering instrument for measuring nanostructure through two-dimensional scattering patterns.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/loq/',
    image: {
      url: new URL('../images/instruments/loq.png', import.meta.url).href,
      alt: 'The LoQ instrument at ISIS',
    },
    scientists: ['Leide Cavalcanti', 'Robert Dalgliesh'],
  },
  {
    id: 18,
    name: 'MAPS',
    description:
      'Maps is a direct-geometry chopper spectrometer designed for measuring excitations in single crystals.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/maps/',
    image: {
      url: new URL('../images/instruments/maps.jpg', import.meta.url).href,
      alt: 'The Maps instrument at ISIS',
    },
    scientists: ['Hamish Cavaye', 'Stewart Parker', 'Travis Williams'],
  },
  {
    id: 19,
    name: 'MARI',
    description:
      'Mari is a chopper spectrometer with wide angular coverage, broad energy range and low background, suited to powders, liquids and phonon studies.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/mari/',
    image: {
      url: new URL('../images/instruments/mari.jpg', import.meta.url).href,
      alt: 'The Mari instrument at ISIS',
    },
    scientists: ['Duc Le', 'Goran Nilsen'],
  },
  {
    id: 20,
    name: 'MERLIN',
    description: 'Merlin is a high count-rate, medium energy-resolution direct-geometry chopper spectrometer.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/merlin/',
    image: {
      url: new URL('../images/instruments/merlin.jpg', import.meta.url).href,
      alt: 'A person standing next to Merlin shielding',
    },
    scientists: ['Devashibhai Adroja', 'Viviane Pecanha Antonio'],
  },
  {
    id: 21,
    name: 'MUSR',
    description: 'MuSR is a general-purpose muon spectrometer with a focus on magnetism and superconductivity.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/musr/',
    image: {
      url: new URL('../images/instruments/musr.jpg', import.meta.url).href,
      alt: 'The MuSR instrument at ISIS',
    },
    scientists: ['Alex Louat', 'Peter Baker', 'Rhea Stewart'],
  },
  {
    id: 36,
    name: 'MUX',
    description:
      'MuX is a negative-muon elemental analysis instrument for non-destructively measuring depth-sensitive elemental composition in cultural heritage objects, biomaterials and energy storage devices.',
    type: 'Elemental analysis',
    techniques: ['Elemental analysis', 'Muon spectroscopy'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/mux/',
    image: {
      url: new URL('../images/instruments/mux.jpg', import.meta.url).href,
      alt: 'A statue surrounded by detectors',
    },
    scientists: ['Adrian Hillier', 'Sayani Biswas'],
  },
  {
    id: 37,
    name: 'NILE',
    description:
      'NILE is a neutron irradiation facility providing well-characterised mono-energetic neutron beams for electronics testing, detector studies and fusion materials research.',
    type: 'Irradiation',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/nile/',
    image: {
      url: new URL('../images/instruments/nile.jpg', import.meta.url).href,
      alt: 'The Nile instrument at ISIS',
    },
    scientists: ['Carlo Cazzaniga', 'Christopher Frost', 'Maria Kastriotou'],
  },
  {
    id: 22,
    name: 'NIMROD',
    description:
      'NIMROD is a total scattering instrument for studying structures from interatomic to mesoscopic length scales.',
    type: 'Total scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/nimrod/',
    image: {
      url: new URL('../images/instruments/nimrod.png', import.meta.url).href,
      alt: 'ISIS users on the Nimrod instrument',
    },
    scientists: ['Tom Headen', 'Tristan Youngs'],
  },
  {
    id: 23,
    name: 'OFFSPEC',
    description:
      'OffSpec is an advanced neutron reflectometer that uses spin-echo methods to study nanometre length scales at interfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/offspec/',
    image: {
      url: new URL('../images/instruments/offspec.jpg', import.meta.url).href,
      alt: 'A disc-shaped sample on the OffSpec instrument',
    },
    scientists: ['Mario Campana', 'Stephen Hall'],
  },
  {
    id: 24,
    name: 'OSIRIS',
    description:
      'Osiris is optimised for very low-energy spectroscopy and long-wavelength diffraction, including studies of relatively slow motions in materials.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/osiris/',
    image: {
      url: new URL('../images/instruments/osiris.png', import.meta.url).href,
      alt: 'The Osiris instrument at ISIS',
    },
    scientists: ['Franz Demmel', 'Sanghamitra Mukhopadhyay'],
  },
  {
    id: 25,
    name: 'PEARL',
    description:
      'Pearl is a high-pressure neutron diffractometer for studying structural changes that occur under applied pressure.',
    type: 'Crystallography',
    techniques: ['Crystallography', 'Neutron diffraction'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/pearl/',
    image: {
      url: new URL('../images/instruments/pearl.jpg', import.meta.url).href,
      alt: 'The Pearl instrument at ISIS',
    },
    scientists: ['Craig Bull', 'Nick Funnell'],
  },
  {
    id: 26,
    name: 'POLARIS',
    description:
      'Polaris is a medium-resolution, high-intensity powder diffractometer for studying materials with neutron diffraction and total scattering.',
    type: 'Crystallography',
    techniques: ['Crystallography', 'Neutron diffraction', 'Total scattering'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/polaris/',
    image: {
      url: new URL('../images/instruments/polaris.jpeg', import.meta.url).href,
      alt: 'The Polaris detector bank',
    },
    scientists: ['Gabriel Perez', 'Helen Playford', 'Paul Henry', 'Ron Smith'],
  },
  {
    id: 27,
    name: 'POLREF',
    description:
      'PolRef is a general-purpose polarised neutron reflectometer for magnetic and non-magnetic buried interfaces and surfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/polref/',
    image: {
      url: new URL('../images/instruments/polref.jpg', import.meta.url).href,
      alt: 'The PolRef instrument',
    },
    scientists: ['Andrew Caruana', 'Christy Kinane'],
  },
  {
    id: 38,
    name: 'RF-MUSR',
    description:
      'RF-muSR is a radio-frequency muon spectroscopy instrument using RF pulses or continuous waves to probe resonant states across a range of sample environments.',
    type: 'Muon spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/rf-musr/',
    image: {
      url: new URL('../images/instruments/rf-musr.jpg', import.meta.url).href,
      alt: 'RF pulse sequence synchronised with muon implantation signals',
    },
    scientists: ['Alex Louat', 'James Lord', 'Stephen Cottrell'],
  },
  {
    id: 28,
    name: 'SANDALS',
    description:
      'SANDALS is a total scattering diffractometer designed for investigating the structure of liquids and amorphous materials.',
    type: 'Total scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/sandals/',
    image: {
      url: new URL('../images/instruments/sandals.jpg', import.meta.url).href,
      alt: 'The SANDALS instrument at ISIS',
    },
    scientists: ['Oliver Alderman', 'Terri-Louise Hughes'],
  },
  {
    id: 29,
    name: 'SANS2D',
    description:
      'SANS2D is a small-angle neutron scattering instrument for studying nanomaterials, soft matter, colloids and biological systems.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/sans2d/',
    image: {
      url: new URL('../images/instruments/sans2d.jpg', import.meta.url).href,
      alt: 'A large green experimental area on SANS2D',
    },
    scientists: ['James Doutch', 'Lauren Matthews', 'Najet Mahmoudi'],
  },
  {
    id: 30,
    name: 'SURF',
    description: 'Surf is a neutron reflectometer optimised for higher flux measurements of liquid surfaces.',
    type: 'Neutron reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/surf/',
    image: {
      url: new URL('../images/instruments/surf.png', import.meta.url).href,
      alt: 'A blue sketch of a leaf',
    },
    scientists: ['Arwel Hughes', 'Mario Campana'],
  },
  {
    id: 31,
    name: 'SXD',
    description:
      'SXD is a single-crystal diffractometer using time-of-flight Laue methods to access large three-dimensional volumes of reciprocal space.',
    type: 'Crystallography',
    techniques: ['Crystallography', 'Neutron diffraction'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/sxd/',
    image: {
      url: new URL('../images/instruments/sxd.jpg', import.meta.url).href,
      alt: 'The SXD sample area',
    },
    scientists: ['Matthias Gutmann', 'Silvia Capelli'],
  },
  {
    id: 32,
    name: 'TOSCA',
    description:
      'Tosca is an indirect-geometry spectrometer optimised for molecular vibration studies in the solid state.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/tosca/',
    image: {
      url: new URL('../images/instruments/tosca.png', import.meta.url).href,
      alt: 'The Tosca instrument at ISIS',
    },
    scientists: ['Jeff Armstrong', 'Svemir Rudic'],
  },
  {
    id: 33,
    name: 'VESUVIO',
    description:
      'Vesuvio is a unique neutron spectrometer using high-energy neutrons to separate spectra into nuclear momentum distributions.',
    type: 'Neutron diffraction',
    techniques: ['Neutron diffraction', 'Neutron spectroscopy'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/vesuvio/',
    image: {
      url: new URL('../images/instruments/vesuvio.jpg', import.meta.url).href,
      alt: 'A scientist at the Vesuvio instrument',
    },
    scientists: ['Andrew Seel', 'Anna Marsicano', 'Matthew Krzystyniak'],
  },
  {
    id: 34,
    name: 'WISH',
    description:
      'WISH is a long-wavelength diffractometer for powder diffraction at long d-spacing in magnetic and large-unit-cell systems.',
    type: 'Crystallography',
    techniques: ['Crystallography', 'Neutron diffraction'],
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/wish/',
    image: {
      url: new URL('../images/instruments/wish.jpg', import.meta.url).href,
      alt: 'The WISH instrument at ISIS',
    },
    scientists: ['Dmitry Khalyavin', 'Fabio Orlandi', 'Pascal Manuel'],
  },
  {
    id: 35,
    name: 'ZOOM',
    description:
      'Zoom is a flexible, high count-rate small-angle scattering instrument complementing LoQ, SANS2D and Larmor.',
    type: 'Small-angle neutron scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/instruments/zoom/',
    image: {
      url: new URL('../images/instruments/zoom.jpg', import.meta.url).href,
      alt: 'The Zoom instrument at ISIS',
    },
    scientists: ['Diego Alba Venero', 'Dirk Honecker', 'Leide Cavalcanti'],
  },
];

export const getInstrumentTechniques = (instrument: InstrumentData): string[] =>
  instrument.techniques && instrument.techniques.length > 0 ? instrument.techniques : [instrument.type];

export const formatInstrumentTechniques = (instrument: InstrumentData): string =>
  getInstrumentTechniques(instrument).join(', ');

export const instrumentHasTechnique = (instrument: InstrumentData, technique: string): boolean =>
  getInstrumentTechniques(instrument).includes(technique);

export const getUniqueInstrumentTechniques = (instrumentOptions: InstrumentData[] = instruments): string[] =>
  Array.from(new Set(instrumentOptions.flatMap(getInstrumentTechniques))).sort((typeA, typeB) =>
    typeA.localeCompare(typeB)
  );

export const VALID_INSTRUMENT_NAMES = instruments.map((instrument) => instrument.name.toUpperCase());

export const isValidInstrument = (name: string | undefined): boolean => {
  if (!name) return false;
  return VALID_INSTRUMENT_NAMES.includes(name.toUpperCase());
};
