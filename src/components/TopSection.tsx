import React, { useState, useEffect } from 'react';
import {
  pumpController,
  PumpTelemetry,
  formatDisplayUnit,
  toMicroliters
} from '../services/webSerialPump';
import {
  Play,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Square,
  Clock,
  Terminal,
  Activity,
  RotateCcw,
  AlertTriangle,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react';

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
    const stroke = telemetry.targetVolume || telemetry.strokeTarget || 5.0;
    const infRate = telemetry.infuseRate || telemetry.flowRate || 2.5;
    const infUnit = telemetry.infuseRateUnit || telemetry.flowUnit || 'ml/min';
    const wthRate = telemetry.withdrawRate || infRate;
    const wthUnit = telemetry.withdrawRateUnit || infUnit;
    const volUnit = telemetry.targetUnit || telemetry.volumeUnit || 'ml';
    await pumpController.startContinuousCycle(infRate, infUnit, stroke, 0, wthRate, wthUnit, volUnit);
  };

  const handleStop = async () => {
    await pumpController.stop();
  };

  const handleResetVolumeTimer = async () => {
    await pumpController.resetCounters();
  };

  const volUnit = formatDisplayUnit(telemetry.volumeUnit || telemetry.targetUnit || 'ml');
  const infRateUnit = formatDisplayUnit(telemetry.infuseRateUnit || telemetry.flowUnit || 'ml/min');
  const wthRateUnit = formatDisplayUnit(telemetry.withdrawRateUnit || telemetry.flowUnit || 'ml/min');

  // Dynamic Syringe Graphic calculation normalized to microliters so µl, nl, and ml scale perfectly
  const targetInUl = (telemetry.targetVolume && telemetry.targetVolume > 0)
    ? toMicroliters(telemetry.targetVolume, telemetry.targetUnit || telemetry.volumeUnit || 'ml')
    : toMicroliters(telemetry.strokeTarget && telemetry.strokeTarget > 0 ? telemetry.strokeTarget : 10.0, telemetry.targetUnit || 'ml');

  const infInUl = toMicroliters(telemetry.infusedVolume, telemetry.volumeUnit || telemetry.targetUnit || 'ml');
  const wthInUl = toMicroliters(telemetry.withdrawnVolume, telemetry.volumeUnit || telemetry.targetUnit || 'ml');

  // Dynamic fill calculation for Syringe A and Syringe B based on active stroke progress
  const strokeRatio = Math.min(1, Math.max(0, telemetry.strokePercent / 100));
  let fluidPercentA = 100;
  let fluidPercentB = 100;

  if (telemetry.continuousActive) {
    if (telemetry.cyclePhase === 'infusing_A' || telemetry.direction === 'infuse') {
      // Phase 1: Syringe A dispensing (100% -> 0%), Syringe B refilling (0% -> 100%)
      fluidPercentA = Math.max(0, Math.min(100, (1 - strokeRatio) * 100));
      fluidPercentB = Math.max(0, Math.min(100, strokeRatio * 100));
    } else {
      // Phase 2: Syringe B dispensing (100% -> 0%), Syringe A refilling (0% -> 100%)
      fluidPercentB = Math.max(0, Math.min(100, (1 - strokeRatio) * 100));
      fluidPercentA = Math.max(0, Math.min(100, strokeRatio * 100));
    }
  } else {
    // Single stroke mode:
    if (telemetry.direction === 'withdraw') {
      // Syringe B dispensing (100% -> 0%), Syringe A refilling (0% -> 100%)
      fluidPercentB = Math.max(0, Math.min(100, (1 - strokeRatio) * 100));
      fluidPercentA = Math.max(0, Math.min(100, strokeRatio * 100));
    } else if (telemetry.direction === 'infuse') {
      // Syringe A dispensing (100% -> 0%), Syringe B refilling (0% -> 100%)
      fluidPercentA = Math.max(0, Math.min(100, (1 - strokeRatio) * 100));
      fluidPercentB = Math.max(0, Math.min(100, strokeRatio * 100));
    } else {
      // Direction is idle: reflect completion or ready-to-run filled state
      if (telemetry.prompt === 'T*' || telemetry.statusText === 'TARGET REACHED') {
        if (telemetry.carriagePercent >= 90) {
          fluidPercentA = 0;
          fluidPercentB = 100;
        } else {
          fluidPercentB = 0;
          fluidPercentA = 100;
        }
      } else {
        // Ready state: both syringes primed and filled at 100%
        fluidPercentA = 100;
        fluidPercentB = 100;
      }
    }
  }

  const plungerPositionA = fluidPercentA;
  const plungerPositionB = fluidPercentB;

  const isStalled =
    telemetry.isStalled ||
    telemetry.statusText.includes('STALL') ||
    telemetry.statusCategory === 'Error' ||
    telemetry.prompt === '*' ||
    telemetry.prompt === '!';

  // Calculate estimated stroke countdown for active stroke
  const strokeRemainingSec = Math.max(0, telemetry.strokeDurationSec - telemetry.strokeElapsedSec);

  return (
    <section id="top-section" className="space-y-4">

      {/* Motor Stall Warning Alert Banner */}
      {isStalled && (
        <div
          id="motor-stall-alert-banner"
          className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-sm animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Pump Motor Stall / Hardware Alarm Detected
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {telemetry.stallMessage ? (
                  <>Hardware message: <strong className="font-mono bg-amber-100 px-1 py-0.5 rounded">{telemetry.stallMessage}</strong> &mdash; </>
                ) : null}
                The motor encountered physical resistance or reached end of travel. Check syringe alignment and press <strong>Clear &amp; Stop</strong> or <strong>Reset Counters</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              id="clear-stall-stop-btn"
              onClick={handleStop}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Clear &amp; Stop
            </button>
            <button
              id="clear-stall-reset-btn"
              onClick={handleResetVolumeTimer}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Reset Counters
            </button>
          </div>
        </div>
      )}

      {/* Active Continuous Mode Header Banner */}
      {telemetry.continuousActive && (
        <div
          id="continuous-cycle-status-banner"
          className="bg-indigo-50 border-2 border-indigo-500/40 rounded-xl p-4 text-indigo-950 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-mono font-bold text-[10px] uppercase">
                    Continuous Push/Pull Active
                  </span>
                  <span className="font-mono font-bold text-xs text-indigo-900">
                    Cycle #{telemetry.currentCycle} {telemetry.totalCycles > 0 ? `/ ${telemetry.totalCycles}` : '(24/7 Infinite)'}
                  </span>
                </div>
                <p className="text-xs text-indigo-800 font-semibold mt-1">
                  {telemetry.cyclePhase === 'infusing_A' || telemetry.direction === 'infuse'
                    ? 'Phase 1: Syringe A Infusing to Output &bull; Syringe B Refilling from Reservoir'
                    : 'Phase 2: Syringe B Infusing to Output &bull; Syringe A Refilling from Reservoir'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:text-right">
              <div className="bg-white/80 border border-indigo-200 rounded-lg px-3 py-1.5 font-mono text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Combined Fluid Delivered</span>
                <strong className="text-indigo-700 text-sm">{telemetry.totalContinuousVolume.toFixed(4)} {volUnit}</strong>
              </div>
              <div className="bg-white/80 border border-indigo-200 rounded-lg px-3 py-1.5 font-mono text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Stroke Countdown</span>
                <strong className="text-slate-800">{formatTimer(Math.round(strokeRemainingSec))}</strong>
              </div>
            </div>
          </div>

          {/* Stroke Progress Bar */}
          <div className="mt-3 pt-2 border-t border-indigo-200/60 flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-600 shrink-0 text-[11px]">Stroke Progress:</span>
            <div className="h-2.5 flex-1 bg-indigo-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-150 rounded-full"
                style={{ width: `${telemetry.strokePercent}%` }}
              />
            </div>
            <span className="font-bold text-indigo-800 shrink-0 text-[11px]">
              {telemetry.strokePercent.toFixed(1)}% ({formatTimer(Math.round(telemetry.strokeElapsedSec))} / {formatTimer(Math.round(telemetry.strokeDurationSec))})
            </span>
          </div>
        </div>
      )}
      
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
              <span>Infuse ({telemetry.infuseRate || telemetry.flowRate} {infRateUnit})</span>
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
              <span>Withdraw ({telemetry.withdrawRate || telemetry.flowRate} {wthRateUnit})</span>
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
              <span>{telemetry.continuousActive ? `Continuous (Cycle ${telemetry.currentCycle})` : 'Continuous (Push/Pull)'}</span>
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
            className="text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors ml-auto sm:ml-0 cursor-pointer font-semibold shadow-2xs"
            title="Reset volume accumulators and timer to zero on both webapp and pump hardware"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
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
              Dual-Syringe Mechanical Visualizer (Opposed Push/Pull)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-500">
              <span>Carriage Travel:</span>
              <strong className="text-blue-700 font-bold">{telemetry.carriagePercent.toFixed(1)}%</strong>
            </div>
            {telemetry.targetVolume && (
              <div className="hidden sm:flex items-center gap-1 text-slate-500 border-l border-slate-200 pl-3">
                <span>Stroke Target:</span>
                <strong className="text-slate-800 font-bold">{telemetry.targetVolume} {volUnit}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Physical Syringe Barrel Graphic Canvas */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          
          {/* Top Syringe Group A (Forward Infusion Channel) */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-900">Syringe A (Forward Channel):</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  (telemetry.direction === 'infuse' || telemetry.cyclePhase === 'infusing_A')
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {(telemetry.direction === 'infuse' || telemetry.cyclePhase === 'infusing_A') ? 'Dispensing / Infusing' : 'Refilling / Idle'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-slate-500 text-[11px]">Fluid Remaining: <strong className="text-slate-800">{fluidPercentA.toFixed(1)}%</strong></span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Stroke: {(telemetry.direction === 'infuse' || telemetry.cyclePhase === 'infusing_A') ? (telemetry.currentStrokeVolume || 0).toFixed(4) : (fluidPercentA === 0 ? (telemetry.targetVolume || 5).toFixed(4) : '0.0000')} {volUnit}
                </span>
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  Total: {telemetry.infusedVolume.toFixed(4)} {volUnit}
                </span>
              </div>
            </div>

            {/* Syringe Barrel A Graphic */}
            <div className="h-8 w-full bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative flex items-center shadow-inner">
              {/* Fluid fill volume in Syringe A */}
              <div
                className={`h-full transition-all duration-150 ${
                  (telemetry.direction === 'infuse' || telemetry.cyclePhase === 'infusing_A')
                    ? 'bg-emerald-500'
                    : 'bg-emerald-400/80'
                }`}
                style={{ width: `${fluidPercentA}%` }}
              />
              {/* Plunger Seal Graphic */}
              <div
                className="absolute h-full w-3 bg-slate-800 border-r border-l border-slate-900 shadow-md transition-all duration-150"
                style={{ left: `calc(${plungerPositionA}% - 6px)` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono font-bold text-slate-800 pointer-events-none drop-shadow-xs">
                <span>0 {volUnit} (Empty)</span>
                <span>Barrel Capacity ({telemetry.targetVolume || telemetry.strokeTarget || 5} {volUnit})</span>
              </div>
            </div>
          </div>

          {/* Central Carriage & Directional Flow Indicator */}
          <div className="my-2 py-2 px-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Motor Carriage Drive:</span>
              {(telemetry.direction === 'infuse' || telemetry.cyclePhase === 'infusing_A') ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ArrowRight className="w-4 h-4 animate-pulse" /> Moving Forward (&rarr; Dispense Syringe A / Refill Syringe B)
                </span>
              ) : (telemetry.direction === 'withdraw' || telemetry.cyclePhase === 'withdrawing_A') ? (
                <span className="inline-flex items-center gap-1.5 text-sky-700 font-bold font-mono bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  <ArrowLeft className="w-4 h-4 animate-pulse" /> Moving Reverse (&larr; Dispense Syringe B / Refill Syringe A)
                </span>
              ) : (
                <span className="text-slate-500 font-mono font-medium">Stationary (Stopped)</span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-600">
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
                <span className="font-semibold text-slate-900">Syringe B (Reverse Channel):</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  (telemetry.direction === 'withdraw' || telemetry.cyclePhase === 'withdrawing_A')
                    ? 'bg-sky-100 text-sky-800 ring-1 ring-sky-300'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {(telemetry.direction === 'withdraw' || telemetry.cyclePhase === 'withdrawing_A') ? 'Dispensing / Withdrawing' : 'Refilling / Idle'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-slate-500 text-[11px]">Fluid Remaining: <strong className="text-slate-800">{fluidPercentB.toFixed(1)}%</strong></span>
                <span className="font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Stroke: {(telemetry.direction === 'withdraw' || telemetry.cyclePhase === 'withdrawing_A') ? (telemetry.currentStrokeVolume || 0).toFixed(4) : (fluidPercentB === 0 ? (telemetry.targetVolume || 5).toFixed(4) : '0.0000')} {volUnit}
                </span>
                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                  Total: {telemetry.withdrawnVolume.toFixed(4)} {volUnit}
                </span>
              </div>
            </div>

            {/* Syringe Barrel B Graphic */}
            <div className="h-8 w-full bg-slate-200 rounded-lg overflow-hidden border border-slate-300 relative flex items-center shadow-inner">
              {/* Fluid fill volume in Syringe B */}
              <div
                className={`h-full transition-all duration-150 ${
                  (telemetry.direction === 'withdraw' || telemetry.cyclePhase === 'withdrawing_A')
                    ? 'bg-sky-500'
                    : 'bg-sky-400/80'
                }`}
                style={{ width: `${fluidPercentB}%` }}
              />
              {/* Plunger Seal Graphic */}
              <div
                className="absolute h-full w-3 bg-slate-800 border-r border-l border-slate-900 shadow-md transition-all duration-150"
                style={{ left: `calc(${plungerPositionB}% - 6px)` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-mono font-bold text-slate-800 pointer-events-none drop-shadow-xs">
                <span>0 {volUnit} (Empty)</span>
                <span>Barrel Capacity ({telemetry.targetVolume || telemetry.strokeTarget || 5} {volUnit})</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2.1 Dynamic Continuous Cycle Flow & Push/Pull Waveform Graph */}
      <div id="dynamic-cycle-flow-graph" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Dynamic Continuous Cycle Flow Graph (Push / Pull Waveform)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {telemetry.continuousActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold animate-pulse">
                <Zap className="w-3.5 h-3.5 fill-indigo-600 text-indigo-600" />
                <span>Active Cycle #{telemetry.currentCycle} {telemetry.totalCycles > 0 ? `/ ${telemetry.totalCycles}` : '(Infinite Continuous)'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono text-xs font-semibold">
                <span>Cycle Profile Ready</span>
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {telemetry.isRealHardware ? 'Hardware Synchronized' : 'High-Precision Simulation'}
            </span>
          </div>
        </div>

        {/* Dynamic Waveform SVG Canvas */}
        <div className="bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-800 relative overflow-hidden">
          {/* Legend and Axis labels */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono mb-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
                <span>+Q Forward Stroke (Infuse A / Refill B): {telemetry.infuseRate || telemetry.flowRate} {infRateUnit}</span>
              </span>
              <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500"></span>
                <span>-Q Reverse Stroke (Infuse B / Refill A): {telemetry.withdrawRate || telemetry.flowRate} {wthRateUnit}</span>
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Stroke Target: <strong className="text-white">{telemetry.targetVolume || telemetry.strokeTarget || 5} {volUnit}</strong>
            </div>
          </div>

          {/* SVG Multi-Cycle Dynamic Timeline */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 800 160"
              className="w-full h-36 min-w-[600px] select-none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="emeraldPulseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="skyPulseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="activeCursorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="40" y1="20" x2="780" y2="20" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="40" y1="80" x2="780" y2="80" stroke="#64748b" strokeWidth="1.5" />
              <line x1="40" y1="140" x2="780" y2="140" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

              {/* Y-Axis Labels */}
              <text x="35" y="24" textAnchor="end" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">+Q</text>
              <text x="35" y="83" textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">0</text>
              <text x="35" y="144" textAnchor="end" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">-Q</text>

              {/* Render 4 Sequential Continuous Cycles (Cycle 1, Cycle 2, Cycle 3, Cycle 4) */}
              {[1, 2, 3, 4].map((cycleNum, idx) => {
                const cycleStartX = 50 + idx * 180;
                const phaseWidth = 85;
                const isCurrentCycle = telemetry.continuousActive ? telemetry.currentCycle === cycleNum : idx === 0;
                const isPastCycle = telemetry.continuousActive && telemetry.currentCycle > cycleNum;
                const isFutureCycle = telemetry.continuousActive && telemetry.currentCycle < cycleNum;

                // Active phase within current cycle
                const isPhase1Active = isCurrentCycle && (telemetry.cyclePhase === 'infusing_A' || telemetry.direction === 'infuse');
                const isPhase2Active = isCurrentCycle && (telemetry.cyclePhase === 'withdrawing_A' || telemetry.direction === 'withdraw');

                // Dynamic fill width for the current live pulse
                const liveProgressRatio = Math.min(1, Math.max(0, telemetry.strokePercent / 100));
                const currentPhase1Fill = isPhase1Active
                  ? phaseWidth * liveProgressRatio
                  : (isPastCycle || (isCurrentCycle && isPhase2Active) ? phaseWidth : 0);

                const currentPhase2Fill = isPhase2Active
                  ? phaseWidth * liveProgressRatio
                  : (isPastCycle ? phaseWidth : 0);

                return (
                  <g key={cycleNum}>
                    {/* Cycle Header Marker */}
                    <text
                      x={cycleStartX + phaseWidth}
                      y="14"
                      textAnchor="middle"
                      fill={isCurrentCycle ? '#e0e7ff' : '#64748b'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight={isCurrentCycle ? 'bold' : 'normal'}
                    >
                      Cycle #{cycleNum} {isCurrentCycle ? '(Live)' : ''}
                    </text>

                    {/* Phase 1 Background Outline (Infuse A) */}
                    <rect
                      x={cycleStartX}
                      y="20"
                      width={phaseWidth}
                      height="60"
                      fill="#064e3b"
                      fillOpacity="0.25"
                      stroke="#059669"
                      strokeWidth={isCurrentCycle && isPhase1Active ? '1.5' : '1'}
                      strokeDasharray={isFutureCycle ? '3 3' : undefined}
                      rx="2"
                    />

                    {/* Phase 1 Dynamic Fluid Fill (+Q) */}
                    {currentPhase1Fill > 0 && (
                      <rect
                        x={cycleStartX}
                        y="20"
                        width={currentPhase1Fill}
                        height="60"
                        fill="url(#emeraldPulseGrad)"
                        rx="2"
                      />
                    )}

                    <text
                      x={cycleStartX + phaseWidth / 2}
                      y="53"
                      textAnchor="middle"
                      fill={isCurrentCycle && isPhase1Active ? '#a7f3d0' : '#6ee7b7'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Infuse A
                    </text>

                    {/* Phase 2 Background Outline (Withdraw B) */}
                    <rect
                      x={cycleStartX + phaseWidth + 5}
                      y="80"
                      width={phaseWidth}
                      height="60"
                      fill="#082f49"
                      fillOpacity="0.25"
                      stroke="#0284c7"
                      strokeWidth={isCurrentCycle && isPhase2Active ? '1.5' : '1'}
                      strokeDasharray={isFutureCycle ? '3 3' : undefined}
                      rx="2"
                    />

                    {/* Phase 2 Dynamic Fluid Fill (-Q) */}
                    {currentPhase2Fill > 0 && (
                      <rect
                        x={cycleStartX + phaseWidth + 5}
                        y="80"
                        width={currentPhase2Fill}
                        height="60"
                        fill="url(#skyPulseGrad)"
                        rx="2"
                      />
                    )}

                    <text
                      x={cycleStartX + phaseWidth + 5 + phaseWidth / 2}
                      y="114"
                      textAnchor="middle"
                      fill={isCurrentCycle && isPhase2Active ? '#bae6fd' : '#7dd3fc'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Infuse B (Refill A)
                    </text>

                    {/* Live Scanning Cursor for Current Cycle */}
                    {isCurrentCycle && isPhase1Active && (
                      <g>
                        <line
                          x1={cycleStartX + currentPhase1Fill}
                          y1="16"
                          x2={cycleStartX + currentPhase1Fill}
                          y2="84"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={cycleStartX + currentPhase1Fill}
                          cy="20"
                          r="4"
                          fill="#fbbf24"
                          className="animate-ping"
                        />
                        <circle
                          cx={cycleStartX + currentPhase1Fill}
                          cy="20"
                          r="3"
                          fill="#f59e0b"
                        />
                      </g>
                    )}

                    {isCurrentCycle && isPhase2Active && (
                      <g>
                        <line
                          x1={cycleStartX + phaseWidth + 5 + currentPhase2Fill}
                          y1="76"
                          x2={cycleStartX + phaseWidth + 5 + currentPhase2Fill}
                          y2="144"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={cycleStartX + phaseWidth + 5 + currentPhase2Fill}
                          cy="140"
                          r="4"
                          fill="#fbbf24"
                          className="animate-ping"
                        />
                        <circle
                          cx={cycleStartX + phaseWidth + 5 + currentPhase2Fill}
                          cy="140"
                          r="3"
                          fill="#f59e0b"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Telemetry Strip */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/60">
              <span className="text-[10px] uppercase text-slate-400 block">Current Cycle Stroke</span>
              <strong className="text-white font-bold">
                {(telemetry.currentStrokeVolume || 0).toFixed(4)} / {(telemetry.targetVolume || telemetry.strokeTarget || 5).toFixed(4)} {volUnit}
              </strong>
            </div>

            <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/60">
              <span className="text-[10px] uppercase text-slate-400 block">Stroke Completion</span>
              <strong className="text-amber-300 font-bold">
                {telemetry.strokePercent.toFixed(1)}%
              </strong>
            </div>

            <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/60">
              <span className="text-[10px] uppercase text-slate-400 block">Continuous Total Delivered</span>
              <strong className="text-emerald-300 font-bold">
                {telemetry.totalContinuousVolume.toFixed(4)} {volUnit}
              </strong>
            </div>

            <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/60">
              <span className="text-[10px] uppercase text-slate-400 block">Active Phase Direction</span>
              <strong className={telemetry.direction === 'infuse' ? 'text-emerald-400 font-bold' : telemetry.direction === 'withdraw' ? 'text-sky-400 font-bold' : 'text-slate-300 font-bold'}>
                {telemetry.direction === 'infuse' ? 'Forward (Infuse A)' : telemetry.direction === 'withdraw' ? 'Reverse (Infuse B)' : 'Stationary'}
              </strong>
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
          
          {/* Target Volume (tvolume) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
              Target Volume (tvolume)
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-1 truncate">
              {telemetry.targetVolume ? `${telemetry.targetVolume} ${formatDisplayUnit(telemetry.targetUnit || 'ml')}` : 'Continuous'}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {telemetry.targetTimeEnabled && telemetry.targetTime ? `Timer: ${telemetry.targetTime}` : 'Per-stroke limit'}
            </span>
          </div>

          {/* Infuse Rate */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block">
              Infuse Rate (irate)
            </span>
            <div className="text-base font-mono font-bold text-emerald-700 mt-1 truncate">
              {telemetry.infuseRate || telemetry.flowRate} {infRateUnit}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">irate register</span>
          </div>

          {/* Withdraw Rate */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-sky-700 font-bold block">
              Withdraw Rate (wrate)
            </span>
            <div className="text-base font-mono font-bold text-sky-700 mt-1 truncate">
              {telemetry.withdrawRate || telemetry.flowRate} {wthRateUnit}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">wrate register</span>
          </div>

          {/* Infused Volume */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block">
              Infused Volume
            </span>
            <div className="text-base font-mono font-bold text-emerald-700 mt-1 truncate">
              {telemetry.infusedVolume.toFixed(4)} {volUnit}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">ivolume register</span>
          </div>

          {/* Withdraw Volume */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-sky-700 font-bold block">
              Withdraw Volume
            </span>
            <div className="text-base font-mono font-bold text-sky-700 mt-1 truncate">
              {telemetry.withdrawnVolume.toFixed(4)} {volUnit}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">wvolume register</span>
          </div>

          {/* Elapsed Timer */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Elapsed Timer</span>
            </span>
            <div className="text-base font-mono font-bold text-slate-900 mt-1 truncate">
              {formatTimer(telemetry.elapsedRunTimeSec)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {telemetry.targetTimeEnabled && telemetry.targetTime ? `Target: ${telemetry.targetTime}` : 'Active run clock'}
            </span>
          </div>

        </div>
      </div>

    </section>
  );
};
