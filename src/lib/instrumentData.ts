export type InstrumentData = {
  id: number; // A unique identifier for the instrument
  name: string; // The name of the instrument
  description: string; // A detailed description of the instrument
  type: string; // The type or category the instrument belongs to
  infoPage: string; // A URL linking to more information about the instrument
  scientists: string[]; // An array of scientists who work on the instrument
};

// An array of instrument objects
// Each object should conform to the structure defined in InstrumentData
export const instruments: InstrumentData[] = [
  {
    id: 1,
    name: 'ALF',
    description:
      'ALF is an alignment facility for single crystals. Our aim is to provide a quick, intuitive, rapid access facility for the alignment and assessment of single crystals for users of the main ISIS excitation instruments.',
    type: 'Excitations',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/ALF.aspx',
    scientists: ['Russell Ewings', 'Helen Walker'],
  },
  {
    id: 2,
    name: 'ARGUS',
    description:
      'A muon spectrometer for condensed matter and molecular studies. The muon instrument Argus (Advanced Riken General-purpose mUsr Spectrometer) is housed in Port 2 of the RIKEN-RAL Muon Facility. It can be used for a wide variety of studies in the areas of magnetism, superconductivity, charge transport, molecular and polymeric materials and semiconductors.',
    type: 'Muon spectrometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/ARGUS.aspx',
    scientists: ['Adam Berlie', 'Francis Pratt', 'Isao Watanabe'],
  },
  {
    id: 3,
    name: 'CHIPIR',
    description:
      'Chipir is one of the first dedicated facilities outside of the US to look at how silicon microchips respond to cosmic neutron radiation. The instrument offers users the ability to perform electronics testing at highly accelerated rate with a measurement of just one hour being equivalent to exposing microchips to high-energy neutrons for hundreds to thousands of years in the real environment. Such accelerated atmospheric neutron testing is designed to mimic the real disruptions and failure, the so-called ‘single event effects’ experienced by electronics, and allow industry to develop strategies, designs and methods to mitigate their effects.',
    type: 'Chip irradiation',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/Chip-Irradiation-.aspx',
    scientists: ['Carlo Cazzaniga', 'Christopher Frost', 'Maria Kastriotou'],
  },
  {
    id: 4,
    name: 'CHRONUS',
    description:
      'CHRONUS is one of the suite of muon instruments at ISIS and was built by RIKEN. The spectrometer is located in Port 4 of the RIKEN-RAL facility. CHRONUS has 606 detectors and can be used for both zero field and longitudinal field experiments. Longitudinal fields of up to 3950 G can be applied making it similar to EMU. In addition the spectrometer can also be rotated allowing one to also perform high transverse field experiments, however this is still under development. There are a wide range of sample environment that ranges from 0.3 to 500K.',
    type: 'Muon spectrometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/CHRONUS.aspx',
    scientists: ['Adam Berlie', 'Francis Pratt', 'Isao Watanabe'],
  },
  {
    id: 5,
    name: 'CRISP',
    description:
      'CRISP Reflectometer. CRISP is one of five Neutron Reflectometers (NR) at ISIS. It is the original instrument and was designed for high resolution studies of a wide range of interfacial phenomena. The instrument is highly automated, allowing reproducible measurements to be made with high precision, and the sample geometry is horizontal to facilitate the study of liquid surfaces. CRISP, unlike its sister instrument SURF, can also perform polarised neutron reflectivity (PNR) measurements with full polarisation analysis. There is also overhead crane access for the installation of large items of sample environment.',
    type: 'Reflectometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/Crisp.aspx',
    scientists: ['Robert Dalgiesh', 'Christy Kinane'],
  },
  {
    id: 6,
    name: 'EMU',
    description:
      'EMU is a new 96-detector µSR spectrometer which is optimised for zero field and longitudinal field measurements. Fields of up to 4500 G can be applied (this can be extended to 5000G if required), and sample temperatures in the range of 50mK to 1500K can be produced using a variety of sample environment equipment.',
    type: 'Muon spectrometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/EMU.aspx',
    scientists: ['Stephen Cottrell', 'John Wilkinson'],
  },
  {
    id: 7,
    name: 'ENGINX',
    description:
      "ENGIN-X is a dedicated engineering science facility at ISIS. The beamline is optimized for the measurement of strain, and thus stress, deep within a crystalline material, using the atomic lattice planes as an atomic 'strain gauge'. Internal and residual stresses in materials have a considerable effect on material properties, including fatigue resistance, fracture toughness and strength.",
    type: 'Diffractometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/Engin-X.aspx',
    scientists: ['Saurabh Kabra', 'Joe Kelleher', 'Tung Lik Lee'],
  },
  {
    id: 8,
    name: 'GEM',
    description:
      'GEM The General Materials Diffractometer is a new generation neutron diffractometer recently constructed at the ISIS pulsed neutron source. GEM can be used to perform high intensity, high resolution experiments to study the structure of disordered materials and crystalline powders.',
    type: 'Crystallography diffractometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/GEM.aspx',
    scientists: ['Ivan da Silva', 'Alex Hannon', 'David Keen', 'Gabriel Perez'],
  },
  {
    id: 9,
    name: 'HIFI',
    description:
      'The new high-field muon instrument at ISIS, called HiFi, provides applied longitudinal fields up to 5 T. The magnet is a 5 T superconducting split-pair, with high field homogeneity over the sample volume and actively compensated stray field. It has additional z-axis coils up to 400 G for small changes to the main field (for example, for sweeping through level crossing resonances) as well as 150 G x- and y-axis transverse coils for calibration measurements, etc.',
    type: 'Muon spectrometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/HiFi.aspx',
    scientists: ['James Lord', 'Mark Telling', 'Koji Yokoyama'],
  },
  {
    id: 10,
    name: 'HRPD',
    description:
      'HRPD, the High Resolution Powder Diffractometer, is the highest resolution neutron powder diffractometer of its type in the world.',
    type: 'Crystallography diffractometer',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/HRPD.aspx',
    scientists: ['Sacha Fop', 'Dominic Fortes', 'Alexandra Gibbs', 'Paul Henry'],
  },
  {
    id: 11,
    name: 'IMAT',
    description:
      'IMAT (Imaging and Materials Science & Engineering) is a neutron imaging and diffraction instrument for studies in a broad range of materials sciences. Non-destructive and in-situ testing of materials using neutrons is advantageous in many areas such as engineering science, battery research, earth science, cultural heritage and plant science.',
    type: 'Imaging',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/IMAT.aspx',
    scientists: ['Winfried Kockelmann', 'Ranggi Ramadhan'],
  },
  {
    id: 12,
    name: 'INES',
    description:
      'INES is a general purpose diffractometer and is mainly devoted to materials characterisation (structure refinement, phase and elemental composition analysis).',
    type: 'Neutron diffraction',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/INES.aspx',
    scientists: ['Scherillo Antonella'],
  },
  {
    id: 13,
    name: 'INTER',
    description:
      'High-intensity chemical interfaces reflectometer offering a unique facility for the study of a range of air/liquid, liquid/liquid, air/solid, and liquid/solid interfaces.',
    type: 'Reflectometry',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/INTER.aspx',
    scientists: ['Maximilian Skoda', 'Becky Welbourn'],
  },
  {
    id: 14,
    name: 'IRIS',
    description:
      'IRIS is a time-of-flight inverted-geometry crystal analyser spectrometer designed for quasi-elastic and low-energy high resolution inelastic spectroscopy.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/IRIS.aspx',
    scientists: ['Franz Demmel', ' Victoria Garcia Sakai', 'Sanghamitra Mukhopadhyay', 'Mona Sarter'],
  },
  {
    id: 15,
    name: 'LARMOR',
    description:
      'Larmor is a flexible instrument that has been optimised for the development of new neutron scattering techniques which use the Larmor precession of neutrons to encode energy or direction.',
    type: 'Small angle scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/LARMOR.aspx',
    scientists: ['Robert Dalgiesh', 'Dirk Honecker', 'Greg Smith'],
  },
  {
    id: 16,
    name: 'LET',
    description:
      'LET is a cold neutron multi-chopper spectrometer for the study of dynamics in condensed matter to understand the microscopic origin of material properties.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/LET.aspx',
    scientists: ['Christain Balz', 'Victorian Garcia Sakai', 'Ross Steward'],
  },
  {
    id: 17,
    name: 'LOQ',
    description:
      'LOQ is a relatively simple instrument, consisting of an 11-metre evacuated beamline down which neutrons fly towards the sample. After being scattered by the sample, they hit a fixed two-dimensional detector 4 metres away, which can detect the positions and times of arrival of the neutrons. The resulting pattern is analysed to provide information on the nanostructure of the sample.',
    type: 'Small angle scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/LOQ.aspx',
    scientists: ['Stephen King'],
  },
  {
    id: 18,
    name: 'MAPS',
    description:
      'MAPS has been in operation since 2000. It was the first chopper spectrometer to employ a large array of position sensitive detectors, and the first to be designed solely for the purpose of measuring excitations in single crystals.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/MAPS.aspx',
    scientists: ['Hamish Cavaye', 'Stewart Parker', 'Aleksadra Krajewska', 'Helen Walker'],
  },
  {
    id: 19,
    name: 'MARI',
    description:
      'MARI is a chopper spectrometer with continuous detector bank coverage ranging from 3° to 134° degrees. MARI has a wide angular coverage and a wide energy range and good resolution making it ideal for the study of phonon densities of states in crystalline and disordered systems, and crystal field excitations in magnetic materials. MARI is the only chopper spectrometer at ISIS not to be equipped with a pixilated detector array using position sensitive detectors. This makes MARI the instrument of choice for studies of polycrystalline and powdered samples, and liquids. MARI also boasts the lowest instrumental background of the ISIS suite of chopper spectrometers, making the machine highly sensitive despite the relatively low incident neutron flux.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/MARI.aspx',
    scientists: ['Mohamed Aouane', 'Duc Le'],
  },
  {
    id: 20,
    name: 'MERLIN',
    description: 'Merlin is a high count rate, medium energy resolution, direct geometry chopper spectrometer.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/MERLIN.aspx',
    scientists: ['Devashibhai Adroja', 'David Voneshen'],
  },
  {
    id: 21,
    name: 'MUSR',
    description:
      'The MuSR spectrometer is a general purpose instrument. However, the emphasis of the experimental work conducted is investigating magnetism and superconductivity.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/MUSR.aspx',
    scientists: ['Peter Baker'],
  },
  {
    id: 22,
    name: 'NIMROD',
    description:
      'NIMROD is a total scattering instrument designed to access length scales ranging from the interatomic (< 1 Å) through to the mesoscopic (>300 Å).',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/NIMROD.aspx',
    scientists: ['Tom Headen', 'Tristan Youngs'],
  },
  {
    id: 23,
    name: 'OFFSPEC',
    description:
      'Offspec is an advanced reflectometer giving access to nanometre length scales parallel and perpendicular to interfaces. It uses the technique of neutron spin-echo to encode the path that neutrons take through the instrument.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/OFFSPEC.aspx',
    scientists: ['Stephen Hall'],
  },
  {
    id: 24,
    name: 'OSIRIS',
    description:
      'OSIRIS is a spectrometer optimised for very low energy studies and long wavelength diffraction. These studies can provide information on relatively slow motions in materials such as diffusion in liquids and the movement of protons in batteries.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/OSIRIS.aspx',
    scientists: ['Franz Demmel', 'Sanghamitra Mukhopadhyay', 'Victoria Garcia Sakai', 'Mona Sarter'],
  },
  {
    id: 25,
    name: 'PEARL',
    description:
      'The application of pressure can induce dramatic changes in the physical properties of materials. The PEARL diffractometer is optimised for studies of the structural changes that occur under high pressure.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/PEARL.aspx',
    scientists: ['Craig Bull', 'Nick Funnell', 'Christopher Ridley'],
  },
  {
    id: 26,
    name: 'POLARIS',
    description:
      'Larmor is a flexible instrument that has been optimised for the development of new neutron scattering techniques which use the Larmor precession of neutrons to encode energy or direction.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/POLARIS.aspx',
    scientists: ['Paul Henry', 'Ron Smith', 'Gabriel Perez'],
  },
  {
    id: 27,
    name: 'POLREF',
    description:
      'POLREF is a general purpose polarised neutron reflectometer designed for the study of magnetic and non-magnetic buried interfaces and surfaces.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/POLREF.aspx',
    scientists: ['Andrew Caruana', 'Christy Kinane'],
  },
  {
    id: 28,
    name: 'SANDALS',
    description:
      'SANDALS is a diffractometer especially built for investigating the structure of liquids and amorphous materials.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/SANDALS.aspx',
    scientists: ['Oliver Alderman', 'Terri-Louise Hughes', 'Daniel Bowron'],
  },
  {
    id: 29,
    name: 'SANS2D',
    description:
      'Sans2d can be used to examine size, shape, internal structure and spatial arrangement in nanomaterials, ‘soft matter’, and colloidal systems, including those of biological origin, on length scales of between* 0.25-300 nm.',
    type: 'Small angle scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/SANS2D.aspx',
    scientists: ['Sarah Rogers', 'Najet Mahmoudi', 'Leide Cavalcanti'],
  },
  {
    id: 30,
    name: 'SURF',
    description:
      'SURF is the newer of the two Neutron Reflectometers (NR) at ISIS. Compared to its sister instrument CRISP, SURF is optimised for higher flux. With horizontal sample geometry it is therefore ideally suited for the study of liquid surfaces.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/SURF.aspx',
    scientists: ['Mario Campana', 'Arwel Hughes'],
  },
  {
    id: 31,
    name: 'SXD',
    description:
      'SXD, the Single Crystal Diffractometer, uses the time-of-flight Laue technique to access large 3-D volumes of reciprocal space in a single measurement. This makes SXD especially powerful in applications involving surveys of reciprocal space, such as phase transitions and incommensurate structures, and also in applications where sample orientation may be restricted.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/SXD.aspx',
    scientists: ['Silvia Capelli', 'Matthias Gutmann'],
  },
  {
    id: 32,
    name: 'TOSCA',
    description:
      'TOSCA is an indirect geometry spectrometer optimised for the study of molecular vibrations in the solid state.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/TOSCA.aspx',
    scientists: ['Jeff Armstrong', 'Svemir Rudic', 'Stewart Parker'],
  },
  {
    id: 33,
    name: 'VESUVIO',
    description:
      'Vesuvio is a unique neutron spectrometer, which uses the high intensity of neutrons in the eV energy range (epi-thermal neutrons) to mass-separate the spectra into a collection of nuclear momentum distributions.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/VESUVIO.aspx',
    scientists: ['Matthew Krzystyniak', 'Andrew Seel'],
  },
  {
    id: 34,
    name: 'WISH',
    description:
      'WISH is a long-wavelength diffractometer primarily designed for powder diffraction at long d-spacing in magnetic and large unit-cell systems. The instrument is also suitable for measuring single-crystals.',
    type: 'Neutron spectroscopy',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/WISH.aspx',
    scientists: ['Dmitry Khalyavin', 'Fabio Orlandi', 'Pascal Manuel'],
  },
  {
    id: 35,
    name: 'ZOOM',
    description:
      'Zoom is a flexible, high count rate small-angle scattering instrument. This instruments complements Loq, SANS2D and Larmor, with the main focus in biological systems and magnetic materials.',
    type: 'Small angle scattering',
    infoPage: 'https://www.isis.stfc.ac.uk/Pages/ZOOM.aspx',
    scientists: ['Diego Alba Venero', 'James Doutch'],
  },
];
// Export a list of all valid instrument names in uppercase for validation
export const VALID_INSTRUMENT_NAMES = instruments.map((inst) => inst.name.toUpperCase());

/**
 * Validates whether a given instrument name is in the list of valid ISIS instruments.
 * @param name - The instrument name to validate.
 * @returns True if the instrument is valid, false otherwise.
 */
export const isValidInstrument = (name: string | undefined): boolean => {
  if (!name) return false;
  return VALID_INSTRUMENT_NAMES.includes(name.toUpperCase());
};
