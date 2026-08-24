/**
 * Web Serial API Controller & Virtual Simulator for KD Scientific Legato 270
 * Runs directly inside modern browsers (Chrome, Edge, Opera) with ZERO software installation.
 */

export type PumpStatusPrompt = ':' | '>' | '<' | '*' | 'T*' | '!' | 'O' | '?' | 'DISCONNECTED';

export interface PumpTelemetry {
  isConnected: boolean;
  isRealHardware: boolean;
  portName: string;
  baudRate: number;
  prompt: PumpStatusPrompt;
  statusText: string;
  direction: 'infuse' | 'withdraw' | 'idle' | 'paused';
  flowRate: number;
  flowUnit: string;
  targetVolume: number | null;
  targetUnit: string;
  infusedVolume: number;
  withdrawnVolume: number;
  diameterMm: number;
  carriagePercent: number; // 0 to 100%
  // Continuous cycling state
  continuousActive: boolean;
  currentCycle: number;
  totalCycles: number; // 0 = infinite
  cyclePhase: 'infusing_A' | 'withdrawing_A' | 'settling' | 'idle';
  elapsedRunTimeSec: number;
}

export interface SerialLogItem {
  id: string;
  timestamp: string;
  type: 'tx' | 'rx' | 'info' | 'error' | 'cycle';
  text: string;
}

export type TelemetryListener = (telemetry: PumpTelemetry) => void;
export type LogListener = (log: SerialLogItem) => void;

export class Legato270WebController {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private readableStreamClosed: any = null;
  private writableStreamClosed: any = null;
  private isReading = false;
  private pollTimer: any = null;
  private simTimer: any = null;
  private cycleTimer: any = null;
  private runClockTimer: any = null;

  private telemetryListeners: TelemetryListener[] = [];
  private logListeners: LogListener[] = [];

  public state: PumpTelemetry = {
    isConnected: true,
    isRealHardware: false, // Default to simulator until user clicks Connect USB
    portName: 'Virtual Legato 270 (Simulator)',
    baudRate: 115200,
    prompt: ':',
    statusText: 'STOPPED',
    direction: 'idle',
    flowRate: 2.5,
    flowUnit: 'ml/min',
    targetVolume: 5.0,
    targetUnit: 'ml',
    infusedVolume: 0.0,
    withdrawnVolume: 0.0,
    diameterMm: 14.50,
    carriagePercent: 45,
    continuousActive: false,
    currentCycle: 0,
    totalCycles: 0,
    cyclePhase: 'idle',
    elapsedRunTimeSec: 0,
  };

  private valveDelaySec = 0.3;

  constructor() {
    this.startSimulationEngine();
  }

  public subscribeTelemetry(listener: TelemetryListener) {
    this.telemetryListeners.push(listener);
    listener(this.state);
    return () => {
      this.telemetryListeners = this.telemetryListeners.filter(l => l !== listener);
    };
  }

