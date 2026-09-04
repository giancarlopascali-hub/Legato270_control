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
  Timer
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
