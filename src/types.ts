export interface PumpCommand {
  command: string;
  syntax: string;
  category: 'motion' | 'rate' | 'volume' | 'syringe' | 'continuous' | 'system' | 'query';
  description: string;
  example: string;
  response: string;
  notes?: string;
}

export interface SyringePreset {
  brand: string;
  size: string;
  volumeUl: number;
  diameterMm: number;
}

export interface SerialSettings {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  timeout: number;
  address: number;
}

export interface PumpParameters {
  syringeBrand: string;
  syringeSize: string;
  customDiameterMm: number;
  useCustomDiameter: boolean;
  infuseRate: number;
  infuseUnit: 'ml/min' | 'ml/hr' | 'ul/min' | 'ul/hr' | 'nl/min' | 'nl/hr';
  withdrawRate: number;
  withdrawUnit: 'ml/min' | 'ml/hr' | 'ul/min' | 'ul/hr' | 'nl/min' | 'nl/hr';
  targetVolume: number;
  targetVolumeUnit: 'ml' | 'ul' | 'nl';
  mode: 'continuous_push_pull' | 'infuse_only' | 'withdraw_only' | 'volume_dispense';
  cycleDelaySec: number;
  cycles: number; // 0 for infinite continuous
}

export interface VirtualPumpState {
  connected: boolean;
  isVirtual: boolean;
  statusPrompt: ':' | '>' | '<' | '*' | 'T*' | '!';
  direction: 'inf' | 'wdr' | 'idle' | 'paused';
  rate: number;
  rateUnit: string;
  diameter: number;
  targetVolume: number | null;
  infusedVolume: number;
  withdrawnVolume: number;
  carriagePositionMm: number; // 0 to 100 mm stroke
  log: Array<{
    id: string;
    timestamp: string;
    type: 'tx' | 'rx' | 'info' | 'error';
    text: string;
  }>;
}
