import React, { useState, useEffect } from 'react';
import {
  Activity,
  Play,
  Square,
  Pause,
  RotateCcw,
  Usb,
  Cpu,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Layers,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';
import { pumpController, PumpTelemetry } from '../services/webSerialPump';

export const ConstantPumpMonitor: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const unsubscribe = pumpController.subscribeTelemetry((newTelemetry) => {
      setTelemetry(newTelemetry);
    });
    return unsubscribe;
  }, []);

  const handleToggleUSB = async () => {
    if (telemetry.isRealHardware) {
      await pumpController.disconnectUSB();
    } else {
      setIsConnecting(true);
      await pumpController.connectUSB(telemetry.baudRate);
      setIsConnecting(false);
    }
  };

  const handleStop = async () => {
    if (telemetry.continuousActive) {
      await pumpController.stopContinuousCycle();
    } else {
      await pumpController.sendCommand('stop');
    }
  };

  const handleInfuse = async () => {
    await pumpController.sendCommand('irun');
  };

  const handleWithdraw = async () => {
    await pumpController.sendCommand('wrun');
  };

  const handlePauseResume = async () => {
    if (telemetry.direction === 'paused') {
      await pumpController.sendCommand('restart');
    } else {
      await pumpController.sendCommand('pause');
    }
  };

  const handleZeroVolume = async () => {
    await pumpController.sendCommand('cvolume');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = telemetry.targetVolume && telemetry.targetVolume > 0
    ? Math.min(100, Math.round((telemetry.infusedVolume / telemetry.targetVolume) * 100))
    : 0;

  // Status color mapping
  const getStatusBadge = () => {
    if (telemetry.prompt === '!') {
      return { bg: 'bg-rose-50 border-rose-300 text-rose-800', dot: 'bg-rose-600', text: 'ALARM / STALL' };
    }
    if (telemetry.prompt === '>') {
      return { bg: 'bg-emerald-50 border-emerald-300 text-emerald-800', dot: 'bg-emerald-600 animate-ping', text: 'INFUSING (Forward)' };
    }
    if (telemetry.prompt === '<') {
      return { bg: 'bg-sky-50 border-sky-300 text-sky-800', dot: 'bg-sky-600 animate-ping', text: 'WITHDRAWING (Reverse)' };
    }
    if (telemetry.prompt === '*') {
      return { bg: 'bg-amber-50 border-amber-300 text-amber-800', dot: 'bg-amber-500', text: 'PAUSED' };
    }
    if (telemetry.prompt === 'T*') {
      return { bg: 'bg-indigo-50 border-indigo-300 text-indigo-800', dot: 'bg-indigo-600', text: 'TARGET REACHED' };
    }
    return { bg: 'bg-slate-100 border-slate-300 text-slate-700', dot: 'bg-slate-400', text: 'IDLE / STOPPED' };
  };

  const status = getStatusBadge();

  return (
    <div id="constant-pump-monitor-window" className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Hardware Connection Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border bg-slate-50 border-slate-200">
              {telemetry.isRealHardware ? (
                <>
                  <Usb className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <span className="text-slate-800 font-mono">USB Hardware (VCP)</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-800 font-mono">Browser Virtual Simulator</span>
                </>
              )}
            </div>

            {/* Real-time Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold border ${status.bg}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span>{status.text}</span>
            </div>

            {/* Continuous Push/Pull Cycling Badge */}
            {telemetry.continuousActive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 border border-blue-300 text-blue-900 animate-pulse">
                <Layers className="w-3.5 h-3.5 text-blue-700" />
                <span>Continuous Cycle #{telemetry.currentCycle} {telemetry.totalCycles > 0 ? `of ${telemetry.totalCycles}` : '(24/7 Inf)'}</span>
              </div>
            )}
          </div>

          {/* Key Metrology Quick Glance */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-semibold">Flow Rate</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {telemetry.flowRate} <span className="text-slate-600 font-normal text-xs">{telemetry.flowUnit}</span>
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-semibold">Infused Volume</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                {telemetry.infusedVolume.toFixed(3)} <span className="text-slate-600 font-normal text-xs">{telemetry.targetUnit}</span>
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-600 block text-[10px] uppercase font-semibold">Refilled Volume</span>
              <span className="font-mono font-bold text-sky-800 text-sm">
                {telemetry.withdrawnVolume.toFixed(3)} <span className="text-slate-600 font-normal text-xs">{telemetry.targetUnit}</span>
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-1 text-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-mono font-bold text-sm">{formatSeconds(telemetry.elapsedRunTimeSec)}</span>
            </div>
          </div>

          {/* Quick Override Controls & Toggle Window */}
          <div className="flex items-center gap-2">
            <button
              id="monitor-quick-infuse-btn"
              onClick={handleInfuse}
              title="Infuse Forward (irun)"
              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded hover:shadow-xs transition-all text-xs font-semibold flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">Infuse</span>
            </button>

            <button
              id="monitor-quick-withdraw-btn"
              onClick={handleWithdraw}
              title="Withdraw Reverse (wrun)"
              className="p-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded hover:shadow-xs transition-all text-xs font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Withdraw</span>
            </button>

            <button
              id="monitor-quick-pause-btn"
              onClick={handlePauseResume}
              title={telemetry.direction === 'paused' ? 'Resume Pump' : 'Pause Pump'}
              className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded hover:shadow-xs transition-all text-xs font-semibold flex items-center gap-1"
            >
              <Pause className="w-4 h-4" />
              <span className="hidden sm:inline">{telemetry.direction === 'paused' ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              id="monitor-quick-stop-btn"
              onClick={handleStop}
              title="Emergency Stop (stop)"
              className="px-2.5 py-1.5 text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs text-xs font-bold flex items-center gap-1 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </button>

            <button
              id="monitor-connect-usb-btn"
              onClick={handleToggleUSB}
              disabled={isConnecting}
              className={`ml-1 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all flex items-center gap-1.5 ${
                telemetry.isRealHardware
                  ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                  : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-xs'
              }`}
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{telemetry.isRealHardware ? 'Disconnect USB' : 'Connect USB'}</span>
            </button>

            <button
              id="monitor-toggle-collapse-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title={isExpanded ? 'Collapse Monitor' : 'Expand Monitor'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

      {/* Expanded Dual-Syringe Push-Pull Graphic & Detailed Telemetry */}
      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            
            {/* Syringe Push/Pull Mechanical Visualizer (Legato 270 Twin Carriage) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Legato 270 Push/Pull Dual-Rack Drive</span>
                  <span className="text-[11px] text-slate-500 font-mono">Diameter: {telemetry.diameterMm} mm</span>
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  Carriage Travel: <span className="font-mono font-bold text-slate-800">{telemetry.carriagePercent.toFixed(1)}%</span>
                </div>
              </div>

              {/* Syringe A (Top) - Forward Infusion */}
              <div className="mb-3">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span className="flex items-center gap-1 text-emerald-700">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Syringe A (Primary Infuser)</span>
                  </span>
                  <span className="font-mono text-slate-700">
                    {telemetry.direction === 'infuse' ? 'Dispensing to Target' : telemetry.direction === 'withdraw' ? 'Refilling from Reservoir' : 'Standby'}
                  </span>
                </div>
                <div className="relative h-6 bg-slate-100 rounded-md border border-slate-300 overflow-hidden">
                  {/* Fluid Level */}
                  <div
                    className="h-full bg-emerald-500/30 transition-all duration-150 relative"
                    style={{ width: `${Math.max(5, 100 - telemetry.carriagePercent)}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-emerald-600" />
                  </div>
                  {/* Graduations */}
                  <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-30 text-[9px] font-mono text-slate-700">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Syringe B (Bottom) - Push/Pull Counterpart */}
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span className="flex items-center gap-1 text-sky-700">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Syringe B (Continuous Counter-Stroke)</span>
                  </span>
                  <span className="font-mono text-slate-700">
                    {telemetry.direction === 'infuse' ? 'Refilling from Reservoir' : telemetry.direction === 'withdraw' ? 'Dispensing to Target' : 'Standby'}
                  </span>
                </div>
                <div className="relative h-6 bg-slate-100 rounded-md border border-slate-300 overflow-hidden">
                  {/* Fluid Level */}
                  <div
                    className="h-full bg-sky-500/30 transition-all duration-150 relative"
                    style={{ width: `${Math.max(5, telemetry.carriagePercent)}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-sky-600" />
                  </div>
                  {/* Graduations */}
                  <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none opacity-30 text-[9px] font-mono text-slate-700">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Drive Direction Arrow Banner */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Carriage Motion:</span>
                  {telemetry.direction === 'infuse' && (
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      Moving Right &rarr; (Forward Infuse A / Pull B)
                    </span>
                  )}
                  {telemetry.direction === 'withdraw' && (
                    <span className="font-bold text-sky-700 flex items-center gap-1">
                      Moving Left &larr; (Reverse Infuse B / Pull A)
                    </span>
                  )}
                  {telemetry.direction === 'paused' && (
                    <span className="font-bold text-amber-700">Motor Suspended (Paused)</span>
                  )}
                  {telemetry.direction === 'idle' && (
                    <span className="font-medium text-slate-500">Stationary (Stopped)</span>
                  )}
                </div>
                <button
                  onClick={handleZeroVolume}
                  className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Counters
                </button>
              </div>
            </div>

            {/* Target Progress & Telemetry Cards */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-2.5">
              
              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Target Stroke</div>
                <div className="text-lg font-mono font-bold text-slate-800 mt-0.5">
                  {telemetry.targetVolume ? `${telemetry.targetVolume} ml` : 'Continuous'}
                </div>
                {telemetry.targetVolume && (
                  <div className="mt-2">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1 text-right">{progressPercent}% stroke complete</div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] font-bold text-slate-600 uppercase">Serial Protocol Prompt</div>
                <div className="text-lg font-mono font-bold text-indigo-700 mt-0.5 flex items-center gap-2">
                  <span>&quot;{telemetry.prompt}&quot;</span>
                  <span className="text-xs font-normal text-slate-500">
                    {telemetry.prompt === ':' ? '(Stopped)' : telemetry.prompt === '>' ? '(Infuse)' : telemetry.prompt === '<' ? '(Withdraw)' : telemetry.prompt === 'T*' ? '(Target)' : '(Active)'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-2">
                  Baud: <span className="font-mono font-semibold text-slate-700">{telemetry.baudRate} bps</span> (8-N-1)
                </div>
              </div>

              <div className="col-span-2 bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <span>
                    {telemetry.isRealHardware
                      ? 'Direct USB Hardware Control Active — Zero installation required.'
                      : 'Zero-install simulation active. Plug in your USB cable and click "Connect USB" anytime.'}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
