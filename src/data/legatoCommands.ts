import { SyringePreset } from '../types';

export interface PumpCommand {
  command: string;
  syntax: string;
  category: 'motion' | 'rate' | 'volume' | 'syringe' | 'continuous' | 'query' | 'system';
  description: string;
  example: string;
  response: string;
  notes: string;
}

export const LEGATO_COMMANDS: PumpCommand[] = [
  {
    command: 'IRUN / RUN',
    syntax: 'irun  or  run',
    category: 'motion',
    description: 'Starts the pump running in the Infuse (forward push) direction.',
    example: 'irun',
    response: '<LF>00:>',
    notes: 'In continuous push-pull operation, this pushes syringe group A while withdrawing syringe group B.'
  },
  {
    command: 'WRUN',
    syntax: 'wrun',
    category: 'motion',
    description: 'Starts the pump running in the Withdraw (pull/reverse) direction.',
    example: 'wrun',
    response: '<LF>00:<',
    notes: 'Pulls syringe group A while infusing syringe group B.'
  },
  {
    command: 'STOP / STP',
    syntax: 'stop  or  stp',
    category: 'motion',
    description: 'Halts the motor immediately. Can be issued at any time.',
    example: 'stop',
    response: '<LF>00::',
    notes: 'Returns prompt character : indicating stopped.'
  },
  {
    command: 'PAUSE',
    syntax: 'pause',
    category: 'motion',
    description: 'Pauses the currently executing operation without clearing target or counters.',
    example: 'pause',
    response: '<LF>00:*',
    notes: 'Prompt turns to * (paused). Use restart to continue.'
  },
  {
    command: 'RESTART',
    syntax: 'restart',
    category: 'motion',
    description: 'Resumes pumping following a pause command.',
    example: 'restart',
    response: '<LF>00:>',
    notes: 'Resumes at the same rate and target progress as before the pause.'
  },
  {
    command: 'IRATE',
    syntax: 'irate [<value> <units> | ?]',
    category: 'rate',
    description: 'Sets or queries the infusion flow rate and units.',
    example: 'irate 2.5 ml/min',
    response: '<LF>00:2.5 ml/min<LF>00::',
    notes: 'Units: ml/min, ml/hr, ul/min, ul/hr, nl/min, nl/hr'
  },
  {
    command: 'WRATE',
    syntax: 'wrate [<value> <units> | ?]',
    category: 'rate',
    description: 'Sets or queries the withdrawal/refill flow rate and units.',
    example: 'wrate 5.0 ml/min',
    response: '<LF>00:5.0 ml/min<LF>00::',
    notes: 'Can be configured to match or exceed the infusion rate.'
  },
  {
    command: 'TVOLUME',
    syntax: 'tvolume [<value> <units> | ?]',
    category: 'volume',
    description: 'Sets or queries the target dispense volume. Pump stops or signals when reached.',
    example: 'tvolume 10 ml',
    response: '<LF>00:10 ml<LF>00::',
    notes: 'When target volume is reached, status prompt changes to T*.'
  },
  {
    command: 'CTVOLUME',
    syntax: 'ctvolume',
    category: 'volume',
    description: 'Clears the target volume, allowing the pump to run continuously until stopped.',
    example: 'ctvolume',
    response: '<LF>00::',
    notes: 'Essential for continuous push/pull cycling mode.'
  },
  {
    command: 'IVOLUME',
    syntax: 'ivolume [?]',
    category: 'volume',
    description: 'Queries the actual accumulated volume infused since last reset.',
    example: 'ivolume',
    response: '<LF>00:4.832 ml<LF>00::',
    notes: 'Useful for tracking live delivered volume over time.'
  },
  {
    command: 'WVOLUME',
    syntax: 'wvolume [?]',
    category: 'volume',
    description: 'Queries the actual accumulated volume withdrawn since last reset.',
    example: 'wvolume',
    response: '<LF>00:4.832 ml<LF>00::',
    notes: 'Tracks volume pulled during the refill phase.'
  },
  {
    command: 'CVOLUME',
    syntax: 'cvolume',
    category: 'volume',
    description: 'Clears the accumulated volume accumulators.',
    example: 'cvolume',
    response: '<LF>00::',
    notes: 'Resets counters to 0.'
  },
  {
    command: 'DIAMETER',
    syntax: 'diameter [<value_in_mm> | ?]',
    category: 'syringe',
    description: 'Sets or queries the syringe inside diameter in millimeters.',
    example: 'diameter 14.5',
    response: '<LF>00:14.500 mm<LF>00::',
    notes: 'Direct inner diameter setting.'
  },
  {
    command: 'FORCE',
    syntax: 'force [<percentage> | ?]',
    category: 'system',
    description: 'Sets maximum motor linear force percentage (20% to 100%).',
    example: 'force 100',
    response: '<LF>00:100%<LF>00::',
    notes: 'Useful to prevent crushing delicate glass syringes.'
  },
  {
    command: 'BAUD',
    syntax: 'baud [<rate> | ?]',
    category: 'system',
    description: 'Sets or queries the serial baud rate (9600, 19200, 38400, 57600, 115200).',
    example: 'baud 115200',
    response: '<LF>00:115200<LF>00::',
    notes: 'Requires reconnecting if changed.'
  },
  {
    command: 'POLL',
    syntax: 'poll',
    category: 'query',
    description: 'Fast status poll returning pump address and prompt character.',
    example: 'poll',
    response: '<LF>00:>',
    notes: 'Minimal overhead status query.'
  }
];

