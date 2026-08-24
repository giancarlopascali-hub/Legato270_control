import { PumpCommand, SyringePreset } from '../types';

export const LEGATO_COMMANDS: PumpCommand[] = [
  // Motion Commands
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
    command: 'DIR (Direction)',
    syntax: 'dir [inf | wdr | rev | ?]',
    category: 'motion',
    description: 'Sets or queries the pumping direction without immediately running.',
    example: 'dir rev',
    response: '<LF>00:wdr<LF>00::',
    notes: 'rev toggles direction between infuse and withdraw.'
  },

  // Rate Commands
  {
    command: 'IRATE (Infuse Rate)',
    syntax: 'irate [<value> <units> | min | max | lim | ?]',
    category: 'rate',
    description: 'Sets or displays the infusion flow rate and unit.',
    example: 'irate 2.5 ml/min',
    response: '<LF>00:2.5 ml/min<LF>00::',
    notes: 'Valid units: ml/min, ml/hr, ul/min, ul/hr, nl/min, nl/hr, pl/min, pl/hr.'
  },
  {
    command: 'WRATE (Withdraw Rate)',
    syntax: 'wrate [<value> <units> | min | max | lim | ?]',
    category: 'rate',
    description: 'Sets or displays the withdrawal flow rate and unit.',
    example: 'wrate 2.5 ml/min',
    response: '<LF>00:2.5 ml/min<LF>00::',
    notes: 'For continuous push/pull, set irate and wrate to identical values.'
  },
  {
    command: 'IRATE LIM / WRATE LIM',
    syntax: 'irate lim  or  wrate lim',
    category: 'rate',
    description: 'Queries allowable minimum and maximum rates based on the configured syringe diameter.',
    example: 'irate lim',
    response: '<LF>00:0.126 ul/hr to 13.31 ml/min<LF>00::',
    notes: 'Prevents stalling errors by verifying rates are within physical mechanical limits.'
  },

  // Volume & Target Commands
  {
    command: 'TVOLUME (Target Volume)',
    syntax: 'tvolume [<value> <units> | ?]',
    category: 'volume',
    description: 'Sets or queries the target dispense volume. Pump stops or signals when reached.',
    example: 'tvolume 10 ml',
    response: '<LF>00:10 ml<LF>00::',
    notes: 'When target volume is reached, status prompt changes to T*.'
  },
  {
    command: 'CTVOLUME (Clear Target Volume)',
    syntax: 'ctvolume',
    category: 'volume',
    description: 'Clears the target volume, allowing the pump to run continuously until stopped.',
    example: 'ctvolume',
    response: '<LF>00::',
    notes: 'Essential for continuous push/pull continuous cycling mode.'
  },
  {
    command: 'IVOLUME (Infused Volume)',
    syntax: 'ivolume [?]',
    category: 'volume',
    description: 'Queries the actual accumulated volume infused since last reset.',
    example: 'ivolume',
    response: '<LF>00:4.832 ml<LF>00::',
    notes: 'Useful for tracking live delivered volume over time.'
  },
  {
    command: 'WVOLUME (Withdrawn Volume)',
    syntax: 'wvolume [?]',
    category: 'volume',
    description: 'Queries the actual accumulated volume withdrawn since last reset.',
    example: 'wvolume',
    response: '<LF>00:4.832 ml<LF>00::',
    notes: 'Tracks volume pulled during the refill phase.'
  },
  {
    command: 'CIVOLUME / CWVOLUME / CVOLUME',
    syntax: 'civolume  or  cwvolume  or  cvolume',
    category: 'volume',
    description: 'Clears the accumulated infuse volume counter, withdraw volume counter, or both.',
    example: 'cvolume',
    response: '<LF>00::',
    notes: 'Resets the internal volume accumulators back to 0.'
  },

  // Syringe Diameter & Specs
  {
    command: 'DIAMETER',
    syntax: 'diameter [<value_in_mm> | ?]',
    category: 'syringe',
    description: 'Sets or queries the syringe inside diameter in millimeters.',
    example: 'diameter 14.5',
    response: '<LF>00:14.500 mm<LF>00::',
    notes: 'Direct inner diameter setting overrides manufacturer lookup table.'
  },
  {
    command: 'SYRM (Syringe Manufacturer)',
    syntax: 'syrm [? | <mfr> <volume_unit>]',
    category: 'syringe',
    description: 'Queries or selects a predefined syringe manufacturer from the pump library.',
    example: 'syrm ?',
    response: '<LF>00:BD Plastic, 10 ml, 14.500 mm<LF>00::',
    notes: 'KD Scientific Legato has built-in lookup tables for BD, Hamilton, SGE, Popper, etc.'
  },

  // Continuous Push/Pull Operations
  {
    command: 'PUSH/PULL CONTINUOUS CYCLE',
    syntax: 'Method / Sequence Protocol',
    category: 'continuous',
    description: 'Continuous non-pulsatile push/pull fluid delivery with automated stroke reversal.',
    example: 'tvolume 5 ml; irun; [await T*]; wrun; [await T*]',
    response: '<LF>00:T*',
    notes: 'On the Legato 270, one side infuses while the other withdraws from reservoir via passive check valves.'
  },

  // Status & Polling
  {
    command: 'POLL',
    syntax: 'poll',
    category: 'query',
    description: 'Fast status poll returning only the 2-digit pump address and current state prompt.',
    example: 'poll',
    response: '<LF>00:>',
    notes: 'Minimal overhead for high-frequency status tracking loops in Python.'
  },
  {
    command: 'STATUS',
    syntax: 'status',
    category: 'query',
    description: 'Queries detailed operating parameters, current state, active direction, and alarms.',
    example: 'status',
    response: '<LF>00:Infusing at 2.5 ml/min<LF>00:>',
    notes: 'Provides comprehensive multi-line operational summary.'
  },
  {
    command: 'TIME / ITIME / WTIME',
    syntax: 'time  or  itime  or  wtime',
    category: 'query',
    description: 'Queries the elapsed infuse or withdraw pumping time in seconds or format HH:MM:SS.',
    example: 'itime',
    response: '<LF>00:00:03:45<LF>00::',
    notes: 'Useful for timer synchronization.'
  },
  {
    command: 'VER (Firmware Version)',
    syntax: 'ver',
    category: 'system',
    description: 'Returns the firmware model and revision identifier.',
    example: 'ver',
    response: '<LF>00:Legato 270 v2.1.0<LF>00::',
    notes: 'Great for connection handshake / identity verification.'
  },
  {
    command: 'ECHO',
    syntax: 'echo [on | off]',
    category: 'system',
    description: 'Enables or disables local echo of incoming serial characters.',
    example: 'echo off',
    response: '<LF>00::',
    notes: 'Recommended set to "off" for programmatic Python drivers to avoid double characters in buffer.'
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

export const PROMPT_CODES = [
  { prompt: ':', name: 'Stopped / Idle', description: 'The pump motor is stopped and ready to accept commands.', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
  { prompt: '>', name: 'Infusing', description: 'The pump carriage is advancing forward in infusion mode.', color: 'text-blue-400 bg-blue-950/60 border-blue-800' },
  { prompt: '<', name: 'Withdrawing', description: 'The pump carriage is moving in reverse in withdrawal/refill mode.', color: 'text-purple-400 bg-purple-950/60 border-purple-800' },
  { prompt: '*', name: 'Paused', description: 'The pump operation is temporarily paused via command or pause key.', color: 'text-amber-400 bg-amber-950/60 border-amber-800' },
  { prompt: 'T*', name: 'Target Reached', description: 'The target volume or target time limit was reached and pump stopped.', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' },
  { prompt: '!', name: 'Alarm / Stall Error', description: 'A stall condition, end-of-travel limit, or hardware fault occurred.', color: 'text-rose-400 bg-rose-950/60 border-rose-800' },
  { prompt: 'O / ?', name: 'Out of Range / Syntax Error', description: 'The sent command was invalid, unrecognizable, or parameter out of limits.', color: 'text-orange-400 bg-orange-950/60 border-orange-800' }
];
