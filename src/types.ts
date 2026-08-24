export interface SyringePreset {
  brand: string;
  size: string;
  volumeUl: number;
  diameterMm: number;
}

export interface ProgramStep {
  id: string;
  stepNumber: number;
  type: 'infuse' | 'withdraw' | 'pause' | 'ramp' | 'loop';
  volume: number;
  volumeUnit: 'ml' | 'ul' | 'nl';
  rate: number;
  rateUnit: 'ml/min' | 'ml/hr' | 'ul/min' | 'ul/hr' | 'nl/min' | 'nl/hr';
  endRate?: number; // for ramp
  durationSec?: number; // for pause/ramp
  loopToStep?: number; // for loop
  loopCount?: number; // for loop
}

export interface AdvancedSettings {
  baudRate: number;
  forcePercent: number;
  pumpAddress: number;
}
