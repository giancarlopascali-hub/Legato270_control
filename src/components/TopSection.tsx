import React, { useState, useEffect } from 'react';
import { pumpController, PumpTelemetry } from '../services/webSerialPump';
import { Play, ArrowRight, ArrowLeft, RefreshCw, Square, Clock, Terminal, Activity, Droplets, RotateCcw } from 'lucide-react';

export const TopSection: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);

  useEffect(() => {
    const unsub = pumpController.subscribeTelemetry((t) => setTelemetry(t));
    return unsub;
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInfuse = async () => {
    await pumpController.infuse();
  };

  const handleWithdraw = async () => {
    await pumpController.withdraw();
  };

  const handleContinuous = async () => {
    const stroke = telemetry.strokeTarget || telemetry.targetVolume || 5.0;
    const rate = telemetry.flowRate || 2.5;
    const unit = telemetry.flowUnit || 'ml/min';
    await pumpController.startContinuousCycle(rate, unit, stroke, 0);
  };

  const handleStop = async () => {
    await pumpController.stop();
  };

  const handleResetVolumeTimer = async () => {
    await pumpController.sendCommand('cvolume');
    pumpController.resetRunClock();
  };

  return (
    <section id="top-section" className="space-y-4">
      
      {/* 1. Main Action Command Buttons */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pump Controls:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full sm:w-auto flex-1 max-w-2xl">
            
            {/* Infuse Button */}
            <button
              id="cmd-infuse-btn"
              onClick={handleInfuse}
              className={`py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                telemetry.direction === 'infuse' && !telemetry.continuousActive
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Infuse</span>
            </button>

            {/* Withdraw Button */}
            <button
              id="cmd-withdraw-btn"
              onClick={handleWithdraw}
              className={`py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                telemetry.direction === 'withdraw' && !telemetry.continuousActive
                  ? 'bg-sky-700 text-white ring-2 ring-sky-400'
                  : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-[0.98]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Withdraw</span>
            </button>

            {/* Continuous Button */}
            <button
              id="cmd-continuous-btn"
              onClick={handleContinuous}
              className={`py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                telemetry.continuousActive
                  ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${telemetry.continuousActive ? 'animate-spin' : ''}`} />
              <span>{telemetry.continuousActive ? `Continuous (${telemetry.currentCycle})` : 'Continuous'}</span>
            </button>

            {/* Stop Button */}
            <button
              id="cmd-stop-btn"
              onClick={handleStop}
              className={`py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                telemetry.direction === 'idle' && !telemetry.continuousActive
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.98]'
              }`}
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop</span>
            </button>

          </div>

          {/* Quick Counter Reset */}
          <button
            id="reset-counter-btn"
            onClick={handleResetVolumeTimer}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ml-auto sm:ml-0 cursor-pointer"
            title="Reset volume accumulators and timer to zero"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Counters</span>
          </button>

        </div>
      </div>

      {/* 2. Dynamic Visual of Syringes (Dual Push-Pull Opposed Rack) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Dual-Syringe Mechanical Visualizer (Legato 270 Opposed Push/Pull)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>Carriage Travel:</span>
            <strong className="text-blue-700 font-bold">{telemetry.carriagePercent.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Physical Syringe Barrel Graphic Canvas */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          
          {/* Top Syringe Group A (Forward Infusion Channel) */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-900">Syringe A (Forward Infuse):</span>
                <span className="text-slate-500 text-[11px]">
                  {telemetry.direction === 'infuse' ? 'Dispensing to Target' : 'Refilling / Idle'}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-700 text-xs">
                Delivered: {telemetry.infusedVolume.toFixed(3)} ml
              </span>
            </div>

            {/* Syringe Barrel A Graphic */}
            <div className="h-7 w-full bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative flex items-center">
              {/* Fluid fill volume in Syringe A */}
              <div
                className={`h-full transition-all duration-300 ${
                  telemetry.direction === 'infuse' ? 'bg-emerald-500' : 'bg-emerald-300'
                }`}
                style={{ width: `${Math.max(5, 100 - telemetry.carriagePercent)}%` }}
              />
              {/* Plunger Seal Graphic */}
              <div
                className="absolute h-full w-3 bg-slate-800 border-r border-l border-slate-900 shadow-md transition-all duration-300"
                style={{ left: `calc(${100 - telemetry.carriagePercent}% - 6px)` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono text-slate-700 pointer-events-none">
                <span>0 ml (Empty)</span>
                <span>Barrel Capacity (10.0 ml)</span>
              </div>
            </div>
          </div>

          {/* Central Carriage & Directional Flow Indicator */}
          <div className="my-2 py-1.5 px-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Motor Carriage Movement:</span>
              {telemetry.direction === 'infuse' ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold font-mono">
                  <ArrowRight className="w-4 h-4 animate-bounce" /> Moving Right (&rarr; Infuse A)
                </span>
              ) : telemetry.direction === 'withdraw' ? (
                <span className="inline-flex items-center gap-1 text-sky-700 font-bold font-mono">
                  <ArrowLeft className="w-4 h-4 animate-bounce" /> Moving Left (&larr; Infuse B / Refill A)
                </span>
              ) : (
                <span className="text-slate-500 font-mono">Stationary (Stopped)</span>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              {telemetry.continuousActive
                ? `Continuous Mode: Cycle #${telemetry.currentCycle}`
                : `Single Stroke Mode`}
            </div>
          </div>

          {/* Bottom Syringe Group B (Reverse Channel) */}
          <div className="space-y-1.5 mt-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span className="font-semibold text-slate-900">Syringe B (Reverse Infuse):</span>
                <span className="text-slate-500 text-[11px]">
                  {telemetry.direction === 'withdraw' ? 'Dispensing to Target' : 'Refilling / Idle'}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-700 text-xs">
                Withdrawn/Refilled: {telemetry.withdrawnVolume.toFixed(3)} ml
              </span>
            </div>

            {/* Syringe Barrel B Graphic */}
            <div className="h-7 w-full bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative flex items-center">
              {/* Fluid fill volume in Syringe B */}
              <div
                className={`h-full transition-all duration-300 ${
                  telemetry.direction === 'withdraw' ? 'bg-sky-500' : 'bg-sky-300'
                }`}
                style={{ width: `${Math.max(5, telemetry.carriagePercent)}%` }}
              />
              {/* Plunger Seal Graphic */}
              <div
                className="absolute h-full w-3 bg-slate-800 border-r border-l border-slate-900 shadow-md transition-all duration-300"
                style={{ left: `calc(${telemetry.carriagePercent}% - 6px)` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono text-slate-700 pointer-events-none">
                <span>0 ml (Empty)</span>
                <span>Barrel Capacity (10.0 ml)</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Summary of System Parameters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            System Parameters Summary
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Target Stroke */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Target Stroke
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-1 truncate">
              {telemetry.strokeTarget ? `${telemetry.strokeTarget} ${telemetry.targetUnit}` : 'Continuous'}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Per-cycle limit</span>
          </div>

          {/* Serial Command & Prompt */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Serial Command
            </span>
            <div className="text-base font-mono font-bold text-blue-700 mt-1 truncate">
              {telemetry.lastCommand || 'poll'}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
              RX Prompt: {telemetry.prompt || ':'}
            </span>
          </div>

          {/* Flow Rate */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Flow Rate
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-1 truncate">
              {telemetry.flowRate} {telemetry.flowUnit}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Active calibrated speed</span>
          </div>

          {/* Infused Volume */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block">
              Infused Volume
            </span>
            <div className="text-base font-mono font-bold text-emerald-700 mt-1 truncate">
              {telemetry.infusedVolume.toFixed(4)} ml
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">ivolume register</span>
          </div>

          {/* Withdraw Volume */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-sky-700 font-bold block">
              Withdraw Volume
            </span>
            <div className="text-base font-mono font-bold text-sky-700 mt-1 truncate">
              {telemetry.withdrawnVolume.toFixed(4)} ml
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">wvolume register</span>
          </div>

          {/* Timer */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Timer</span>
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-1 truncate">
              {formatTimer(telemetry.elapsedRunTimeSec)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Elapsed pumping time</span>
          </div>

        </div>
      </div>

    </section>
  );
};
