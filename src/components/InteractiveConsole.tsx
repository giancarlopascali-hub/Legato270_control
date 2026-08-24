import React, { useState, useEffect, useRef } from 'react';
import { VirtualPumpState } from '../types';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle, Cpu, Pause, Play, Power, RotateCcw, Send, Square, Terminal, Trash2, Wifi, Zap } from 'lucide-react';

export const InteractiveConsole: React.FC = () => {
  const [useRealSerial, setUseRealSerial] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Serial Port Reference for Web Serial API
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);

  // Virtual Pump State
  const [state, setState] = useState<VirtualPumpState>({
    connected: true,
    isVirtual: true,
    statusPrompt: ':',
    direction: 'idle',
    rate: 2.5,
    rateUnit: 'ml/min',
    diameter: 14.50,
    targetVolume: 5.0,
    infusedVolume: 0.0,
    withdrawnVolume: 0.0,
    carriagePositionMm: 45.0,
    log: [
      {
        id: '1',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        text: 'KD Scientific Legato 270 Virtual Simulator Initialized. Ready for ASCII commands or real USB serial connection.'
      },
      {
        id: '2',
        timestamp: new Date().toLocaleTimeString(),
        type: 'rx',
        text: '00:Legato 270 v2.1.0\n00::'
      }
    ]
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log]);

  // Virtual pump animation tick
  useEffect(() => {
    if (state.direction === 'idle' || state.direction === 'paused') return;

    const interval = setInterval(() => {
      setState(prev => {
        if (prev.direction === 'idle' || prev.direction === 'paused') return prev;

        // Rate in ml/sec
        const ratePerSec = prev.rateUnit.includes('/hr') ? prev.rate / 3600 : prev.rate / 60;
        const dt = 0.1; // 100ms
        const dVol = ratePerSec * dt;

        let newInfused = prev.infusedVolume;
        let newWithdrawn = prev.withdrawnVolume;
        let newCarriage = prev.carriagePositionMm;
        let newDirection = prev.direction;
        let newPrompt = prev.statusPrompt;

        if (prev.direction === 'inf') {
          newInfused += dVol;
          newCarriage = Math.min(95, newCarriage + 0.3);

          // Check if target volume reached
          if (prev.targetVolume && newInfused >= prev.targetVolume) {
            newDirection = 'idle';
            newPrompt = 'T*';
            return {
              ...prev,
              infusedVolume: prev.targetVolume,
              carriagePositionMm: newCarriage,
              direction: 'idle',
              statusPrompt: 'T*',
              log: [
                ...prev.log,
                {
                  id: String(Date.now()),
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'rx',
                  text: `00:Target Volume Reached (${prev.targetVolume} ml)\n00:T*`
                }
              ]
            };
          }
        } else if (prev.direction === 'wdr') {
          newWithdrawn += dVol;
          newCarriage = Math.max(5, newCarriage - 0.3);

          if (prev.targetVolume && newWithdrawn >= prev.targetVolume) {
            newDirection = 'idle';
            newPrompt = 'T*';
            return {
              ...prev,
              withdrawnVolume: prev.targetVolume,
              carriagePositionMm: newCarriage,
              direction: 'idle',
              statusPrompt: 'T*',
              log: [
                ...prev.log,
                {
                  id: String(Date.now()),
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'rx',
                  text: `00:Target Volume Reached (${prev.targetVolume} ml)\n00:T*`
                }
              ]
            };
          }
        }

        return {
          ...prev,
          infusedVolume: newInfused,
          withdrawnVolume: newWithdrawn,
          carriagePositionMm: newCarriage,
          direction: newDirection,
          statusPrompt: newPrompt
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [state.direction, state.rate, state.rateUnit, state.targetVolume]);

  // Connect via Web Serial API (Chrome/Edge)
  const connectRealSerial = async () => {
    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge on desktop, or continue with the Virtual Simulator.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate });
      serialPortRef.current = port;

      setState(prev => ({
        ...prev,
        connected: true,
        isVirtual: false,
        log: [
          ...prev.log,
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString(),
            type: 'info',
            text: `[+] Connected to physical serial port @ ${baudRate} bps.`
          }
        ]
      }));

      // Start reading loop
      readSerialLoop(port);
    } catch (err: any) {
      console.error('Serial connect error:', err);
      setState(prev => ({
        ...prev,
        log: [
          ...prev.log,
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString(),
            type: 'error',
            text: `[!] Connection failed: ${err.message || err}`
          }
        ]
      }));
    }
  };

  const readSerialLoop = async (port: any) => {
    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const trimmed = value.trim();
          if (trimmed) {
            setState(prev => ({
              ...prev,
              log: [
                ...prev.log,
                {
                  id: String(Date.now()),
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'rx',
                  text: trimmed
                }
              ]
            }));
          }
        }
      }
    } catch (err: any) {
      console.error('Read loop error:', err);
    }
  };

  const disconnectRealSerial = async () => {
    try {
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel();
      }
      if (serialPortRef.current) {
        await serialPortRef.current.close();
      }
      setState(prev => ({
        ...prev,
        connected: false,
        isVirtual: true,
        log: [
          ...prev.log,
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString(),
            type: 'info',
            text: '[*] Disconnected from USB serial port. Returned to virtual mode.'
          }
        ]
      }));
    } catch (e) {
      console.error(e);
    }
  };

  // Process command either in real serial or in virtual emulator
  const handleSendCommand = async (cmdText: string) => {
    const cleanCmd = cmdText.trim();
    if (!cleanCmd) return;

    // Add to history
    setCommandHistory(prev => [cleanCmd, ...prev.slice(0, 30)]);
    setHistoryIndex(-1);
    setCommandInput('');

    // Append TX to log
    setState(prev => ({
      ...prev,
      log: [
        ...prev.log,
        {
          id: String(Date.now()),
          timestamp: new Date().toLocaleTimeString(),
          type: 'tx',
          text: cleanCmd
        }
      ]
    }));

    // If real serial is active
    if (!state.isVirtual && serialPortRef.current) {
      try {
        const encoder = new TextEncoder();
        const writer = serialPortRef.current.writable.getWriter();
        await writer.write(encoder.encode(cleanCmd + '\r'));
        writer.releaseLock();
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          log: [
            ...prev.log,
            {
              id: String(Date.now()),
              timestamp: new Date().toLocaleTimeString(),
              type: 'error',
              text: `TX Error: ${err.message}`
            }
          ]
        }));
      }
      return;
    }

    // Virtual Simulator Command Processing
    const lower = cleanCmd.toLowerCase();
    let rxResponse = '';
    let newDirection = state.direction;
    let newPrompt = state.statusPrompt;
    let newRate = state.rate;
    let newRateUnit = state.rateUnit;
    let newDiameter = state.diameter;
    let newTarget = state.targetVolume;
    let newInfused = state.infusedVolume;
    let newWithdrawn = state.withdrawnVolume;

    if (lower === 'irun' || lower === 'run') {
      newDirection = 'inf';
      newPrompt = '>';
      rxResponse = `00:>`;
    } else if (lower === 'wrun') {
      newDirection = 'wdr';
      newPrompt = '<';
      rxResponse = `00:<`;
    } else if (lower === 'stop' || lower === 'stp') {
      newDirection = 'idle';
      newPrompt = ':';
      rxResponse = `00::`;
    } else if (lower === 'pause') {
      newDirection = 'paused';
      newPrompt = '*';
      rxResponse = `00:*`;
    } else if (lower === 'restart') {
      newDirection = state.direction === 'paused' ? 'inf' : state.direction;
      newPrompt = '>';
      rxResponse = `00:>`;
    } else if (lower === 'poll') {
      rxResponse = `00:${newPrompt}`;
    } else if (lower === 'status') {
      const modeStr = newDirection === 'inf' ? 'Infusing' : newDirection === 'wdr' ? 'Withdrawing' : newDirection === 'paused' ? 'Paused' : 'Stopped';
      rxResponse = `00:${modeStr} at ${newRate} ${newRateUnit}\n00:${newPrompt}`;
    } else if (lower.startsWith('irate')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 3) {
        newRate = parseFloat(parts[1]) || newRate;
        newRateUnit = parts[2] || newRateUnit;
        rxResponse = `00:${newRate} ${newRateUnit}\n00:${newPrompt}`;
      } else {
        rxResponse = `00:${newRate} ${newRateUnit}\n00:${newPrompt}`;
      }
    } else if (lower.startsWith('wrate')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 3) {
        newRate = parseFloat(parts[1]) || newRate;
        newRateUnit = parts[2] || newRateUnit;
        rxResponse = `00:${newRate} ${newRateUnit}\n00:${newPrompt}`;
      } else {
        rxResponse = `00:${newRate} ${newRateUnit}\n00:${newPrompt}`;
      }
    } else if (lower.startsWith('diameter')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 2) {
        newDiameter = parseFloat(parts[1]) || newDiameter;
        rxResponse = `00:${newDiameter.toFixed(3)} mm\n00:${newPrompt}`;
      } else {
        rxResponse = `00:${newDiameter.toFixed(3)} mm\n00:${newPrompt}`;
      }
    } else if (lower.startsWith('tvolume') || lower.startsWith('tvol')) {
      const parts = lower.split(/\s+/);
      if (parts.length >= 2) {
        newTarget = parseFloat(parts[1]) || null;
        rxResponse = `00:${newTarget} ml\n00:${newPrompt}`;
      } else {
        rxResponse = `00:${newTarget || 'None'} ml\n00:${newPrompt}`;
      }
    } else if (lower === 'ctvolume') {
      newTarget = null;
      rxResponse = `00::`;
    } else if (lower === 'ivolume') {
      rxResponse = `00:${newInfused.toFixed(4)} ml\n00:${newPrompt}`;
    } else if (lower === 'wvolume') {
      rxResponse = `00:${newWithdrawn.toFixed(4)} ml\n00:${newPrompt}`;
    } else if (lower === 'cvolume' || lower === 'civolume' || lower === 'cwvolume') {
      newInfused = 0.0;
      newWithdrawn = 0.0;
      rxResponse = `00::`;
    } else if (lower === 'ver' || lower === 'version') {
      rxResponse = `00:KD Scientific Legato 270 v2.1.0\n00::`;
    } else if (lower.startsWith('echo')) {
      rxResponse = `00::`;
    } else {
      rxResponse = `00:?\n00:O`;
      newPrompt = 'O';
    }

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        direction: newDirection,
        statusPrompt: newPrompt,
        rate: newRate,
        rateUnit: newRateUnit,
        diameter: newDiameter,
        targetVolume: newTarget,
        infusedVolume: newInfused,
        withdrawnVolume: newWithdrawn,
        log: [
          ...prev.log,
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString(),
            type: 'rx',
            text: rxResponse
          }
        ]
      }));
    }, 40);
  };

  const clearLog = () => {
    setState(prev => ({
      ...prev,
      log: []
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Connection & Hardware Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${state.isVirtual ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">
                  {state.isVirtual ? 'Virtual Legato 270 Simulator' : 'Physical USB Serial Connected'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  state.isVirtual ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {state.isVirtual ? 'EMULATOR MODE' : 'LIVE HARDWARE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {state.isVirtual
                  ? 'Simulating ASCII serial protocol with animated push/pull carriage'
                  : 'Direct Web Serial API link to KD Scientific Legato 270 over USB'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {state.isVirtual ? (
              <button
                onClick={connectRealSerial}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-md shadow-cyan-600/20"
              >
                <Wifi className="w-3.5 h-3.5" />
                Connect Real USB Pump (Web Serial)
              </button>
            ) : (
              <button
                onClick={disconnectRealSerial}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                Disconnect USB
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mechanical Push/Pull Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-sm">Legato 270 Push/Pull Opposed Carriage Monitor</h3>
          </div>

          {/* Current State Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Status Prompt:</span>
            <span className={`px-2.5 py-0.5 rounded font-black ${
              state.statusPrompt === '>' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
              state.statusPrompt === '<' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
              state.statusPrompt === 'T*' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
              'bg-slate-950 text-emerald-400 border border-slate-800'
            }`}>
              {state.statusPrompt} ({state.direction.toUpperCase()})
            </span>
          </div>
        </div>

        {/* Syringe Piston Animation Track */}
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between text-xs font-medium text-slate-400">
            <span className="text-cyan-400 font-bold">Syringe A (Forward Infuse Side)</span>
            <span className="text-purple-400 font-bold">Syringe B (Reverse Refill Side)</span>
          </div>

          {/* Graphical Dual Cylinder */}
          <div className="relative h-16 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex items-center px-4">
            {/* Guide Rail */}
            <div className="absolute inset-x-4 h-1.5 bg-slate-800 rounded-full" />

            {/* Left Syringe Barrel */}
            <div className="absolute left-4 top-3 bottom-3 w-32 border-2 border-cyan-500/40 bg-cyan-950/20 rounded-l-lg flex items-center justify-center">
              <span className="text-[10px] text-cyan-300/80 font-mono font-bold">BARREL A</span>
            </div>

            {/* Right Syringe Barrel */}
            <div className="absolute right-4 top-3 bottom-3 w-32 border-2 border-purple-500/40 bg-purple-950/20 rounded-r-lg flex items-center justify-center">
              <span className="text-[10px] text-purple-300/80 font-mono font-bold">BARREL B</span>
            </div>

            {/* Moving Center Drive Block */}
            <div
              className="absolute top-1 bottom-1 w-10 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-600 rounded-lg shadow-xl shadow-cyan-500/30 border border-white/40 flex items-center justify-center transition-all duration-100"
              style={{ left: `calc(${state.carriagePositionMm}% - 20px)` }}
            >
              <div className="flex flex-col items-center">
                {state.direction === 'inf' && <ArrowUp className="w-4 h-4 text-white rotate-90 animate-pulse" />}
                {state.direction === 'wdr' && <ArrowDown className="w-4 h-4 text-white rotate-90 animate-pulse" />}
                {state.direction === 'idle' && <Square className="w-3 h-3 text-white" />}
                {state.direction === 'paused' && <Pause className="w-3 h-3 text-white" />}
              </div>
            </div>
          </div>

          {/* Telemetry Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Infused Delivered</span>
              <span className="text-cyan-300 font-mono font-bold">{state.infusedVolume.toFixed(3)} ml</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Withdrawn Refilled</span>
              <span className="text-purple-300 font-mono font-bold">{state.withdrawnVolume.toFixed(3)} ml</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Set Flow Rate</span>
              <span className="text-white font-mono font-bold">{state.rate} {state.rateUnit}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Target Volume</span>
              <span className="text-white font-mono font-bold">{state.targetVolume ? `${state.targetVolume} ml` : 'Continuous (None)'}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => handleSendCommand('irun')}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            IRUN (Infuse)
          </button>

          <button
            onClick={() => handleSendCommand('wrun')}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 rotate-180" />
            WRUN (Withdraw)
          </button>

          <button
            onClick={() => handleSendCommand('pause')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            PAUSE
          </button>

          <button
            onClick={() => handleSendCommand('restart')}
            className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESTART
          </button>

          <button
            onClick={() => handleSendCommand('stop')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
            STOP
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={() => handleSendCommand('poll')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            poll
          </button>

          <button
            onClick={() => handleSendCommand('status')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            status
          </button>

          <button
            onClick={() => handleSendCommand('ivolume')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            ivolume
          </button>

          <button
            onClick={() => handleSendCommand('cvolume')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors cursor-pointer"
          >
            cvolume
          </button>
        </div>
      </div>

      {/* Terminal Serial Stream Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-200">
              Serial Console Terminal (\r terminator)
            </span>
          </div>

          <button
            onClick={clearLog}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log
          </button>
        </div>

        {/* Terminal Output Area */}
        <div className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 bg-slate-950 select-text">
          {state.log.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <span className="text-slate-600 text-[10px] select-none shrink-0 mt-0.5">{item.timestamp}</span>
              {item.type === 'tx' && (
                <div className="text-cyan-400">
                  <span className="text-slate-500 font-bold mr-1.5">TX &gt;</span>
                  <span>{item.text}</span>
                </div>
              )}
              {item.type === 'rx' && (
                <div className="text-emerald-400 whitespace-pre-wrap">
                  <span className="text-slate-500 font-bold mr-1.5">RX &lt;</span>
                  <span>{item.text}</span>
                </div>
              )}
              {item.type === 'info' && (
                <div className="text-amber-300">
                  <span>{item.text}</span>
                </div>
              )}
              {item.type === 'error' && (
                <div className="text-rose-400 font-bold">
                  <span>{item.text}</span>
                </div>
              )}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Command Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand(commandInput);
          }}
          className="flex items-center gap-2 p-3 bg-slate-900 border-t border-slate-800"
        >
          <span className="text-cyan-400 font-mono text-sm font-bold pl-2">&gt;</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type ASCII command (e.g. irate 3.0 ml/min, irun, stop, tvolume 5 ml)..."
            className="flex-1 bg-transparent border-none text-white font-mono text-xs focus:outline-none placeholder-slate-500"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