export const SYRINGE_PRESETS: SyringePreset[] = [
  { brand: 'BD Plastic (Luer-Lok)', size: '1 ml', volumeUl: 1000, diameterMm: 4.78 },
  { brand: 'BD Plastic (Luer-Lok)', size: '3 ml', volumeUl: 3000, diameterMm: 8.66 },
  { brand: 'BD Plastic (Luer-Lok)', size: '5 ml', volumeUl: 5000, diameterMm: 12.06 },
  { brand: 'BD Plastic (Luer-Lok)', size: '10 ml', volumeUl: 10000, diameterMm: 14.50 },
  { brand: 'BD Plastic (Luer-Lok)', size: '20 ml', volumeUl: 20000, diameterMm: 19.13 },
  { brand: 'BD Plastic (Luer-Lok)', size: '30 ml', volumeUl: 30000, diameterMm: 21.70 },
  { brand: 'BD Plastic (Luer-Lok)', size: '60 ml', volumeUl: 60000, diameterMm: 26.70 },
  { brand: 'BD Glass (Multifit)', size: '5 ml', volumeUl: 5000, diameterMm: 11.70 },
  { brand: 'BD Glass (Multifit)', size: '10 ml', volumeUl: 10000, diameterMm: 14.70 },
  { brand: 'BD Glass (Multifit)', size: '20 ml', volumeUl: 20000, diameterMm: 19.60 },
  { brand: 'BD Glass (Multifit)', size: '50 ml', volumeUl: 50000, diameterMm: 28.00 },
  { brand: 'Hamilton 700 / 1700 (Gastight)', size: '500 µl', volumeUl: 500, diameterMm: 3.26 },
  { brand: 'Hamilton 700 / 1700 (Gastight)', size: '1 ml', volumeUl: 1000, diameterMm: 4.61 },
  { brand: 'Hamilton 700 / 1700 (Gastight)', size: '5 ml', volumeUl: 5000, diameterMm: 10.30 },
  { brand: 'Hamilton 700 / 1700 (Gastight)', size: '10 ml', volumeUl: 10000, diameterMm: 14.57 },
  { brand: 'Hamilton 700 / 1700 (Gastight)', size: '25 ml', volumeUl: 25000, diameterMm: 23.03 },
  { brand: 'Hamilton 700 / 1700 (Gastight)', size: '50 ml', volumeUl: 50000, diameterMm: 32.57 },
  { brand: 'Popper Perfektum Glass', size: '10 ml', volumeUl: 10000, diameterMm: 14.50 },
  { brand: 'Popper Perfektum Glass', size: '20 ml', volumeUl: 20000, diameterMm: 19.50 },
  { brand: 'Popper Perfektum Glass', size: '50 ml', volumeUl: 50000, diameterMm: 28.00 },
  { brand: 'SGE Gas Tight', size: '10 ml', volumeUl: 10000, diameterMm: 14.57 },
  { brand: 'SGE Gas Tight', size: '25 ml', volumeUl: 25000, diameterMm: 23.00 },
  { brand: 'Custom Syringe', size: 'Custom', volumeUl: 10000, diameterMm: 14.50 },
];
