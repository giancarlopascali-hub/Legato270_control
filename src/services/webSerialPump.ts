/**
 * Web Serial API Controller & Virtual Simulator for KD Scientific Legato Syringe Pumps
 * Supports Legato 100, 130, 200, 210, 270, and Harvard Bioscience Harvard Apparatus pumps.
 */

import { ProgramStep } from '../types';

export type PumpStatusPrompt = ':' | '>' | '<' | '*' | 'T*' | '!' | 'O' | '?' | 'DISCONNECTED';
export type StatusCategory = 'Idle' | 'Running' | 'Error';

export interface PumpTelemetry {
  isConnected: boolean;
  isRealHardware: boolean;
  portName: string;
  baudRate: number;
  pumpAddress: string; // e.g. "00" or ""
  pumpModel: string;
  firmwareVersion: string;
  prompt: PumpStatusPrompt;
  statusText: string;
  statusCategory: StatusCategory; // 'Idle' | 'Running' | 'Error'
  direction: 'infuse' | 'withdraw' | 'idle' | 'paused';
  // Flow Rates (separate infuse and withdraw rates)
  flowRate: number; // Active or default rate
  flowUnit: string;
  infuseRate: number;
  infuseRateUnit: string;
  withdrawRate: number;
  withdrawRateUnit: string;
  // Syringe Parameters
  diameterMm: number;
  syringeVolume?: number;
  syringeVolumeUnit?: string;
  // Single Target Volume
  targetVolume: number | null;
  targetUnit: string; // 'ml' | 'ul' | 'nl'
  volumeUnit: string; // 'ml' | 'ul' | 'nl'
  strokeTarget: number | null;
  infuseTarget?: number | null;
  withdrawTarget?: number | null;
  // Target Time
  targetTime: string | null; // e.g. "00:05:00"
  targetTimeEnabled: boolean;
  // Accumulated volumes
  infusedVolume: number;
  withdrawnVolume: number;
  currentStrokeVolume: number; // Volume delivered in active stroke
  totalContinuousVolume: number; // Total fluid delivered across all cycles combined
  strokeElapsedSec: number;
  strokeDurationSec: number;
  strokePercent: number; // 0 to 100% of current stroke
  carriagePercent: number; // 0 to 100%
  motorForce: number; // 20% - 100%
  dtrEnabled: boolean;
  rtsEnabled: boolean;
  echoEnabled: boolean;
  // Motor Stall & Alarm state
  isStalled: boolean;
  stallMessage: string;
  // Continuous cycling state
  continuousActive: boolean;
  currentCycle: number;
  totalCycles: number; // 0 = infinite
  cyclePhase: 'infusing_A' | 'withdrawing_A' | 'settling' | 'idle';
  elapsedRunTimeSec: number;
  // Serial command monitoring
  lastCommand: string;
  lastResponse: string;
  // Program Execution State
  isProgramRunning: boolean;
  currentProgramStep: number;
  totalProgramSteps: number;
}

export interface SerialLogItem {
  id: string;
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'error' | 'cycle';
  text: string;
}

export type TelemetryListener = (telemetry: PumpTelemetry) => void;
export type LogListener = (log: SerialLogItem) => void;

/**
 * Normalizes user-facing or display units (such as "µl", "µl/min", "uL") into standard ASCII
 * compatible serial tokens ("ul", "ul/min", "ml", "ml/min", etc.) expected by KD Scientific / Harvard pumps.
 */
