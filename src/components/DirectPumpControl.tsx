import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  Send,
  Trash2,
  Terminal,
  Settings,
  Droplets,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Sliders,
  CheckCircle2,
  Info,
  Clock,
  Zap,
  RefreshCw,
  Usb,
  Cpu,
  CornerDownLeft
} from 'lucide-react';
import { pumpController, PumpTelemetry, SerialLogItem } from '../services/webSerialPump';
import { SYRINGE_PRESETS, LEGATO_COMMANDS } from '../data/legatoCommands';

export const DirectPumpControl: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);
  const [logs, setLogs] = useState<SerialLogItem[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Form parameters
  const [syringeSelection, setSyringeSelection] = useState('BD Plastic (Luer-Lok) - 10 ml');
  const [diameterInput, setDiameterInput] = useState(14.50);
  const [flowRateInput, setFlowRateInput] = useState(2.5);
  const [flowUnitInput, setFlowUnitInput] = useState('ml/min');
  const [strokeVolumeInput, setStrokeVolumeInput] = useState(5.0);
  const [targetCyclesInput, setTargetCyclesInput] = useState(0); // 0 = infinite
  const [valveDelayInput, setValveDelayInput] = useState(0.3);

  // Log filter
  const [logFilter, setLogFilter] = useState<'all' | 'tx_rx' | 'cycle'>('all');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubTelemetry = pumpController.subscribeTelemetry(setTelemetry);
    const unsubLog = pumpController.subscribeLog((item) => {
      setLogs((prev) => [...prev.slice(-300), item]);
    });
    return () => {
      unsubTelemetry();
      unsubLog();
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handlePresetChange = async (presetName: string) => {
    setSyringeSelection(presetName);
    const found = SYRINGE_PRESETS.find((p) => `${p.brand} - ${p.size}` === presetName);
    if (found) {
      setDiameterInput(found.diameterMm);
      await pumpController.sendCommand(`diameter ${found.diameterMm}`);
    }
  };

  const handleApplyParameters = async () => {
    await pumpController.sendCommand(`diameter ${diameterInput}`);
    await pumpController.sendCommand(`irate ${flowRateInput} ${flowUnitInput}`);
    await pumpController.sendCommand(`wrate ${flowRateInput} ${flowUnitInput}`);
    if (strokeVolumeInput > 0) {
      await pumpController.sendCommand(`tvolume ${strokeVolumeInput} ml`);
    } else {
      await pumpController.sendCommand('ctvolume');
    }
  };

  const handleStartContinuous = async () => {
    await pumpController.startContinuousCycle(
      flowRateInput,
      flowUnitInput,
      strokeVolumeInput,
      targetCyclesInput,
      valveDelayInput
    );
  };

  const handleStopPump = async () => {
    if (telemetry.continuousActive) {
      await pumpController.stopContinuousCycle();
    } else {
      await pumpController.sendCommand('stop');
    }
  };

  const handleSendCustomCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    setCommandHistory((prev) => [cmd, ...prev.slice(0, 30)]);
    setHistoryIndex(-1);
    setCommandInput('');
    await pumpController.sendCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCommandInput(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'tx_rx') return log.type === 'tx' || log.type === 'rx';
    if (logFilter === 'cycle') return log.type === 'cycle' || log.type === 'error';
    return true;
  });

  return (
    <div id="direct-pump-control-tab" className="space-y-6">
      
      {/* Introduction Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Usb className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">Direct Web Serial USB Control Center</h2>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Control your KD Scientific Legato 270 directly from this browser window with <strong>ZERO local software installation</strong>. Connect your USB cable, configure flow parameters, and run single strokes or uninterrupted 24/7 continuous push/pull routines.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-Install Web USB Ready</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Syringe & Parameter Configuration */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Syringe & Fluidics Calibration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">1. Syringe Calibration &amp; Dimensions</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">diameter {diameterInput.toFixed(3)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Syringe Preset
                </label>
                <select
                  id="syringe-preset-select"
                  value={syringeSelection}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {SYRINGE_PRESETS.map((p) => (
                    <option key={`${p.brand} - ${p.size}`} value={`${p.brand} - ${p.size}`}>
                      {p.brand} — {p.size} ({p.diameterMm} mm ID)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inner Diameter (mm)
                  </label>
                  <input
                    id="syringe-diameter-input"
                    type="number"
                    step="0.001"
                    min="0.1"
                    max="50.0"
                    value={diameterInput}
                    onChange={(e) => setDiameterInput(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Check-Valve Delay (s)
                  </label>
                  <input
                    id="valve-delay-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={valveDelayInput}
                    onChange={(e) => setValveDelayInput(parseFloat(e.target.value) || 0.1)}
                    className="w-full text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Flow Rate & Target Volume Setup */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">2. Flow Rate &amp; Stroke Limits</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">irate &amp; tvolume</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Continuous Flow Rate
                  </label>
                  <input
                    id="flow-rate-input"
                    type="number"
                    step="0.01"
                    min="0.0001"
                    value={flowRateInput}
                    onChange={(e) => setFlowRateInput(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rate Units
                  </label>
                  <select
                    id="flow-unit-select"
                    value={flowUnitInput}
                    onChange={(e) => setFlowUnitInput(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ml/min">ml/min</option>
                    <option value="ml/hr">ml/hr</option>
                    <option value="ul/min">ul/min</option>
                    <option value="ul/hr">ul/hr</option>
                    <option value="nl/min">nl/min</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stroke Target Volume (ml)
                  </label>
                  <input
                    id="stroke-volume-input"
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={strokeVolumeInput}
                    onChange={(e) => setStrokeVolumeInput(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Travel distance per push/pull stroke</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Cycles (0 = Infinite 24/7)
                  </label>
                  <input
                    id="target-cycles-input"
                    type="number"
                    min="0"
                    value={targetCyclesInput}
                    onChange={(e) => setTargetCyclesInput(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">0 for non-stop continuous operation</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  id="apply-pump-parameters-btn"
                  onClick={handleApplyParameters}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-600" />
                  <span>Send Settings to Pump</span>
                </button>

                <button
                  id="sync-pump-parameters-btn"
                  onClick={async () => {
                    await pumpController.queryAllPumpParameters();
                  }}
                  className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Query / Sync From Pump</span>
                </button>
              </div>
            </div>
          </div>

          {/* Continuous Push/Pull Automator Trigger Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-blue-950">3. Automated Continuous Push/Pull Engine</h3>
                  <p className="text-[11px] text-blue-800">
                    Alternates Syringe A and Syringe B continuously with zero flow pause.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {telemetry.continuousActive ? (
                <button
                  id="stop-continuous-cycle-btn"
                  onClick={handleStopPump}
                  className="col-span-2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>HALT CONTINUOUS PUSH/PULL</span>
                </button>
              ) : (
                <button
                  id="start-continuous-cycle-btn"
                  onClick={handleStartContinuous}
                  className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>START CONTINUOUS PUSH/PULL CYCLING</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-blue-900 bg-white/80 p-2.5 rounded-lg border border-blue-100">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Status:</span>
                <strong className="font-mono">{telemetry.continuousActive ? `Cycle #${telemetry.currentCycle} in progress` : 'Ready to Start'}</strong>
              </div>
              <span>Target: {targetCyclesInput === 0 ? 'Infinite continuous (24/7)' : `${targetCyclesInput} cycles`}</span>
            </div>
          </div>

        </div>

        {/* Right Column: Interactive Serial Terminal & Quick Command Deck */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Quick Hardware Action Deck */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Manual Hardware Control &amp; Jog Deck</span>
              </h3>
              <span className="text-xs text-slate-500">ASCII Direct Triggers</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                id="deck-irun-btn"
                onClick={() => pumpController.sendCommand('irun')}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <span>IRUN (Forward)</span>
              </button>

              <button
                id="deck-wrun-btn"
                onClick={() => pumpController.sendCommand('wrun')}
                className="p-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-sky-600" />
                <span>WRUN (Reverse)</span>
              </button>

              <button
                id="deck-pause-btn"
                onClick={() => pumpController.sendCommand(telemetry.direction === 'paused' ? 'restart' : 'pause')}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <Pause className="w-4 h-4 text-amber-600" />
                <span>{telemetry.direction === 'paused' ? 'RESTART' : 'PAUSE'}</span>
              </button>

              <button
                id="deck-stop-btn"
                onClick={handleStopPump}
                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer"
              >
                <Square className="w-4 h-4 text-rose-600 fill-current" />
                <span>STOP</span>
              </button>
            </div>

            {/* Common Diagnostic Queries */}
            <div className="pt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Query:</span>
              {['poll', 'status', 'ver', 'ivolume', 'wvolume', 'cvolume', 'echo off'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => pumpController.sendCommand(cmd)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Live ASCII Serial Terminal */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Live Serial Communications Monitor</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-white rounded-md border border-slate-200 p-0.5 text-[11px]">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-2 py-0.5 rounded ${logFilter === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setLogFilter('tx_rx')}
                    className={`px-2 py-0.5 rounded ${logFilter === 'tx_rx' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600'}`}
                  >
                    TX/RX
                  </button>
                  <button
                    onClick={() => setLogFilter('cycle')}
                    className={`px-2 py-0.5 rounded ${logFilter === 'cycle' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600'}`}
                  >
                    Cycles
                  </button>
                </div>

                <button
                  id="clear-serial-terminal-btn"
                  onClick={() => setLogs([])}
                  className="p-1 text-slate-500 hover:text-rose-600 rounded transition-colors"
                  title="Clear Terminal Log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Terminal Screen (Crisp Lab Terminal) */}
            <div className="h-72 overflow-y-auto p-3.5 bg-slate-950 font-mono text-xs space-y-1.5 select-text">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 text-center pt-20">
                  Ready. Commands sent and received over USB will stream here in real-time.
                </div>
              ) : (
                filteredLogs.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="text-slate-500 text-[10px] select-none shrink-0 mt-0.5">{item.timestamp}</span>
                    {item.type === 'tx' && (
                      <div className="text-cyan-400">
                        <span className="text-slate-500 font-bold mr-1">TX &gt;</span>
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.type === 'rx' && (
                      <div className="text-emerald-400 whitespace-pre-wrap">
                        <span className="text-slate-500 font-bold mr-1">RX &lt;</span>
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.type === 'info' && (
                      <div className="text-amber-300">
                        <span className="text-slate-500 mr-1">INFO:</span>
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.type === 'cycle' && (
                      <div className="text-blue-300 font-semibold">
                        <span>{item.text}</span>
                      </div>
                    )}
                    {item.type === 'error' && (
                      <div className="text-rose-400 font-bold">
                        <span>{item.text}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>

            {/* Command Send Bar */}
            <form
              onSubmit={handleSendCustomCommand}
              className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center gap-2"
            >
              <span className="text-blue-600 font-mono font-bold text-sm pl-1">&gt;</span>
              <input
                id="terminal-command-input"
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type command (e.g. irun, stop, irate 2.5 ml/min, diameter 14.5, poll)..."
                className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-1.5 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                id="send-command-btn"
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-md flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