  public subscribeLog(listener: LogListener) {
    this.logListeners.push(listener);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== listener);
    };
  }

  private emitTelemetry() {
    this.telemetryListeners.forEach(l => l({ ...this.state }));
  }

  private emitLog(type: 'tx' | 'rx' | 'info' | 'error' | 'cycle', text: string) {
    const item: SerialLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      text,
    };
    this.logListeners.forEach(l => l(item));
  }

  /**
   * Check if Web Serial API is supported in current browser
   */
  public static isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Request user permission and connect to physical USB pump
   */
  public async connectUSB(baudRate: number = 115200): Promise<boolean> {
    if (!Legato270WebController.isWebSerialSupported()) {
      this.emitLog('error', 'Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return false;
    }

    try {
      this.emitLog('info', `Requesting USB serial port access @ ${baudRate} baud...`);
      const serial = (navigator as any).serial;
      this.port = await serial.requestPort();
      await this.port.open({ baudRate });

      this.stopSimulationEngine();

      this.state.isConnected = true;
      this.state.isRealHardware = true;
      this.state.baudRate = baudRate;
      this.state.portName = 'Connected (USB Serial VCP)';
      this.emitTelemetry();
      this.emitLog('info', `Connected to physical USB port @ ${baudRate} bps.`);

      this.startReading();

      // Interrogate and query all actual hardware settings and live state from the pump
      this.emitLog('info', 'Querying pump system status, rates, dimensions, and positions...');
      await this.queryAllPumpParameters();

      this.startHardwarePolling();
      return true;
    } catch (err: any) {
      this.emitLog('error', `Connection failed: ${err.message || err}`);
      return false;
    }
  }

  public async disconnectUSB() {
    this.stopHardwarePolling();
    this.stopContinuousCycle();

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (e) {
      console.error(e);
    }

    this.state.isConnected = true;
    this.state.isRealHardware = false;
    this.state.portName = 'Virtual Legato 270 (Simulator)';
    this.emitTelemetry();
    this.emitLog('info', 'Disconnected from USB port. Switched to browser simulation engine.');
    this.startSimulationEngine();
  }

  private async startReading() {
    if (!this.port || !this.port.readable) return;
    this.isReading = true;

    try {
      while (this.port.readable && this.isReading) {
        const textDecoder = new TextDecoderStream();
        this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        this.reader = textDecoder.readable.getReader();

        let buffer = '';
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            buffer += value;
            if (buffer.includes('\n') || buffer.includes('\r') || this.containsPrompt(buffer)) {
              const lines = buffer.split(/[\r\n]+/);
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed) {
                  this.handleIncomingLine(trimmed);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // Stream error or cancelled
    }
  }

  private containsPrompt(text: string): boolean {
    const prompts = [':', '>', '<', '*', 'T*', '!', 'O', '?'];
    return prompts.some(p => text.trim().endsWith(p));
  }

  public async queryAllPumpParameters(): Promise<void> {
    // Send standard query commands sequence with small pauses
    const queryList = ['echo off', 'ver', 'diameter', 'irate', 'tvolume', 'ivolume', 'wvolume', 'poll'];
    for (const cmd of queryList) {
      await this.sendCommand(cmd, true);
      await new Promise(r => setTimeout(r, 60));
    }
  }

  private handleIncomingLine(line: string) {
    this.emitLog('rx', line);

    // Extract prompt from line (e.g., 00:, 00>, 00<, 00*, 00T*, 00!)
    const promptMatch = line.match(/(T\*|[:><*!O?])$/);
    if (promptMatch) {
      const p = promptMatch[1] as PumpStatusPrompt;
      this.state.prompt = p;
      this.updateStatusFromPrompt(p);
    }

    // Parse rate (e.g. "2.5000 ml/min" or "00:2.5000 ml/min")
    if (line.includes('ml/min') || line.includes('ml/hr') || line.includes('ul/min') || line.includes('ul/hr') || line.includes('nl/min') || line.includes('nl/hr')) {
      const match = line.match(/([\d.]+)\s*(ml\/min|ml\/hr|ul\/min|ul\/hr|nl\/min|nl\/hr)/i);
      if (match) {
        this.state.flowRate = parseFloat(match[1]);
        this.state.flowUnit = match[2].toLowerCase();
      }
    }

    // Parse syringe diameter (e.g. "14.500 mm" or "00:14.500 mm")
    if (line.includes('mm')) {
      const match = line.match(/([\d.]+)\s*mm/i);
      if (match) {
        this.state.diameterMm = parseFloat(match[1]);
      }
    }

    // Parse target volume (e.g. "5.0000 ml" or "00:5.0000 ml" or "tvolume: 5 ml")
    if (line.toLowerCase().includes('tvol') || line.match(/[\d.]+\s*(ml|ul|nl)$/i)) {
      const match = line.match(/([\d.]+)\s*(ml|ul|nl)\b/i);
      if (match) {
        const val = parseFloat(match[1]);
        // If not already detected as infused or withdrawn
        if (!line.toLowerCase().includes('ivol') && !line.toLowerCase().includes('wvol')) {
          this.state.targetVolume = val;
          this.state.targetUnit = match[2].toLowerCase();
        }
      }
    }

    // Parse infused volume (ivolume query response e.g. "00:1.2450 ml" or "1.2450 ml")
    if (line.toLowerCase().includes('ivol') || (this.state.direction === 'infuse' && line.match(/[\d.]+\s*(ml|ul|nl)/i))) {
      const match = line.match(/([\d.]+)\s*(ml|ul|nl)/i);
      if (match) {
        this.state.infusedVolume = parseFloat(match[1]);
      }
    }

    // Parse withdrawn volume (wvolume query response e.g. "00:0.8500 ml")
    if (line.toLowerCase().includes('wvol') || (this.state.direction === 'withdraw' && line.match(/[\d.]+\s*(ml|ul|nl)/i))) {
      const match = line.match(/([\d.]+)\s*(ml|ul|nl)/i);
      if (match) {
        this.state.withdrawnVolume = parseFloat(match[1]);
      }
    }

    // Calculate carriage position percentage
    if (this.state.targetVolume && this.state.targetVolume > 0) {
      if (this.state.direction === 'withdraw') {
        const pct = 100 - (this.state.withdrawnVolume / this.state.targetVolume) * 100;
        this.state.carriagePercent = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
      } else {
        const pct = (this.state.infusedVolume / this.state.targetVolume) * 100;
        this.state.carriagePercent = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
      }
    }

    this.emitTelemetry();

    // Check if continuous push/pull cycle transition is needed
    if (this.state.continuousActive && this.state.prompt === 'T*') {
      this.handleContinuousTargetReached();
    }
  }

  private updateStatusFromPrompt(prompt: PumpStatusPrompt) {
    switch (prompt) {
      case ':':
        this.state.statusText = 'STOPPED';
        this.state.direction = 'idle';
        break;
      case '>':
        this.state.statusText = 'INFUSING (Forward)';
        this.state.direction = 'infuse';
        break;
      case '<':
        this.state.statusText = 'WITHDRAWING (Reverse)';
        this.state.direction = 'withdraw';
        break;
      case '*':
        this.state.statusText = 'PAUSED';
        this.state.direction = 'paused';
        break;
      case 'T*':
        this.state.statusText = 'TARGET REACHED';
        this.state.direction = 'idle';
        break;
      case '!':
        this.state.statusText = 'ALARM / MOTOR STALL';
        this.state.direction = 'idle';
        break;
      case 'O':
      case '?':
        this.state.statusText = 'OUT OF RANGE / ERROR';
        break;
    }
  }

  private startHardwarePolling() {
    this.stopHardwarePolling();
    this.pollTimer = setInterval(async () => {
      if (this.state.isRealHardware && this.state.isConnected) {
        await this.sendCommand('poll', false);
        if (this.state.direction !== 'idle') {
          await this.sendCommand('ivolume', false);
        }
      }
    }, 600);
  }

  private stopHardwarePolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Send ASCII command to the pump
   */
  public async sendCommand(command: string, logTx: boolean = true): Promise<void> {
    const cleanCmd = command.trim();
    if (!cleanCmd) return;

    if (logTx) {
      this.emitLog('tx', cleanCmd);
    }

    if (this.state.isRealHardware && this.port && this.port.writable) {
      try {
        const textEncoder = new TextEncoderStream();
        this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
        const writer = textEncoder.writable.getWriter();
        await writer.write(cleanCmd + '\r');
        writer.releaseLock();
      } catch (err: any) {
        this.emitLog('error', `Write error: ${err.message}`);
      }
      return;
    }

    // Virtual Simulator Execution
    this.simulateCommand(cleanCmd);
  }

  /**
   * Internal Simulator for instant zero-install browser testing
   */
  private simulateCommand(cmd: string) {
    const lower = cmd.toLowerCase();
    let rx = '';

    if (lower === 'irun' || lower === 'run') {
      this.state.direction = 'infuse';
      this.state.prompt = '>';
      this.state.statusText = 'INFUSING (Forward)';
      rx = '00:>';
      this.startRunClock();
    } else if (lower === 'wrun') {
      this.state.direction = 'withdraw';
      this.state.prompt = '<';
      this.state.statusText = 'WITHDRAWING (Reverse)';
      rx = '00:<';
      this.startRunClock();
    } else if (lower === 'stop' || lower === 'stp') {
      this.state.direction = 'idle';
      this.state.prompt = ':';
      this.state.statusText = 'STOPPED';
      rx = '00::';
      this.stopRunClock();
    } else if (lower === 'pause') {
      this.state.direction = 'paused';
      this.state.prompt = '*';
      this.state.statusText = 'PAUSED';
      rx = '00:*';
    } else if (lower === 'restart') {
      this.state.direction = this.state.direction === 'paused' ? 'infuse' : this.state.direction;
      this.state.prompt = '>';
      this.state.statusText = 'INFUSING (Forward)';
      rx = '00:>';
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
      }
      rx = `00:${this.state.targetVolume || 0} ${this.state.targetUnit}\n00:${this.state.prompt}`;
    } else if (lower === 'ctvolume') {
      this.state.targetVolume = null;
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
    }

    setTimeout(() => {
      this.emitLog('rx', rx);
      this.emitTelemetry();
    }, 40);
  }

  private startSimulationEngine() {
    this.stopSimulationEngine();
    this.simTimer = setInterval(() => {
      if (this.state.isRealHardware) return;
      if (this.state.direction === 'idle' || this.state.direction === 'paused') return;

      const ratePerSec = this.state.flowUnit.includes('/hr')
        ? this.state.flowRate / 3600
        : this.state.flowRate / 60;
      const dt = 0.1; // 100ms tick
      const dVol = ratePerSec * dt;

      if (this.state.direction === 'infuse') {
        this.state.infusedVolume += dVol;
        this.state.carriagePercent = Math.min(95, this.state.carriagePercent + 0.35);

        if (this.state.targetVolume && this.state.infusedVolume >= this.state.targetVolume) {
          this.state.direction = 'idle';
          this.state.prompt = 'T*';
          this.state.statusText = 'TARGET REACHED';
          this.emitLog('rx', `00:Target reached (${this.state.targetVolume} ml)\n00:T*`);
          this.emitTelemetry();

          if (this.state.continuousActive) {
            this.handleContinuousTargetReached();
          }
        }
      } else if (this.state.direction === 'withdraw') {
        this.state.withdrawnVolume += dVol;
        this.state.carriagePercent = Math.max(5, this.state.carriagePercent - 0.35);

        if (this.state.targetVolume && this.state.withdrawnVolume >= this.state.targetVolume) {
          this.state.direction = 'idle';
          this.state.prompt = 'T*';
          this.state.statusText = 'TARGET REACHED';
          this.emitLog('rx', `00:Target reached (${this.state.targetVolume} ml)\n00:T*`);
          this.emitTelemetry();

          if (this.state.continuousActive) {
            this.handleContinuousTargetReached();
          }
        }
      }

      this.emitTelemetry();
    }, 100);
  }

  private stopSimulationEngine() {
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

  // -------------------------------------------------------------------------
  // In-Browser Continuous Push-Pull Automation Routine
  // -------------------------------------------------------------------------

  /**
   * Start 24/7 or fixed-cycle continuous push-pull sequence
   */
  public async startContinuousCycle(
    flowRate: number,
    flowUnit: string,
    strokeVolume: number,
    totalCycles: number = 0,
    valveDelaySec: number = 0.3
  ) {
    this.valveDelaySec = valveDelaySec;
    this.state.continuousActive = true;
    this.state.currentCycle = 1;
    this.state.totalCycles = totalCycles;
    this.state.flowRate = flowRate;
    this.state.flowUnit = flowUnit;
    this.state.targetVolume = strokeVolume;
    this.state.cyclePhase = 'infusing_A';

    this.emitLog('cycle', `[+] STARTING CONTINUOUS PUSH/PULL (Rate: ${flowRate} ${flowUnit}, Stroke: ${strokeVolume} ml, Target Cycles: ${totalCycles === 0 ? 'Infinite' : totalCycles})`);

    await this.sendCommand('stop');
    await this.sendCommand(`irate ${flowRate} ${flowUnit}`);
    await this.sendCommand(`wrate ${flowRate} ${flowUnit}`);
    await this.sendCommand(`tvolume ${strokeVolume} ml`);
    await this.sendCommand('cvolume');

    this.state.infusedVolume = 0;
    this.state.withdrawnVolume = 0;
    this.emitTelemetry();

    // Start Phase 1 (Forward Infuse A / Refill B)
    this.emitLog('cycle', `Cycle #1 - Phase 1: Forward Stroke (Infuse A & Refill B)`);
    await this.sendCommand('irun');
  }

  public async stopContinuousCycle() {
    this.state.continuousActive = false;
    this.state.cyclePhase = 'idle';
    await this.sendCommand('stop');
    this.emitLog('cycle', `[-] Continuous Push/Pull stopped by user.`);
    this.emitTelemetry();
  }

  private async handleContinuousTargetReached() {
    if (!this.state.continuousActive) return;

    if (this.state.cyclePhase === 'infusing_A') {
      this.state.cyclePhase = 'settling';
      this.emitLog('cycle', `Phase 1 stroke complete. Settling check-valves for ${this.valveDelaySec}s...`);
      this.emitTelemetry();

      setTimeout(async () => {
        if (!this.state.continuousActive) return;
        this.state.cyclePhase = 'withdrawing_A';
        this.state.withdrawnVolume = 0;
        this.emitLog('cycle', `Cycle #${this.state.currentCycle} - Phase 2: Reverse Stroke (Infuse B & Refill A)`);
        await this.sendCommand('cvolume');
        await this.sendCommand('wrun');
      }, this.valveDelaySec * 1000);

    } else if (this.state.cyclePhase === 'withdrawing_A') {
      this.emitLog('cycle', `Completed Cycle #${this.state.currentCycle} bidirectional push/pull delivery.`);

      if (this.state.totalCycles > 0 && this.state.currentCycle >= this.state.totalCycles) {
        this.emitLog('cycle', `[+] Successfully reached target ${this.state.totalCycles} cycles! Halting pump.`);
        this.stopContinuousCycle();
        return;
      }

      this.state.cyclePhase = 'settling';
      this.state.currentCycle += 1;
      this.emitTelemetry();

      setTimeout(async () => {
        if (!this.state.continuousActive) return;
        this.state.cyclePhase = 'infusing_A';
        this.state.infusedVolume = 0;
        this.emitLog('cycle', `Cycle #${this.state.currentCycle} - Phase 1: Forward Stroke (Infuse A & Refill B)`);
        await this.sendCommand('cvolume');
        await this.sendCommand('irun');
      }, this.valveDelaySec * 1000);
    }
  }
}

// Global Singleton Instance
export const pumpController = new Legato270WebController();