export function normalizeSerialUnit(unit: string): string {
  if (!unit) return 'ml';
  return unit
    .replace(/µ|μ/gi, 'u')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * Formats standard ASCII unit strings (e.g. "ul", "ul/min") into polished UI display strings with "µ" (e.g. "µl", "µl/min").
 */
export function formatDisplayUnit(unit: string): string {
  if (!unit) return 'ml';
  const clean = unit.toLowerCase().trim();
  if (clean === 'ul') return 'µl';
  if (clean === 'ul/min') return 'µl/min';
  if (clean === 'ul/hr') return 'µl/hr';
  if (clean === 'ul/sec') return 'µl/sec';
  if (clean.startsWith('ul/')) return 'µ' + clean.slice(1);
  return clean;
}

/**
 * Converts any volume (ml, ul, nl) to base microliters (µl) for normalized calculation
 */
export function toMicroliters(val: number, unit: string): number {
  if (!val || isNaN(val)) return 0;
  const u = normalizeSerialUnit(unit);
  if (u === 'ml') return val * 1000;
  if (u === 'nl') return val / 1000;
  return val; // 'ul'
}

/**
 * Converts volume between arbitrary units (ml, ul, nl)
 */
export function convertVolume(val: number, fromUnit: string, toUnit: string): number {
  const ul = toMicroliters(val, fromUnit);
  const target = normalizeSerialUnit(toUnit);
  if (target === 'ml') return ul / 1000;
  if (target === 'nl') return ul * 1000;
  return ul; // 'ul'
}

export function isHardwarePromptOrNoise(str: string): boolean {
  if (!str) return true;
  const lower = str.toLowerCase();
  if (lower.includes('polling mode')) return true;

  // Never filter out critical stall or alarm messages
  if (str.includes('*') || str.includes('!') || lower.includes('stall') || lower.includes('alarm')) {
    return false;
  }

  // Strip non-printable ASCII and whitespace
  const clean = str.replace(/[\x00-\x1F\x7F-\x9F\s]/g, '');
  if (!clean) return true;

  // Normal prompts like ":", ">", "<"
  if (/^[:><]+$/i.test(clean)) return true;

  // Normal address prompts like "00:", "00>", "00<"
  if (/^\d{1,2}(:|>|<|::|:\s*[:><])?$/i.test(clean)) return true;

  // Bare number or address like "00"
  if (/^\d{1,2}$/.test(clean)) return true;

  return false;
}

export class Legato270WebController {
  private port: any = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private isReading = false;
  private pollTimer: any = null;
  private simTimer: any = null;
  private runClockTimer: any = null;
  private programAbortController: AbortController | null = null;
  private commandQueue: Promise<void> = Promise.resolve();
  private isTransitioningCycle = false;
  private lastCycleTransitionTime = 0;
  private currentStrokeVolume = 0;

  private telemetryListeners: TelemetryListener[] = [];
  private logListeners: LogListener[] = [];

  public state: PumpTelemetry = {
    isConnected: true,
    isRealHardware: false, // Default to simulator until user connects USB
    portName: 'Virtual Legato 270 (Simulator)',
    baudRate: 115200,
    pumpAddress: '00',
    pumpModel: 'KD Scientific Legato 270',
    firmwareVersion: 'v2.1.0',
    prompt: ':',
    statusText: 'STOPPED (Idle)',
    statusCategory: 'Idle',
    direction: 'idle',
    flowRate: 2.5,
    flowUnit: 'ml/min',
    infuseRate: 2.5,
    infuseRateUnit: 'ml/min',
    withdrawRate: 2.5,
    withdrawRateUnit: 'ml/min',
    targetVolume: 5.0,
    targetUnit: 'ml',
    volumeUnit: 'ml',
    strokeTarget: 5.0,
    infuseTarget: 5.0,
    withdrawTarget: 5.0,
    targetTime: null,
    targetTimeEnabled: false,
    infusedVolume: 0.0,
    withdrawnVolume: 0.0,
    currentStrokeVolume: 0.0,
    totalContinuousVolume: 0.0,
    strokeElapsedSec: 0,
    strokeDurationSec: 120,
    strokePercent: 0,
    diameterMm: 14.50,
    carriagePercent: 0,
    motorForce: 100,
    dtrEnabled: true,
    rtsEnabled: true,
    echoEnabled: false,
    isStalled: false,
    stallMessage: '',
    continuousActive: false,
    currentCycle: 0,
    totalCycles: 0,
    cyclePhase: 'idle',
    elapsedRunTimeSec: 0,
    lastCommand: 'poll',
    lastResponse: '00::',
    isProgramRunning: false,
    currentProgramStep: 0,
    totalProgramSteps: 0,
  };

  constructor() {
    this.startFlowTrackerEngine();
  }

  public subscribeTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter((l) => l !== listener);
    };
  }

  public subscribeLog(listener: LogListener) {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter((l) => l !== listener);
    };
  }

  private emitTelemetry() {
    const clone = { ...this.state };
    this.telemetryListeners.forEach((l) => l(clone));
  }

  public emitLog(type: 'tx' | 'rx' | 'info' | 'error' | 'cycle', text: string) {
    const item: SerialLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      text,
    };
    this.logListeners.forEach((l) => l(item));
  }

  public static isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public static isInsideIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * Request user permission and connect to physical USB pump
   */
  public async connectUSB(baudRate: number = 115200): Promise<boolean> {
    if (!Legato270WebController.isWebSerialSupported()) {
      this.emitLog('error', 'Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge on desktop.');
      this.state.statusCategory = 'Error';
      this.emitTelemetry();
      return false;
    }

    try {
      this.emitLog('info', `Opening USB Serial Port dialog @ ${baudRate} baud (8-N-1)...`);
      const serial = (navigator as any).serial;
      
      // Request serial port from user
      this.port = await serial.requestPort();
      
      // Open port with 8-N-1 and flow control none
      await this.port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        bufferSize: 8192,
      });

      // Assert DTR and RTS signals required by USB-CDC firmware
      try {
        await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
        this.state.dtrEnabled = true;
        this.state.rtsEnabled = true;
      } catch (sigErr: any) {
        this.emitLog('info', `Note: Hardware signals DTR/RTS initialized (${sigErr.message || 'ok'})`);
      }

      this.state.isConnected = true;
      this.state.isRealHardware = true;
      this.state.baudRate = baudRate;
      this.state.portName = 'Physical KD Scientific Pump (USB)';
      this.state.statusCategory = 'Idle';
      this.emitLog('info', `Serial Port successfully connected at ${baudRate} baud.`);

      // Start continuous background stream reader
      this.startReading();

      // Flush buffer and initialize handshake
      await this.initializePumpConnection();

      // Start regular status polling
      this.startHardwarePolling();
      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        this.emitLog('info', 'Port selection cancelled by user.');
      } else if (err.name === 'SecurityError' || err.message?.includes('denied')) {
        this.emitLog('error', `Browser Security Block: Web Serial is restricted inside iframes. Please open the app in a new standalone tab.`);
        this.state.statusCategory = 'Error';
      } else {
        this.emitLog('error', `Connection error: ${err.message}`);
        this.state.statusCategory = 'Error';
      }
      this.emitTelemetry();
      return false;
    }
  }

  /**
   * Automatically test baud rates to find matching speed
   */
  public async autoDetectBaudRate(): Promise<number | null> {
    if (!this.port) {
      this.emitLog('error', 'Connect to a USB port first before running auto-detect.');
      return null;
    }

    const testRates = [115200, 9600, 19200, 38400, 57600];
    this.emitLog('info', `Auto-detecting baud rate across: ${testRates.join(', ')}...`);

    for (const rate of testRates) {
      try {
        this.emitLog('info', `Testing ${rate} baud...`);
        // Reopen at new rate
        await this.disconnectPortOnly();
        await this.port.open({
          baudRate: rate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          flowControl: 'none',
        });
        await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
        this.startReading();

        // Send ver command and wait for response
        let receivedValid = false;
        const testHandler = (log: SerialLogItem) => {
          if (log.type === 'rx' && (log.text.includes('Legato') || log.text.includes('00:') || log.text.includes(':') || log.text.includes('v'))) {
            receivedValid = true;
          }
        };
        const unsub = this.subscribeLog(testHandler);

        await this.sendCommandRaw('echo off\r');
        await new Promise((r) => setTimeout(r, 100));
        await this.sendCommandRaw('ver\r');
        await new Promise((r) => setTimeout(r, 300));

        unsub();

        if (receivedValid) {
          this.state.baudRate = rate;
          this.state.isRealHardware = true;
          this.emitLog('info', `Successfully verified pump at ${rate} baud!`);
          this.startHardwarePolling();
          this.emitTelemetry();
          return rate;
        }
      } catch (err: any) {
        this.emitLog('info', `Baud ${rate} attempt: ${err.message}`);
      }
    }

    this.emitLog('error', 'Could not auto-detect baud rate. Check cable connection and pump display settings.');
    return null;
  }

  public async setControlSignals(dtr: boolean, rts: boolean) {
    if (this.port && this.state.isRealHardware) {
      try {
        await this.port.setSignals({ dataTerminalReady: dtr, requestToSend: rts });
        this.state.dtrEnabled = dtr;
        this.state.rtsEnabled = rts;
        this.emitLog('info', `Hardware signals updated: DTR=${dtr}, RTS=${rts}`);
        this.emitTelemetry();
      } catch (err: any) {
        this.emitLog('error', `Failed to update signals: ${err.message}`);
      }
    }
  }

  private async initializePumpConnection() {
    this.emitLog('info', 'Performing initialization handshake (echo off, ver, status)...');
    
    // Send wake-up carriage return
    await this.sendCommandRaw('\r');
    await new Promise((r) => setTimeout(r, 100));

    // Disable echo for clean machine parsing
    await this.sendCommandRaw('echo off\r');
    await new Promise((r) => setTimeout(r, 100));

    // Query version info
    await this.sendCommandRaw('ver\r');
    await new Promise((r) => setTimeout(r, 120));

    // Query all current parameters from pump registers
    await this.queryAllPumpParameters();
  }

  private async disconnectPortOnly() {
    this.stopHardwarePolling();
    this.isReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {
        // ignore
      }
      try {
        this.reader.releaseLock();
      } catch {
        // ignore
      }
      this.reader = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {
        // ignore
      }
    }
  }

  public async disconnectUSB() {
    await this.disconnectPortOnly();
    this.port = null;

    this.state.isRealHardware = false;
    this.state.portName = 'Virtual Legato 270 (Simulator)';
    this.state.statusCategory = 'Idle';
    this.state.prompt = ':';
    this.state.direction = 'idle';
    this.state.statusText = 'STOPPED (Idle)';
    this.emitLog('info', 'Switched to virtual pump simulator.');
    this.startFlowTrackerEngine();
    this.emitTelemetry();
  }

  private async startReading() {
    if (!this.port || !this.port.readable) return;
    this.isReading = true;
    const decoder = new TextDecoder();
    let buffer = '';

    while (this.port && this.port.readable && this.isReading) {
      try {
        this.reader = this.port.readable.getReader();
        while (this.isReading) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            
            // KD Scientific pumps send \r\n or \r\r\n
            const lines = buffer.split(/[\r\n]+/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.length > 0) {
                this.handleIncomingLine(trimmed);
              }
            }
          }
        }
      } catch (err: any) {
        if (this.isReading) {
          this.emitLog('error', `Serial Read Error: ${err.message}`);
          this.state.statusCategory = 'Error';
          this.emitTelemetry();
        }
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch {
            // ignore
          }
          this.reader = null;
        }
      }

      if (!this.isReading) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  public async queryAllPumpParameters(): Promise<void> {
    const queryList = ['echo off', 'ver', 'diameter', 'irate', 'wrate', 'tvolume', 'ttime', 'ivolume', 'wvolume', 'force', 'poll'];
    for (const cmd of queryList) {
      await this.sendCommand(cmd, false);
      await new Promise((r) => setTimeout(r, 70));
    }
  }

  private handleIncomingLine(line: string) {
    this.state.lastResponse = line;

    // Suppress raw periodic poll prompt echoes (e.g. ":", "00:", "00>", "00<", "Polling mode is ON")
    // from cluttering the terminal while keeping meaningful responses, stall alerts, and manual commands visible
    if (!isHardwarePromptOrNoise(line)) {
      this.emitLog('rx', line);
    }

    const lineLower = line.toLowerCase();

    // 1. Direct text or prompt-based stall & alarm detection from hardware
    const isStallAlarmText =
      lineLower.includes('stall') ||
      lineLower.includes('stalled') ||
      lineLower.includes('motor stall') ||
      lineLower.includes('error 101') ||
      lineLower.includes('error 102') ||
      lineLower.includes('err 101') ||
      lineLower.includes('err 102') ||
      lineLower.includes('alarm') ||
      lineLower.includes('overpressure') ||
      lineLower.includes('limit reached');

    const isStallPrompt =
      line.endsWith('*') ||
      line.endsWith('!') ||
      line === '*' ||
      line === '!' ||
      line === '00*' ||
      line === '00!' ||
      line.includes('00:*') ||
      line.includes('00:!');

    if (isStallAlarmText || isStallPrompt) {
      // Check if it is T* (target reached) vs * / ! (stall)
      if (line.endsWith('T*') || line.includes('00T*') || line.includes('00:T*') || lineLower.includes('target reached')) {
        this.state.statusText = 'TARGET REACHED';
        this.state.statusCategory = 'Idle';
        this.state.prompt = 'T*';
        this.state.direction = 'idle';
        this.state.isStalled = false;
        this.stopRunClock();
        if (this.state.continuousActive && !this.isTransitioningCycle) {
          this.handleContinuousTargetReached();
        }
        this.emitTelemetry();
        return;
      } else {
        this.state.isStalled = true;
        this.state.stallMessage = line;
        this.state.statusCategory = 'Error';
        this.state.statusText = 'MOTOR STALLED / ALARM';
        this.state.prompt = line.includes('!') ? '!' : '*';
        this.state.direction = 'idle';
        this.stopRunClock();
        this.emitLog('error', `[!] PUMP MOTOR STALL / ALARM DETECTED: ${line}`);
        this.emitTelemetry();
        return;
      }
    }

    // 1.1 Direct text status keywords from hardware responses (e.g. "00:Target reached", "00:Stopped", "00:Infusing at...")
    if (lineLower.includes('target reached') || lineLower.includes('target volume reached') || lineLower.includes('target time reached')) {
      this.state.statusText = 'TARGET REACHED';
      this.state.statusCategory = 'Idle';
      this.state.direction = 'idle';
      this.state.prompt = 'T*';
      this.stopRunClock();
      if (this.state.continuousActive && !this.isTransitioningCycle) {
        this.handleContinuousTargetReached();
      }
      this.emitTelemetry();
      return;
    }

    if (lineLower.includes('stopped') || (lineLower.includes('idle') && !lineLower.includes('infus') && !lineLower.includes('withdr'))) {
      if (!this.state.continuousActive && this.state.direction !== 'idle') {
        this.state.statusText = 'STOPPED';
        this.state.statusCategory = 'Idle';
        this.state.direction = 'idle';
        this.state.prompt = ':';
        this.stopRunClock();
        this.emitTelemetry();
      }
    }

    if (lineLower.includes('infusing at') || lineLower.startsWith('infusing')) {
      this.state.statusText = 'INFUSING';
      this.state.statusCategory = 'Running';
      this.state.direction = 'infuse';
      this.state.prompt = '>';
      this.startRunClock();
    } else if (lineLower.includes('withdrawing at') || lineLower.startsWith('withdrawing')) {
      this.state.statusText = 'WITHDRAWING';
      this.state.statusCategory = 'Running';
      this.state.direction = 'withdraw';
      this.state.prompt = '<';
      this.startRunClock();
    }

    // 2. Parse pump model & version (e.g. "KD Scientific Legato 270 v2.1.0" or "00:KD Scientific Legato 270")
    if (line.includes('KD Scientific') || line.includes('Harvard') || line.includes('Legato') || lineLower.includes('syringe pump')) {
      this.state.pumpModel = line.replace(/^\d+[:\s]*/, '').trim();
      const vMatch = line.match(/v\d+\.\d+(\.\d+)?/i);
      if (vMatch) {
        this.state.firmwareVersion = vMatch[0];
      }
    }

    // 3. Extract address prefix if present (e.g. "00:", "01:", "00>")
    const addrMatch = line.match(/^(\d{2}):/);
    if (addrMatch) {
      this.state.pumpAddress = addrMatch[1];
    }

    // 4. Extract prompt from line (e.g. 00:, 00>, 00<, 00*, 00T*, 00!, 00O, 00?)
    const promptMatch = line.match(/(T\*|[:><*!O?])$/);
    if (promptMatch) {
      const p = promptMatch[1] as PumpStatusPrompt;
      this.state.prompt = p;
      this.updateStatusFromPrompt(p);
    }

    // 5. Rate parsing (e.g. "2.5000 ml/min", "500.0000 ul/min", "100.0 µl/hr", "50 nl/min", "00:2.5000 ml/min")
    const rateMatch = line.match(/([\d.]+)\s*(ml\/min|ml\/hr|ml\/sec|ul\/min|ul\/hr|ul\/sec|µl\/min|µl\/hr|µl\/sec|μl\/min|μl\/hr|μl\/sec|nl\/min|nl\/hr|nl\/sec)/i);
    if (rateMatch) {
      const rateVal = parseFloat(rateMatch[1]);
      const rateUnit = normalizeSerialUnit(rateMatch[2]);
      if (this.state.lastCommand?.toLowerCase().startsWith('wrate') || lineLower.includes('wrate')) {
        this.state.withdrawRate = rateVal;
        this.state.withdrawRateUnit = rateUnit;
      } else if (this.state.lastCommand?.toLowerCase().startsWith('irate') || lineLower.includes('irate')) {
        this.state.infuseRate = rateVal;
        this.state.infuseRateUnit = rateUnit;
        this.state.flowRate = rateVal;
        this.state.flowUnit = rateUnit;
      } else {
        this.state.flowRate = rateVal;
        this.state.flowUnit = rateUnit;
        if (this.state.direction === 'withdraw') {
          this.state.withdrawRate = rateVal;
          this.state.withdrawRateUnit = rateUnit;
        } else {
          this.state.infuseRate = rateVal;
          this.state.infuseRateUnit = rateUnit;
        }
      }
    }

    // 6. Parse syringe diameter (e.g. "14.500 mm" or "00:14.500 mm")
    if (line.includes('mm')) {
      const match = line.match(/([\d.]+)\s*mm/i);
      if (match) {
        this.state.diameterMm = parseFloat(match[1]);
      }
    }

    // 7. Parse target volume (e.g. "5.0000 ml", "500.0 ul", "10.0 µl", "00:5.0000 ml" or "tvolume: 5 ml")
    if (
      this.state.lastCommand?.toLowerCase().startsWith('tvolume') ||
      lineLower.includes('tvol')
    ) {
      const match = line.match(/([\d.]+)\s*(ml|ul|µl|μl|nl)\b/i);
      if (match && !lineLower.includes('ivol') && !lineLower.includes('wvol')) {
        const val = parseFloat(match[1]);
        this.state.targetVolume = val;
        this.state.strokeTarget = val;
        this.state.targetUnit = normalizeSerialUnit(match[2]);
      }
    }

    // 8. Parse target time (e.g. "00:05:00" or "0:5:0")
    if (this.state.lastCommand?.toLowerCase().startsWith('ttime') || lineLower.includes('ttime')) {
      const timeMatch = line.match(/(\d{1,2}:\d{2}:\d{2})/);
      if (timeMatch) {
        this.state.targetTime = timeMatch[1];
        this.state.targetTimeEnabled = true;
      }
    }

    // 9. Parse infused volume hardware register response (e.g. "ivolume 0.5000 ml", "00: 0.5000 ml")
    if (
      this.state.lastCommand === 'ivolume' ||
      lineLower.includes('ivol')
    ) {
      const match = line.match(/([\d.]+)\s*(ml|ul|µl|μl|nl)/i);
      if (match) {
        const hwVol = parseFloat(match[1]);
        const hwUnit = normalizeSerialUnit(match[2]);
        this.state.infusedVolume = hwVol;
        this.state.volumeUnit = hwUnit;
      }
    }

    // 10. Parse withdrawn volume hardware register response (e.g. "wvolume 0.5000 ml", "00: 0.5000 ml")
    if (
      this.state.lastCommand === 'wvolume' ||
      lineLower.includes('wvol')
    ) {
      const match = line.match(/([\d.]+)\s*(ml|ul|µl|μl|nl)/i);
      if (match) {
        const hwVol = parseFloat(match[1]);
        const hwUnit = normalizeSerialUnit(match[2]);
        this.state.withdrawnVolume = hwVol;
        this.state.volumeUnit = hwUnit;
      }
    }

    // 11. Parse force
    if (lineLower.includes('force') || line.match(/(\d+)\s*%/)) {
      const match = line.match(/(\d+)\s*%/);
      if (match) {
        this.state.motorForce = parseInt(match[1], 10);
      }
    }

    this.emitTelemetry();
  }

  private updateStatusFromPrompt(prompt: PumpStatusPrompt) {
    switch (prompt) {
      case ':':
        this.state.statusText = 'STOPPED';
        this.state.statusCategory = 'Idle';
        this.state.direction = 'idle';
        this.stopRunClock();
        break;
      case '>':
        this.state.statusText = 'INFUSING';
        this.state.statusCategory = 'Running';
        this.state.direction = 'infuse';
        this.startRunClock();
        break;
      case '<':
        this.state.statusText = 'WITHDRAWING';
        this.state.statusCategory = 'Running';
        this.state.direction = 'withdraw';
        this.startRunClock();
        break;
      case '*':
        // On KD Scientific / Harvard pumps, * prompt indicates motor paused or stalled before reaching target
        this.state.statusText = 'STALLED / PAUSED';
        this.state.statusCategory = 'Error';
        this.state.direction = 'idle';
        this.stopRunClock();
        break;
      case 'T*':
        this.state.statusText = 'TARGET REACHED';
        this.state.statusCategory = 'Idle';
        this.state.direction = 'idle';
        this.stopRunClock();
        break;
      case '!':
        this.state.statusText = 'MOTOR STALLED / ALARM';
        this.state.statusCategory = 'Error';
        this.state.direction = 'idle';
        this.stopRunClock();
        break;
      case 'O':
      case '?':
        this.state.statusText = 'OUT OF RANGE / ERROR';
        this.state.statusCategory = 'Error';
        break;
      default:
        this.state.statusCategory = 'Idle';
    }
  }

  private startHardwarePolling() {
    this.stopHardwarePolling();
    this.pollTimer = setInterval(async () => {
      if (this.isTransitioningCycle) return;
      if (this.state.isRealHardware && this.state.isConnected && this.port && this.port.writable) {
        // Query status and prompt from hardware
        await this.sendCommand('status', false);
        if (this.state.direction === 'infuse') {
          await this.sendCommand('ivolume', false);
        } else if (this.state.direction === 'withdraw') {
          await this.sendCommand('wvolume', false);
        }
      }
    }, 450);
  }

  private stopHardwarePolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async sendCommandRaw(dataString: string): Promise<void> {
    if (!this.port || !this.port.writable) return;
    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      try {
        await writer.write(encoder.encode(dataString));
      } finally {
        writer.releaseLock();
      }
    } catch (err: any) {
      this.emitLog('error', `Write error: ${err.message}`);
    }
  }

  public async sendCommand(command: string, logTx: boolean = true): Promise<void> {
    // Queue commands sequentially to prevent race conditions on the serial bus
    this.commandQueue = this.commandQueue.then(async () => {
      const cleanCmd = command.trim();
      if (!cleanCmd) return;

      this.state.lastCommand = cleanCmd;

      if (logTx) {
        this.emitLog('tx', cleanCmd);
      }

      if (this.state.isRealHardware && this.port && this.port.writable) {
        try {
          // Standard KD Scientific terminator is Carriage Return \r
          const encoder = new TextEncoder();
          const data = encoder.encode(cleanCmd + '\r');
          const writer = this.port.writable.getWriter();
          try {
            await writer.write(data);
          } finally {
            writer.releaseLock();
          }
          // Small inter-command guard delay to let the pump's microcontroller process
          await new Promise((r) => setTimeout(r, 60));
        } catch (err: any) {
          this.emitLog('error', `Write error: ${err.message}`);
          this.state.statusCategory = 'Error';
          this.emitTelemetry();
        }
        return;
      }

      // Virtual Simulator Execution
      this.simulateCommand(cleanCmd);
    });

    return this.commandQueue;
  }

  private simulateCommand(cmd: string) {
    const lower = cmd.toLowerCase();
    let rx = '';

    if (lower === 'irun' || lower === 'run') {
      this.state.direction = 'infuse';
      this.state.prompt = '>';
      this.state.statusText = 'INFUSING';
      this.state.statusCategory = 'Running';
      rx = '00:>';
      this.startRunClock();
    } else if (lower === 'wrun') {
      this.state.direction = 'withdraw';
      this.state.prompt = '<';
      this.state.statusText = 'WITHDRAWING';
      this.state.statusCategory = 'Running';
      rx = '00:<';
      this.startRunClock();
    } else if (lower === 'stop' || lower === 'stp') {
      this.state.direction = 'idle';
      this.state.prompt = ':';
      this.state.statusText = 'STOPPED';
      this.state.statusCategory = 'Idle';
      if (!this.state.continuousActive && !this.isTransitioningCycle) {
        this.state.isProgramRunning = false;
        this.stopRunClock();
      }
      rx = '00::';
    } else if (lower.startsWith('irate')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 3) {
        this.state.flowRate = parseFloat(parts[1]) || this.state.flowRate;
        this.state.flowUnit = parts[2] || this.state.flowUnit;
      }
      rx = `00:${this.state.flowRate} ${this.state.flowUnit}\n00:${this.state.prompt}`;
    } else if (lower.startsWith('wrate')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 3) {
        this.state.flowRate = parseFloat(parts[1]) || this.state.flowRate;
        this.state.flowUnit = parts[2] || this.state.flowUnit;
      }
      rx = `00:${this.state.flowRate} ${this.state.flowUnit}\n00:${this.state.prompt}`;
    } else if (lower.startsWith('diameter')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 2) {
        this.state.diameterMm = parseFloat(parts[1]) || this.state.diameterMm;
      }
      rx = `00:${this.state.diameterMm.toFixed(3)} mm\n00:${this.state.prompt}`;
    } else if (lower.startsWith('tvolume')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 2) {
        this.state.targetVolume = parseFloat(parts[1]) || null;
        this.state.strokeTarget = this.state.targetVolume;
      }
      rx = `00:${this.state.targetVolume || 0} ${this.state.targetUnit}\n00:${this.state.prompt}`;
    } else if (lower.startsWith('force')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 2) {
        this.state.motorForce = parseInt(parts[1], 10) || 100;
      }
      rx = `00:${this.state.motorForce}%\n00:${this.state.prompt}`;
    } else if (lower.startsWith('baud')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 2) {
        this.state.baudRate = parseInt(parts[1], 10) || 115200;
      }
      rx = `00:${this.state.baudRate}\n00:${this.state.prompt}`;
    } else if (lower === 'ctvolume') {
      this.state.targetVolume = null;
      this.state.strokeTarget = null;
      rx = '00::';
    } else if (lower === 'cvolume' || lower === 'civolume' || lower === 'cwvolume') {
      this.state.infusedVolume = 0;
      this.state.withdrawnVolume = 0;
      this.state.elapsedRunTimeSec = 0;
      rx = '00::';
    } else if (lower === 'ivolume') {
      rx = `00:${this.state.infusedVolume.toFixed(4)} ml\n00:${this.state.prompt}`;
    } else if (lower === 'wvolume') {
      rx = `00:${this.state.withdrawnVolume.toFixed(4)} ml\n00:${this.state.prompt}`;
    } else if (lower === 'poll') {
      rx = `00:${this.state.prompt}`;
    } else if (lower === 'status') {
      rx = `00:${this.state.statusText} at ${this.state.flowRate} ${this.state.flowUnit}\n00:${this.state.prompt}`;
    } else if (lower === 'ver') {
      rx = '00:KD Scientific Legato 270 v2.1.0\n00::';
    } else if (lower.startsWith('echo')) {
      rx = '00::';
    } else {
      rx = '00:?\n00:O';
      this.state.prompt = 'O';
      this.state.statusCategory = 'Error';
    }

    setTimeout(() => {
      this.state.lastResponse = rx;
      this.emitLog('rx', rx);
      this.emitTelemetry();
    }, 30);
  }

  // -------------------------------------------------------------------------
  // Live High-Frequency Dual-Engine Flow & Syringe Integrator
  // Works identically in both Simulator mode and Real Hardware mode
  // -------------------------------------------------------------------------
  private startFlowTrackerEngine() {
    this.stopFlowTrackerEngine();
    this.simTimer = setInterval(() => {
      if (this.state.direction === 'idle' || this.state.direction === 'paused' || this.state.isStalled) {
        return;
      }

      // Determine active rate in current movement direction
      const isInfusing = this.state.direction === 'infuse';
      const activeRate = isInfusing
        ? (this.state.infuseRate || this.state.flowRate || 2.5)
        : (this.state.withdrawRate || this.state.flowRate || 2.5);
      const activeUnit = isInfusing
        ? (this.state.infuseRateUnit || this.state.flowUnit || 'ml/min')
        : (this.state.withdrawRateUnit || this.state.flowUnit || 'ml/min');

      // Convert rate to rate per second in the selected unit
      let ratePerSec = activeRate / 60; // default /min
      if (activeUnit.includes('/hr')) {
        ratePerSec = activeRate / 3600;
      } else if (activeUnit.includes('/sec')) {
        ratePerSec = activeRate;
      }

      const dt = 0.1; // 100ms interval
      const dVol = ratePerSec * dt;

      // Single stroke target volume
      const targetVol = this.state.targetVolume && this.state.targetVolume > 0
        ? this.state.targetVolume
        : (this.state.strokeTarget || 5.0);

      // Expected total duration of a single stroke in seconds
      if (ratePerSec > 0 && targetVol > 0) {
        this.state.strokeDurationSec = Math.max(1, Math.round(targetVol / ratePerSec));
      }

      let strokeDelivered = 0;

      if (isInfusing) {
        this.state.infusedVolume += dVol;
        this.state.totalContinuousVolume += dVol;
        this.state.strokeElapsedSec += dt;
        this.currentStrokeVolume += dVol;
        this.state.currentStrokeVolume = this.currentStrokeVolume;
        strokeDelivered = this.currentStrokeVolume;

        // Carriage position for Infuse: moves 0% -> 100%
        const pct = targetVol > 0 ? (strokeDelivered / targetVol) * 100 : 50;
        this.state.strokePercent = Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
        this.state.carriagePercent = this.state.strokePercent;

        // Check Target Volume Reached
        if (targetVol > 0 && strokeDelivered >= targetVol) {
          if (this.state.continuousActive) {
            if (!this.isTransitioningCycle) {
              this.handleContinuousTargetReached();
            }
            return;
          } else {
            this.state.direction = 'idle';
            this.state.prompt = 'T*';
            this.state.statusText = 'TARGET REACHED';
            this.state.statusCategory = 'Idle';
            this.stopRunClock();
            this.emitLog('info', `Target reached (${targetVol.toFixed(4)} ${this.state.targetUnit || 'ml'}).`);
            if (this.state.isRealHardware) {
              this.sendCommand('stop', false);
            }
          }
        }
      } else {
        // Withdrawing
        this.state.withdrawnVolume += dVol;
        this.state.totalContinuousVolume += dVol;
        this.state.strokeElapsedSec += dt;
        this.currentStrokeVolume += dVol;
        this.state.currentStrokeVolume = this.currentStrokeVolume;
        strokeDelivered = this.currentStrokeVolume;

        // Carriage position for Withdraw: moves 100% -> 0%
        const pct = targetVol > 0 ? (strokeDelivered / targetVol) * 100 : 50;
        this.state.strokePercent = Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
        this.state.carriagePercent = Math.max(0, Math.min(100, 100 - this.state.strokePercent));

        // Check Target Volume Reached
        if (targetVol > 0 && strokeDelivered >= targetVol) {
          if (this.state.continuousActive) {
            if (!this.isTransitioningCycle) {
              this.handleContinuousTargetReached();
            }
            return;
          } else {
            this.state.direction = 'idle';
            this.state.prompt = 'T*';
            this.state.statusText = 'TARGET REACHED';
            this.state.statusCategory = 'Idle';
            this.stopRunClock();
            this.emitLog('info', `Target reached (${targetVol.toFixed(4)} ${this.state.targetUnit || 'ml'}).`);
            if (this.state.isRealHardware) {
              this.sendCommand('stop', false);
            }
          }
        }
      }

      this.emitTelemetry();
    }, 100);
  }

  private stopFlowTrackerEngine() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }

  private startRunClock() {
    if (!this.runClockTimer) {
      this.runClockTimer = setInterval(() => {
        if (this.state.direction === 'infuse' || this.state.direction === 'withdraw') {
          this.state.elapsedRunTimeSec += 1;
          this.emitTelemetry();
        }
      }, 1000);
    }
  }

  private stopRunClock() {
    if (this.runClockTimer) {
      clearInterval(this.runClockTimer);
      this.runClockTimer = null;
    }
  }

  public resetRunClock() {
    this.state.elapsedRunTimeSec = 0;
    this.emitTelemetry();
  }

  // -------------------------------------------------------------------------
  // High-Level Motion Commands
  // -------------------------------------------------------------------------

  public async infuse() {
    this.state.direction = 'infuse';
    this.state.prompt = '>';
    this.state.statusText = 'INFUSING';
    this.state.statusCategory = 'Running';
    this.state.isStalled = false;
    this.state.stallMessage = '';
    this.state.continuousActive = false;

    // Ready active stroke tracking without resetting cumulative ivolume/wvolume counters
    this.currentStrokeVolume = 0;
    this.state.currentStrokeVolume = 0;
    this.state.strokeElapsedSec = 0;
    this.state.strokePercent = 0;
    this.state.carriagePercent = 0;

    this.startRunClock();
    this.emitTelemetry();

    // Ensure infuse rate is synchronized to hardware before run
    const unit = normalizeSerialUnit(this.state.infuseRateUnit || this.state.flowUnit || 'ml/min');
    const rate = this.state.infuseRate || this.state.flowRate || 2.5;
    await this.sendCommand(`irate ${rate} ${unit}`);
    await this.sendCommand('irun');
  }

  public async withdraw() {
    this.state.direction = 'withdraw';
    this.state.prompt = '<';
    this.state.statusText = 'WITHDRAWING';
    this.state.statusCategory = 'Running';
    this.state.isStalled = false;
    this.state.stallMessage = '';
    this.state.continuousActive = false;

    // Ready active stroke tracking without resetting cumulative ivolume/wvolume counters
    this.currentStrokeVolume = 0;
    this.state.currentStrokeVolume = 0;
    this.state.strokeElapsedSec = 0;
    this.state.strokePercent = 0;
    this.state.carriagePercent = 100;

    this.startRunClock();
    this.emitTelemetry();

    // Ensure withdraw rate (wrate) is synchronized to hardware before wrun
    const unit = normalizeSerialUnit(this.state.withdrawRateUnit || this.state.flowUnit || 'ml/min');
    const rate = this.state.withdrawRate || this.state.flowRate || 2.5;
    await this.sendCommand(`wrate ${rate} ${unit}`);
    await this.sendCommand('wrun');
  }

  public async stop() {
    this.state.continuousActive = false;
    this.state.isProgramRunning = false;
    this.state.direction = 'idle';
    this.state.prompt = ':';
    this.state.statusText = 'STOPPED';
    this.state.statusCategory = 'Idle';
    this.state.isStalled = false;
    this.state.stallMessage = '';
    this.stopRunClock();
    if (this.programAbortController) {
      this.programAbortController.abort();
      this.programAbortController = null;
    }
    this.emitTelemetry();
    await this.sendCommand('stop');
  }

  public async resetCounters(): Promise<void> {
    // 1. Immediately reset internal telemetry state so UI updates in 0ms
    this.state.infusedVolume = 0.0;
    this.state.withdrawnVolume = 0.0;
    this.currentStrokeVolume = 0.0;
    this.state.currentStrokeVolume = 0.0;
    this.state.totalContinuousVolume = 0.0;
    this.state.strokeElapsedSec = 0;
    this.state.strokePercent = 0;
    this.state.elapsedRunTimeSec = 0;
    this.state.carriagePercent = 0;
    this.state.isStalled = false;
    this.state.stallMessage = '';
    this.state.statusText = 'STOPPED (Idle)';
    this.state.statusCategory = 'Idle';
    this.state.prompt = ':';
    this.emitTelemetry();
    this.emitLog('info', '[i] Counters reset and clearing pump hardware registers...');

    // 2. Transmit hardware clear commands to pump
    if (this.state.isRealHardware && this.port && this.port.writable) {
      await this.sendCommand('civolume');
      await this.sendCommand('cwvolume');
      await this.sendCommand('cvolume');
      await this.sendCommand('poll', false);
      await this.sendCommand('ivolume', false);
      await this.sendCommand('wvolume', false);
    }
    this.emitTelemetry();
  }

  public async setParameters(params: {
    diameterMm?: number;
    syringeVolume?: number;
    syringeVolumeUnit?: string;
    flowRate?: number;
    flowUnit?: string;
    infuseRate?: number;
    infuseRateUnit?: string;
    withdrawRate?: number;
    withdrawRateUnit?: string;
    targetVolume?: number | null;
    targetUnit?: string;
    volumeUnit?: string;
    strokeTarget?: number | null;
    infuseTarget?: number | null;
    withdrawTarget?: number | null;
    targetTime?: string | null;
    targetTimeEnabled?: boolean;
    motorForce?: number;
    baudRate?: number;
  }) {
    if (params.diameterMm !== undefined) {
      this.state.diameterMm = params.diameterMm;
      await this.sendCommand(`diameter ${params.diameterMm}`);
    }
    if (params.syringeVolume !== undefined) {
      this.state.syringeVolume = params.syringeVolume;
      this.state.syringeVolumeUnit = params.syringeVolumeUnit || 'ml';
      await this.sendCommand(`svolume ${params.syringeVolume} ${this.state.syringeVolumeUnit}`);
    }
    if (params.targetUnit !== undefined) {
      this.state.targetUnit = normalizeSerialUnit(params.targetUnit);
      this.state.volumeUnit = normalizeSerialUnit(params.targetUnit);
    }
    if (params.volumeUnit !== undefined) {
      this.state.volumeUnit = normalizeSerialUnit(params.volumeUnit);
    }

    // Handle Infuse Rate - only send if explicitly provided
    const infRate = params.infuseRate ?? params.flowRate;
    if (infRate !== undefined) {
      const infUnit = normalizeSerialUnit(params.infuseRateUnit ?? params.flowUnit ?? this.state.infuseRateUnit ?? 'ml/min');
      this.state.infuseRate = infRate;
      this.state.infuseRateUnit = infUnit;
      this.state.flowRate = infRate;
      this.state.flowUnit = infUnit;
      await this.sendCommand(`irate ${infRate} ${infUnit}`);
    }

    // Handle Withdraw Rate - only send if explicitly provided (do not fall back to this.state.withdrawRate)
    const wthRate = params.withdrawRate;
    if (wthRate !== undefined) {
      const wthUnit = normalizeSerialUnit(params.withdrawRateUnit ?? params.flowUnit ?? this.state.withdrawRateUnit ?? 'ml/min');
      this.state.withdrawRate = wthRate;
      this.state.withdrawRateUnit = wthUnit;
      await this.sendCommand(`wrate ${wthRate} ${wthUnit}`);
    }

    // Handle Target Volume (Single tvolume for the pump)
    if (params.targetVolume !== undefined) {
      this.state.targetVolume = params.targetVolume;
      this.state.strokeTarget = params.strokeTarget ?? params.targetVolume;
      this.state.infuseTarget = params.targetVolume;
      this.state.withdrawTarget = params.targetVolume;
      if (params.targetVolume === null || params.targetVolume <= 0) {
        await this.sendCommand('ctvolume');
      } else {
        const unit = normalizeSerialUnit(params.targetUnit || this.state.targetUnit || 'ml');
        await this.sendCommand(`tvolume ${params.targetVolume} ${unit}`);
      }
    }

    // Handle Target Time (Used only for single infuse/withdraw modes, not continuous)
    if (params.targetTimeEnabled !== undefined) {
      this.state.targetTimeEnabled = params.targetTimeEnabled;
    }
    if (params.targetTime !== undefined) {
      this.state.targetTime = params.targetTime;
    }
    if (this.state.targetTimeEnabled && this.state.targetTime) {
      await this.sendCommand(`ttime ${this.state.targetTime}`);
    } else if (params.targetTimeEnabled === false || params.targetTime === null) {
      await this.sendCommand('cttime');
    }

    if (params.motorForce !== undefined) {
      this.state.motorForce = params.motorForce;
      await this.sendCommand(`force ${params.motorForce}`);
    }
    if (params.baudRate !== undefined) {
      this.state.baudRate = params.baudRate;
      await this.sendCommand(`baud ${params.baudRate}`);
    }

    this.emitTelemetry();
    await this.sendCommand('poll', false);
  }

  // -------------------------------------------------------------------------
  // Continuous Push-Pull Automation
  // -------------------------------------------------------------------------

  public async startContinuousCycle(
    flowRate: number,
    flowUnit: string,
    strokeVolume: number,
    totalCycles: number = 0,
    withdrawRate?: number,
    withdrawRateUnit?: string,
    volumeUnit: string = 'ml'
  ) {
    const infUnit = normalizeSerialUnit(flowUnit);
    const wthUnit = normalizeSerialUnit(withdrawRateUnit || flowUnit);
    const volUnit = normalizeSerialUnit(volumeUnit || this.state.volumeUnit || 'ml');
    const wRate = withdrawRate ?? flowRate;

    this.isTransitioningCycle = false;
    this.lastCycleTransitionTime = Date.now();
    this.state.continuousActive = true;
    this.state.currentCycle = 1;
    this.state.totalCycles = totalCycles;
    this.state.flowRate = flowRate;
    this.state.flowUnit = infUnit;
    this.state.infuseRate = flowRate;
    this.state.infuseRateUnit = infUnit;
    this.state.withdrawRate = wRate;
    this.state.withdrawRateUnit = wthUnit;
    this.state.targetVolume = strokeVolume;
    this.state.strokeTarget = strokeVolume;
    this.state.targetUnit = volUnit;
    this.state.volumeUnit = volUnit;
    this.state.cyclePhase = 'infusing_A';
    this.state.isStalled = false;
    this.state.stallMessage = '';
    this.state.direction = 'infuse';
    this.state.prompt = '>';
    this.state.statusText = 'CONTINUOUS: FORWARD STROKE (INFUSE A / REFILL B)';
    this.state.statusCategory = 'Running';
    this.currentStrokeVolume = 0;
    this.state.currentStrokeVolume = 0;
    this.state.totalContinuousVolume = 0;
    this.state.strokeElapsedSec = 0;
    this.state.strokePercent = 0;
    this.state.carriagePercent = 0;
    this.startRunClock();

    this.emitLog(
      'cycle',
      `[+] STARTING CONTINUOUS PUSH/PULL (Infuse: ${flowRate} ${infUnit}, Withdraw: ${wRate} ${wthUnit}, Stroke: ${strokeVolume} ${volUnit}, Cycles: ${totalCycles === 0 ? 'Infinite (24/7)' : totalCycles})`
    );

    await this.sendCommand('stop');
    // Clear any hardware timer target to ensure continuous cycles run without unexpected time stops
    await this.sendCommand('cttime');
    // Do NOT send diameter here to prevent hardware from resetting configured flow rates
    await this.sendCommand(`irate ${flowRate} ${infUnit}`);
    await this.sendCommand(`wrate ${wRate} ${wthUnit}`);
    await this.sendCommand(`tvolume ${strokeVolume} ${volUnit}`);

    this.emitTelemetry();
    this.emitLog('cycle', `Cycle #1 - Phase 1: Forward Stroke (Infuse A / Refill B)`);
    await this.sendCommand('irun');
  }

  private async handleContinuousTargetReached() {
    if (!this.state.continuousActive) return;
    if (this.isTransitioningCycle) return;

    const now = Date.now();
    if (now - this.lastCycleTransitionTime < 1500) {
      return;
    }

    this.isTransitioningCycle = true;
    this.lastCycleTransitionTime = now;

    try {
      if (this.state.cyclePhase === 'infusing_A') {
        this.emitLog('cycle', `Cycle #${this.state.currentCycle} - Forward stroke complete. Switching to reverse stroke...`);
        this.state.cyclePhase = 'withdrawing_A';
        this.state.direction = 'withdraw';
        this.state.prompt = '<';
        this.state.statusText = 'CONTINUOUS: REVERSE STROKE (INFUSE B / REFILL A)';
        this.state.statusCategory = 'Running';
        this.currentStrokeVolume = 0;
        this.state.currentStrokeVolume = 0;
        this.state.strokeElapsedSec = 0;
        this.state.strokePercent = 0;
        this.state.carriagePercent = 100;
        this.emitTelemetry();

        await this.sendCommand('stop');
        await this.sendCommand('cttime');

        // Allow mechanical settle between stroke reversals
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!this.state.continuousActive) return;

        // Synchronize withdraw rate before reverse run
        const wRate = this.state.withdrawRate || this.state.flowRate || 2.5;
        const wthUnit = normalizeSerialUnit(this.state.withdrawRateUnit || this.state.flowUnit || 'ml/min');
        await this.sendCommand(`wrate ${wRate} ${wthUnit}`);
        await this.sendCommand('wrun');
        this.emitLog('cycle', `Cycle #${this.state.currentCycle} - Phase 2: Reverse Stroke active.`);
      } else if (this.state.cyclePhase === 'withdrawing_A') {
        this.emitLog('cycle', `Completed Cycle #${this.state.currentCycle} bidirectional push/pull delivery.`);

        if (this.state.totalCycles > 0 && this.state.currentCycle >= this.state.totalCycles) {
          this.emitLog('cycle', `[+] Completed target ${this.state.totalCycles} continuous cycles. Halting.`);
          await this.stop();
          return;
        }

        this.state.currentCycle += 1;
        this.state.cyclePhase = 'infusing_A';
        this.state.direction = 'infuse';
        this.state.prompt = '>';
        this.state.statusText = 'CONTINUOUS: FORWARD STROKE (INFUSE A / REFILL B)';
        this.state.statusCategory = 'Running';
        this.currentStrokeVolume = 0;
        this.state.currentStrokeVolume = 0;
        this.state.strokeElapsedSec = 0;
        this.state.strokePercent = 0;
        this.state.carriagePercent = 0;
        this.emitTelemetry();

        await this.sendCommand('stop');
        await this.sendCommand('cttime');

        // Allow mechanical settle between stroke reversals
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!this.state.continuousActive) return;

        // Synchronize infuse rate before forward run
        const infRate = this.state.infuseRate || this.state.flowRate || 2.5;
        const infUnit = normalizeSerialUnit(this.state.infuseRateUnit || this.state.flowUnit || 'ml/min');
        await this.sendCommand(`irate ${infRate} ${infUnit}`);
        await this.sendCommand('irun');
        this.emitLog('cycle', `Cycle #${this.state.currentCycle} - Phase 1: Forward Stroke active.`);
      }
    } finally {
      // Release lock after a brief debounce period so trailing hardware telemetry does not falsely re-trigger
      setTimeout(() => {
        this.isTransitioningCycle = false;
      }, 1000);
    }
  }

  // -------------------------------------------------------------------------
  // Custom Multi-Step Program Engine
  // -------------------------------------------------------------------------

  public async runCustomProgram(steps: ProgramStep[]) {
    if (steps.length === 0) return;

    this.state.isProgramRunning = true;
    this.state.totalProgramSteps = steps.length;
    this.programAbortController = new AbortController();
    const signal = this.programAbortController.signal;

    this.emitLog('info', `[+] Starting custom pump program with ${steps.length} steps.`);

    try {
      for (let i = 0; i < steps.length; i++) {
        if (signal.aborted || !this.state.isProgramRunning) break;

        const step = steps[i];
        this.state.currentProgramStep = i + 1;
        this.emitTelemetry();

        this.emitLog('info', `Program Step ${i + 1}/${steps.length}: ${step.type.toUpperCase()}`);

        if (step.type === 'infuse') {
          await this.sendCommand(`irate ${step.rate} ${step.rateUnit}`);
          await this.sendCommand(`tvolume ${step.volume} ${step.volumeUnit}`);
          await this.sendCommand('cvolume');
          await this.sendCommand('irun');
          await this.waitForTargetOrSignal(signal);
        } else if (step.type === 'withdraw') {
          await this.sendCommand(`wrate ${step.rate} ${step.rateUnit}`);
          await this.sendCommand(`tvolume ${step.volume} ${step.volumeUnit}`);
          await this.sendCommand('cvolume');
          await this.sendCommand('wrun');
          await this.waitForTargetOrSignal(signal);
        } else if (step.type === 'pause') {
          await this.sendCommand('stop');
          const delaySec = step.durationSec || 5;
          this.emitLog('info', `Pausing program for ${delaySec} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        } else if (step.type === 'ramp') {
          await this.sendCommand(`irate ${step.rate} ${step.rateUnit}`);
          await this.sendCommand(`tvolume ${step.volume} ${step.volumeUnit}`);
          await this.sendCommand('irun');
          await this.waitForTargetOrSignal(signal);
        }
      }

      this.emitLog('info', `[+] Custom program execution completed.`);
    } catch (err: any) {
      this.emitLog('error', `Program execution halted: ${err.message}`);
    } finally {
      this.state.isProgramRunning = false;
      this.state.currentProgramStep = 0;
      this.emitTelemetry();
    }
  }

  private waitForTargetOrSignal(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (signal.aborted) {
          clearInterval(check);
          reject(new Error('Aborted'));
        } else if (this.state.prompt === 'T*' || this.state.direction === 'idle') {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });
  }
}

// Singleton Instance
export const pumpController = new Legato270WebController();
