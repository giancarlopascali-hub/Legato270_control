import React, { useState, useEffect } from 'react';
import { pumpController, PumpTelemetry, formatDisplayUnit, convertVolume } from '../services/webSerialPump';
import { SYRINGE_PRESETS } from '../data/legatoCommands';
import { ProgramStep } from '../types';
import {
  Settings,
  Sliders,
  SlidersHorizontal,
  Layers,
  Play,
  Square,
  Plus,
  Trash2,
  Check,
  Zap,
  Gauge,
  Cpu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  X,
  Send,
  HelpCircle,
  Clock,
  Database,
  RefreshCw
} from 'lucide-react';

export const BottomSection: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);

  // 1. Syringe Dimensions State
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(3); // Default to BD Plastic 10ml
  const [diameterMm, setDiameterMm] = useState<number>(14.50);
  const [syringeVolume, setSyringeVolume] = useState<number>(10.0);
  const [syringeVolumeUnit, setSyringeVolumeUnit] = useState<string>('ml');
  const [diameterSaved, setDiameterSaved] = useState<boolean>(false);

  // 2. Flow Rates & Target Volume State
  const [infuseRate, setInfuseRate] = useState<number>(2.5);
  const [infuseRateUnit, setInfuseRateUnit] = useState<string>('ml/min');

  const [withdrawRate, setWithdrawRate] = useState<number>(2.5);
  const [withdrawRateUnit, setWithdrawRateUnit] = useState<string>('ml/min');

  const [syncRates, setSyncRates] = useState<boolean>(true);

  // Target Mode: Exclusive switch between Target Volume (default) and Target Time
  const [targetMode, setTargetMode] = useState<'volume' | 'time'>('volume');
  const [targetVolume, setTargetVolume] = useState<number>(5.0);
  const [targetVolumeUnit, setTargetVolumeUnit] = useState<'ml' | 'ul' | 'nl'>('ml');

  // Target Time duration (for Target Time mode)
  const [targetTimeHours, setTargetTimeHours] = useState<number>(0);
  const [targetTimeMins, setTargetTimeMins] = useState<number>(0);
  const [targetTimeSecs, setTargetTimeSecs] = useState<number>(30);

  const [targetsSaved, setTargetsSaved] = useState<boolean>(false);
  const [isApplyingTargets, setIsApplyingTargets] = useState<boolean>(false);

  // 3. Advanced Setup State
  const [selectedBaud, setSelectedBaud] = useState<number>(115200);
  const [baudSaved, setBaudSaved] = useState<boolean>(false);

  const [forcePercent, setForcePercent] = useState<number>(100);
  const [forceSaved, setForceSaved] = useState<boolean>(false);

  // Custom Program Steps
  const [programSteps, setProgramSteps] = useState<ProgramStep[]>([
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'infuse',
      volume: 2.5,
      volumeUnit: 'ml',
      rate: 2.0,
      rateUnit: 'ml/min'
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'pause',
      volume: 0,
      volumeUnit: 'ml',
      rate: 0,
      rateUnit: 'ml/min',
      durationSec: 10
    },
    {
      id: 'step-3',
      stepNumber: 3,
      type: 'withdraw',
      volume: 2.5,
      volumeUnit: 'ml',
      rate: 3.0,
      rateUnit: 'ml/min'
    }
  ]);

  // Editing step state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ProgramStep | null>(null);

  // New step creation state
  const [newStepType, setNewStepType] = useState<'infuse' | 'withdraw' | 'pause' | 'ramp'>('infuse');
  const [newStepVol, setNewStepVol] = useState<number>(1.0);
  const [newStepVolUnit, setNewStepVolUnit] = useState<'ml' | 'ul' | 'nl'>('ml');
  const [newStepRate, setNewStepRate] = useState<number>(2.0);
  const [newStepRateUnit, setNewStepRateUnit] = useState<'ml/min' | 'ml/hr' | 'ul/min' | 'ul/hr' | 'nl/min' | 'nl/hr'>('ml/min');
  const [newStepDuration, setNewStepDuration] = useState<number>(5);

  useEffect(() => {
    // Only update telemetry object for live monitoring; DO NOT overwrite local input fields on polling loops
    const unsub = pumpController.subscribeTelemetry((t) => {
      setTelemetry(t);
    });
    return unsub;
  }, []);

  const formatTimeStr = (h: number, m: number, s: number) => {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Explicitly pull parameters from pump into UI forms if requested
  const handleReadFromPump = async () => {
    await pumpController.queryAllPumpParameters();
    const t = pumpController.state;
    if (t.diameterMm && t.diameterMm > 0) {
      setDiameterMm(t.diameterMm);
    }
    if (t.syringeVolume && t.syringeVolume > 0) {
      setSyringeVolume(t.syringeVolume);
    }
    if (t.syringeVolumeUnit) {
      setSyringeVolumeUnit(t.syringeVolumeUnit);
    }
    if (t.infuseRate && t.infuseRate > 0) {
      setInfuseRate(t.infuseRate);
    }
    if (t.infuseRateUnit) {
      setInfuseRateUnit(t.infuseRateUnit);
    }
    if (t.withdrawRate && t.withdrawRate > 0) {
      setWithdrawRate(t.withdrawRate);
    }
    if (t.withdrawRateUnit) {
      setWithdrawRateUnit(t.withdrawRateUnit);
    }
    if (t.targetVolume && t.targetVolume > 0) {
      setTargetVolume(t.targetVolume);
    }
    if (t.targetUnit) {
      setTargetVolumeUnit(t.targetUnit as any);
    }
    if (t.targetMode) {
      setTargetMode(t.targetMode);
    } else if (t.targetTimeEnabled && t.targetTime) {
      setTargetMode('time');
    } else {
      setTargetMode('volume');
    }
    if (t.targetTime) {
      const parts = t.targetTime.split(':').map(Number);
      if (parts.length === 3) {
        setTargetTimeHours(parts[0] || 0);
        setTargetTimeMins(parts[1] || 0);
        setTargetTimeSecs(parts[2] || 0);
      }
    }
  };

  // Handle Preset Change
  const handlePresetSelect = (idx: number) => {
    setSelectedPresetIndex(idx);
    const preset = SYRINGE_PRESETS[idx];
    if (preset) {
      setDiameterMm(preset.diameterMm);
      if (preset.volumeUl >= 1000) {
        setSyringeVolume(preset.volumeUl / 1000);
        setSyringeVolumeUnit('ml');
      } else {
        setSyringeVolume(preset.volumeUl);
        setSyringeVolumeUnit('ul');
      }
    }
  };

  // Apply Syringe Specs - sends both diameter and syringe volume capacity to pump
  const handleApplyDiameter = async () => {
    await pumpController.setParameters({
      diameterMm,
      syringeVolume,
      syringeVolumeUnit
    });
    setDiameterSaved(true);
    setTimeout(() => setDiameterSaved(false), 2000);
  };

  // Apply Target Settings, Dual Flow Rates & Exclusive Target Mode (Volume vs Time)
  const handleApplyTargets = async () => {
    if (isApplyingTargets) return;
    setIsApplyingTargets(true);
    try {
      const isTime = targetMode === 'time';
      const timeStr = isTime ? formatTimeStr(targetTimeHours, targetTimeMins, targetTimeSecs) : null;

      await pumpController.setParameters({
        infuseRate,
        infuseRateUnit,
        withdrawRate,
        withdrawRateUnit,
        targetMode,
        targetVolume: isTime ? null : targetVolume,
        targetUnit: targetVolumeUnit,
        volumeUnit: targetVolumeUnit,
        targetTime: timeStr,
        targetTimeEnabled: isTime
      });
      setTargetsSaved(true);
      setTimeout(() => setTargetsSaved(false), 2500);
    } catch (err: any) {
      console.error('Failed to apply targets:', err);
    } finally {
      setIsApplyingTargets(false);
    }
  };

  // Apply Baud Rate
  const handleApplyBaud = async () => {
    await pumpController.setParameters({ baudRate: selectedBaud });
    setBaudSaved(true);
    setTimeout(() => setBaudSaved(false), 2000);
  };

  // Apply Force
  const handleApplyForce = async () => {
    await pumpController.setParameters({ motorForce: forcePercent });
    setForceSaved(true);
    setTimeout(() => setForceSaved(false), 2000);
  };

  // Program Methods
  const handleAddStep = () => {
    const nextStepNum = programSteps.length + 1;
    const newStep: ProgramStep = {
      id: Math.random().toString(36).substring(2, 9),
      stepNumber: nextStepNum,
      type: newStepType,
      volume: newStepType === 'pause' ? 0 : newStepVol,
      volumeUnit: newStepVolUnit,
      rate: newStepType === 'pause' ? 0 : newStepRate,
      rateUnit: newStepRateUnit,
      durationSec: newStepType === 'pause' ? newStepDuration : undefined
    };
    setProgramSteps([...programSteps, newStep]);
  };

  const handleDeleteStep = (id: string) => {
    if (editingStepId === id) {
      setEditingStepId(null);
      setEditFormData(null);
    }
    const updated = programSteps.filter((s) => s.id !== id).map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setProgramSteps(updated);
  };

  const handleClearProgram = () => {
    setEditingStepId(null);
    setEditFormData(null);
    setProgramSteps([]);
  };

  const handleMoveStepUp = (index: number) => {
    if (index <= 0) return;
    const newSteps = [...programSteps];
    const temp = newSteps[index - 1];
    newSteps[index - 1] = newSteps[index];
    newSteps[index] = temp;
    const reindexed = newSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setProgramSteps(reindexed);
  };

  const handleMoveStepDown = (index: number) => {
    if (index >= programSteps.length - 1) return;
    const newSteps = [...programSteps];
    const temp = newSteps[index + 1];
    newSteps[index + 1] = newSteps[index];
    newSteps[index] = temp;
    const reindexed = newSteps.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setProgramSteps(reindexed);
  };

  const handleStartEdit = (step: ProgramStep) => {
    setEditingStepId(step.id);
    setEditFormData({ ...step });
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditFormData(null);
  };

  const handleSaveEdit = () => {
    if (!editFormData) return;
    const updated = programSteps.map((s) => {
      if (s.id === editFormData.id) {
        return {
          ...editFormData,
          volume: editFormData.type === 'pause' ? 0 : editFormData.volume,
          rate: editFormData.type === 'pause' ? 0 : editFormData.rate,
          durationSec: editFormData.type === 'pause' ? editFormData.durationSec : undefined
        };
      }
      return s;
    });
    setProgramSteps(updated);
    setEditingStepId(null);
    setEditFormData(null);
  };

  const handleRunProgram = async () => {
    await pumpController.runCustomProgram(programSteps);
  };

  const handleStopProgram = async () => {
    await pumpController.stop();
  };

  return (
    <section id="bottom-section" className="space-y-6">
      
      {/* 3-Column Layout for Settings: Syringe Dimensions, Target Volumes, Advanced Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================================================= */}
        {/* 1. SYRINGE DIMENSIONS BOX (No check-valve delay) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Syringe Dimensions</h2>
              </div>
              <button
                onClick={handleReadFromPump}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                title="Read current syringe diameter register from pump"
              >
                <span>Sync from Pump</span>
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Syringe Preset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manufacturer Syringe Library:
                </label>
                <select
                  id="syringe-preset-select"
                  value={selectedPresetIndex}
                  onChange={(e) => handlePresetSelect(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SYRINGE_PRESETS.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.brand} &mdash; {preset.size} ({preset.diameterMm.toFixed(2)} mm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Syringe Inner Diameter Input (in mm) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Syringe Inside Diameter (ID):
                  </label>
                  <span className="text-[11px] font-mono text-blue-700 font-semibold">
                    Current: {telemetry.diameterMm.toFixed(2)} mm
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="syringe-diameter-input"
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="50"
                    value={diameterMm}
                    onChange={(e) => setDiameterMm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono text-slate-500 pointer-events-none">
                    mm
                  </span>
                </div>
              </div>

              {/* Syringe Nominal Capacity / Volume */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Syringe Volume Capacity:
                  </label>
                  <span className="text-[11px] font-mono text-blue-700 font-semibold">
                    Current: {telemetry.syringeVolume || 10} {telemetry.syringeVolumeUnit || 'ml'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    id="syringe-volume-input"
                    type="number"
                    step="0.1"
                    min="0.001"
                    value={syringeVolume}
                    onChange={(e) => setSyringeVolume(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    id="syringe-volume-unit-select"
                    value={syringeVolumeUnit}
                    onChange={(e) => setSyringeVolumeUnit(e.target.value)}
                    className="w-24 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ml">ml</option>
                    <option value="ul">µl</option>
                    <option value="nl">nl</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sends <code className="font-mono text-blue-700 bg-blue-50 px-1 rounded">diameter &lt;val&gt;</code> and <code className="font-mono text-blue-700 bg-blue-50 px-1 rounded">svolume &lt;val&gt; &lt;unit&gt;</code> to update pump specs & display.
                </p>
              </div>

            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              id="apply-diameter-btn"
              onClick={handleApplyDiameter}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {diameterSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Syringe Specs Applied to Pump!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-slate-600" />
                  <span>Send Syringe Specs to Pump</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TARGET VOLUME & FLOW RATES BOX */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Target Volume &amp; Flow Rates</h2>
              </div>
              <button
                onClick={handleReadFromPump}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                title="Read current flow rates and targets from pump"
              >
                <span>Sync from Pump</span>
              </button>
            </div>

            <div className="space-y-3.5">
              
              {/* Infuse Flow Rate (irate) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Infuse Flow Rate (irate):
                  </label>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    {telemetry.infuseRate || telemetry.flowRate} {formatDisplayUnit(telemetry.infuseRateUnit || telemetry.flowUnit || 'ml/min')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="infuse-flow-rate-input"
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={infuseRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setInfuseRate(val);
                      if (syncRates) setWithdrawRate(val);
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    id="infuse-flow-unit-select"
                    value={infuseRateUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      setInfuseRateUnit(unit);
                      if (syncRates) setWithdrawRateUnit(unit);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ml/min">ml/min</option>
                    <option value="ml/hr">ml/hr</option>
                    <option value="ul/min">µl/min</option>
                    <option value="ul/hr">µl/hr</option>
                    <option value="nl/min">nl/min</option>
                    <option value="nl/hr">nl/hr</option>
                  </select>
                </div>
              </div>

              {/* Withdraw Flow Rate (wrate) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Withdraw Flow Rate (wrate):
                  </label>
                  <span className="text-[11px] font-mono text-sky-700 font-semibold">
                    {telemetry.withdrawRate || telemetry.flowRate} {formatDisplayUnit(telemetry.withdrawRateUnit || telemetry.flowUnit || 'ml/min')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="withdraw-flow-rate-input"
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={withdrawRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setWithdrawRate(val);
                      if (syncRates) setInfuseRate(val);
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    id="withdraw-flow-unit-select"
                    value={withdrawRateUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      setWithdrawRateUnit(unit);
                      if (syncRates) setInfuseRateUnit(unit);
                    }}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ml/min">ml/min</option>
                    <option value="ml/hr">ml/hr</option>
                    <option value="ul/min">µl/min</option>
                    <option value="ul/hr">µl/hr</option>
                    <option value="nl/min">nl/min</option>
                    <option value="nl/hr">nl/hr</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    id="sync-rates-checkbox"
                    type="checkbox"
                    checked={syncRates}
                    onChange={(e) => {
                      setSyncRates(e.target.checked);
                      if (e.target.checked) {
                        setWithdrawRate(infuseRate);
                        setWithdrawRateUnit(infuseRateUnit);
                      }
                    }}
                    className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                  />
                  <label htmlFor="sync-rates-checkbox" className="text-[11px] text-slate-600 cursor-pointer select-none">
                    Link Infuse &amp; Withdraw flow rates (default identical)
                  </label>
                </div>
              </div>

              {/* Exclusive Target Mode Switch (Target Volume vs Target Time) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Target Limit Mode:
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Exclusive Limit
                  </span>
                </div>

                {/* Segmented Control Switch */}
                <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-lg border border-slate-200 gap-1">
                  <button
                    id="target-mode-volume-btn"
                    type="button"
                    onClick={() => setTargetMode('volume')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      targetMode === 'volume'
                        ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    Target Volume (Default)
                  </button>
                  <button
                    id="target-mode-time-btn"
                    type="button"
                    onClick={() => setTargetMode('time')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      targetMode === 'time'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Target Time
                  </button>
                </div>

                {/* 1. Target Volume Mode Panel */}
                {targetMode === 'volume' ? (
                  <div className="mt-3 p-3 bg-blue-50/40 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="target-volume-input" className="text-xs font-semibold text-slate-800">
                        Target Stroke Volume:
                      </label>
                      <span className="text-[11px] font-mono text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                        Current: {telemetry.targetVolume || telemetry.strokeTarget || 0} {formatDisplayUnit(telemetry.targetUnit || 'ml')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id="target-volume-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={targetVolume}
                        onChange={(e) => setTargetVolume(parseFloat(e.target.value) || 0)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      <select
                        id="target-volume-unit-select"
                        value={targetVolumeUnit}
                        onChange={(e) => setTargetVolumeUnit(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                      >
                        <option value="ml">ml</option>
                        <option value="ul">µl</option>
                        <option value="nl">nl</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      Hardware command: <code className="font-mono text-blue-700 bg-white px-1 py-0.5 rounded border border-blue-200">tvolume {targetVolume} {targetVolumeUnit}</code>. When reached, pump halts automatically and signals Target Reached.
                    </p>
                  </div>
                ) : (
                  /* 2. Target Time Mode Panel */
                  <div className="mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        Run Duration (hh:mm:ss):
                      </label>
                      <span className="text-[10px] text-amber-800 font-semibold bg-white px-2 py-0.5 rounded border border-amber-300">
                        Infuse &amp; Withdraw single runs
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div>
                        <span className="text-[10px] text-slate-600 block mb-0.5 font-medium">Hours (0-99)</span>
                        <input
                          id="target-time-hours-input"
                          type="number"
                          min="0"
                          max="99"
                          value={targetTimeHours}
                          onChange={(e) => setTargetTimeHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block mb-0.5 font-medium">Mins (0-59)</span>
                        <input
                          id="target-time-mins-input"
                          type="number"
                          min="0"
                          max="59"
                          value={targetTimeMins}
                          onChange={(e) => setTargetTimeMins(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                          className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block mb-0.5 font-medium">Secs (0-59)</span>
                        <input
                          id="target-time-secs-input"
                          type="number"
                          min="0"
                          max="59"
                          value={targetTimeSecs}
                          onChange={(e) => setTargetTimeSecs(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                          className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Quick Duration Buttons */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium mr-0.5">Quick:</span>
                      {[
                        { label: '15s', h: 0, m: 0, s: 15 },
                        { label: '30s', h: 0, m: 0, s: 30 },
                        { label: '1 min', h: 0, m: 1, s: 0 },
                        { label: '2 min', h: 0, m: 2, s: 0 },
                        { label: '5 min', h: 0, m: 5, s: 0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setTargetTimeHours(preset.h);
                            setTargetTimeMins(preset.m);
                            setTargetTimeSecs(preset.s);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 text-[10px] font-mono font-medium rounded border border-amber-200 transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Dynamic Delivery Calculator */}
                    {(() => {
                      const totalSecs = targetTimeHours * 3600 + targetTimeMins * 60 + targetTimeSecs;
                      const rateVolUnit = (infuseRateUnit || 'ml/min').split('/')[0] || 'ml';
                      const isRatePerHour = (infuseRateUnit || '').includes('/hr');
                      const ratePerSec = (infuseRate / (isRatePerHour ? 3600 : 60));
                      const estimatedVol = convertVolume(ratePerSec * totalSecs, rateVolUnit, targetVolumeUnit).toFixed(3);
                      return (
                        <div className="mt-2.5 p-2 bg-white/90 rounded border border-amber-200/80 text-[11px] text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Calculated delivery at {infuseRate} {infuseRateUnit}:</span>
                            <span className="font-mono font-bold text-amber-900">
                              ≈ {estimatedVol} {targetVolumeUnit}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Target volume is cleared on the pump (<code className="font-mono text-amber-800 bg-amber-100/70 px-1 rounded">ctvolume</code>) so the run is governed strictly by time. Upon completion, original target volume status is automatically reinstated.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              id="apply-targets-btn"
              onClick={handleApplyTargets}
              disabled={isApplyingTargets}
              className={`w-full py-2.5 px-3 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs ${
                isApplyingTargets
                  ? 'bg-blue-400 text-white cursor-wait opacity-90'
                  : targetsSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer hover:shadow-xs'
              }`}
            >
              {isApplyingTargets ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  <span>Programming Pump...</span>
                </>
              ) : targetsSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                  <span>Settings Confirmed on Pump!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Settings to Pump</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ADVANCED SETUP BOX (Baud, Force, Custom Programs) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">Advanced Hardware Setup</h2>
            </div>

            <div className="space-y-4">
              
              {/* Baud Rate Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Serial Baud Rate:
                  </label>
                  <span className="text-[11px] font-mono text-purple-700 font-semibold">
                    Current: {telemetry.baudRate}
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    id="baud-rate-select"
                    value={selectedBaud}
                    onChange={(e) => setSelectedBaud(parseInt(e.target.value, 10))}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={9600}>9600 baud</option>
                    <option value={19200}>19200 baud</option>
                    <option value={38400}>38400 baud</option>
                    <option value={57600}>57600 baud</option>
                    <option value={115200}>115200 baud (Default)</option>
                  </select>
                  <button
                    onClick={handleApplyBaud}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    {baudSaved ? 'Set!' : 'Set Baud'}
                  </button>
                </div>
              </div>

              {/* Force Setting */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Motor Linear Force %:
                  </label>
                  <span className="text-[11px] font-mono text-purple-700 font-bold">
                    {forcePercent}% Force
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="force-slider"
                    type="range"
                    min="20"
                    max="100"
                    step="10"
                    value={forcePercent}
                    onChange={(e) => setForcePercent(parseInt(e.target.value, 10))}
                    className="flex-1 accent-purple-600 cursor-pointer"
                  />
                  <button
                    onClick={handleApplyForce}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    {forceSaved ? 'Set!' : 'Set Force'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Limits maximum motor torque (<code className="font-mono text-purple-700 bg-purple-50 px-1 rounded">force {forcePercent}</code>) to protect delicate glass syringes.
                </p>
              </div>

            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Harvard Bioscience ASCII Standard V2.1 compatibility.</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. CUSTOM PUMPING PROGRAMS BUILDER (Method Sequencer) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Custom Pumping Programs (Method Builder)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Program multi-step sequential dispensing methods (Infuse, Withdraw, Pause/Delay, Ramp) executed directly through the serial interface.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {telemetry.isProgramRunning ? (
              <button
                id="stop-program-btn"
                onClick={handleStopProgram}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Program</span>
              </button>
            ) : (
              <button
                id="run-program-btn"
                onClick={handleRunProgram}
                disabled={programSteps.length === 0}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Custom Program ({programSteps.length} Steps)</span>
              </button>
            )}

            <button
              id="clear-program-btn"
              onClick={handleClearProgram}
              disabled={programSteps.length === 0 || telemetry.isProgramRunning}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg border border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Program Steps Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3 w-16 text-center">Order</th>
                <th className="py-2.5 px-3">Step #</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Volume</th>
                <th className="py-2.5 px-3">Flow Rate</th>
                <th className="py-2.5 px-3">Duration / Pause</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programSteps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-slate-400">
                    No steps in program. Use the form below to add infusion, withdrawal, pause, or ramp steps.
                  </td>
                </tr>
              ) : (
                programSteps.map((step, index) => {
                  const isActive = telemetry.isProgramRunning && telemetry.currentProgramStep === step.stepNumber;
                  const isEditing = editingStepId === step.id;

                  if (isEditing && editFormData) {
                    return (
                      <tr key={step.id} className="bg-blue-50/70 border-y border-blue-200">
                        {/* Order info */}
                        <td className="py-2 px-3 text-center">
                          <span className="font-mono text-[11px] text-blue-700 font-bold">#{index + 1}</span>
                        </td>

                        {/* Step # */}
                        <td className="py-2 px-3 font-mono font-bold text-blue-900">
                          Step {step.stepNumber}
                        </td>

                        {/* Edit Type */}
                        <td className="py-2 px-3">
                          <select
                            value={editFormData.type}
                            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as any })}
                            className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          >
                            <option value="infuse">Infuse</option>
                            <option value="withdraw">Withdraw</option>
                            <option value="pause">Pause / Delay</option>
                            <option value="ramp">Ramp Rate</option>
                          </select>
                        </td>

                        {/* Edit Volume */}
                        <td className="py-2 px-3">
                          {editFormData.type === 'pause' ? (
                            <span className="text-slate-400 italic text-[11px]">N/A</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.001"
                                value={editFormData.volume}
                                onChange={(e) => setEditFormData({ ...editFormData, volume: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <select
                                value={editFormData.volumeUnit}
                                onChange={(e) => setEditFormData({ ...editFormData, volumeUnit: e.target.value as any })}
                                className="px-1.5 py-1 bg-white border border-blue-300 rounded text-xs font-mono text-slate-700 focus:outline-none"
                              >
                                <option value="ml">ml</option>
                                <option value="ul">µl</option>
                                <option value="nl">nl</option>
                              </select>
                            </div>
                          )}
                        </td>

                        {/* Edit Rate */}
                        <td className="py-2 px-3">
                          {editFormData.type === 'pause' ? (
                            <span className="text-slate-400 italic text-[11px]">N/A</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.001"
                                value={editFormData.rate}
                                onChange={(e) => setEditFormData({ ...editFormData, rate: parseFloat(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <select
                                value={editFormData.rateUnit}
                                onChange={(e) => setEditFormData({ ...editFormData, rateUnit: e.target.value as any })}
                                className="px-1.5 py-1 bg-white border border-blue-300 rounded text-xs font-mono text-slate-700 focus:outline-none"
                              >
                                <option value="ml/min">ml/min</option>
                                <option value="ml/hr">ml/hr</option>
                                <option value="ul/min">µl/min</option>
                                <option value="ul/hr">µl/hr</option>
                                <option value="nl/min">nl/min</option>
                                <option value="nl/hr">nl/hr</option>
                              </select>
                            </div>
                          )}
                        </td>

                        {/* Edit Duration */}
                        <td className="py-2 px-3">
                          {editFormData.type === 'pause' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={editFormData.durationSec || 5}
                                onChange={(e) => setEditFormData({ ...editFormData, durationSec: parseInt(e.target.value, 10) || 0 })}
                                className="w-20 px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <span className="text-xs text-slate-600 font-mono">sec</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Auto (Target Vol)</span>
                          )}
                        </td>

                        {/* Save / Cancel */}
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={handleSaveEdit}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-md transition-colors cursor-pointer"
                              title="Cancel editing"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={step.id}
                      className={`transition-colors ${
                        isActive ? 'bg-indigo-50 border-l-4 border-indigo-600 font-semibold' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Reorder Buttons */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleMoveStepUp(index)}
                            disabled={index === 0 || telemetry.isProgramRunning}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Move step up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveStepDown(index)}
                            disabled={index === programSteps.length - 1 || telemetry.isProgramRunning}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            title="Move step down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {isActive && <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 mr-1.5 animate-ping"></span>}
                        Step {step.stepNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            step.type === 'infuse'
                              ? 'bg-emerald-100 text-emerald-800'
                              : step.type === 'withdraw'
                              ? 'bg-sky-100 text-sky-800'
                              : step.type === 'pause'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {step.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">
                        {step.type === 'pause' ? '—' : `${step.volume} ${formatDisplayUnit(step.volumeUnit)}`}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-900">
                        {step.type === 'pause' ? '—' : `${step.rate} ${formatDisplayUnit(step.rateUnit)}`}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {step.type === 'pause' ? `${step.durationSec} seconds` : 'Auto (Until Target)'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEdit(step)}
                            disabled={telemetry.isProgramRunning}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                            title="Edit Step Parameters"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            disabled={telemetry.isProgramRunning}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                            title="Delete Step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add Step Inline Form */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Add Step to Program</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
            
            {/* Step Type */}
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Type
              </label>
              <select
                value={newStepType}
                onChange={(e) => setNewStepType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="infuse">Infuse</option>
                <option value="withdraw">Withdraw</option>
                <option value="pause">Pause / Delay</option>
                <option value="ramp">Ramp Rate</option>
              </select>
            </div>

            {/* Target Volume (if not pause) */}
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Volume
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.001"
                  disabled={newStepType === 'pause'}
                  value={newStepVol}
                  onChange={(e) => setNewStepVol(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <select
                  disabled={newStepType === 'pause'}
                  value={newStepVolUnit}
                  onChange={(e) => setNewStepVolUnit(e.target.value as any)}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="ml">ml</option>
                  <option value="ul">µl</option>
                  <option value="nl">nl</option>
                </select>
              </div>
            </div>

            {/* Rate (if not pause) */}
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Flow Rate
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.001"
                  disabled={newStepType === 'pause'}
                  value={newStepRate}
                  onChange={(e) => setNewStepRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <select
                  disabled={newStepType === 'pause'}
                  value={newStepRateUnit}
                  onChange={(e) => setNewStepRateUnit(e.target.value as any)}
                  className="px-1.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="ml/min">ml/min</option>
                  <option value="ml/hr">ml/hr</option>
                  <option value="ul/min">µl/min</option>
                  <option value="ul/hr">µl/hr</option>
                  <option value="nl/min">nl/min</option>
                  <option value="nl/hr">nl/hr</option>
                </select>
              </div>
            </div>

            {/* Pause Duration (if pause) */}
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                Pause Duration (sec)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                disabled={newStepType !== 'pause'}
                value={newStepDuration}
                onChange={(e) => setNewStepDuration(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            {/* Add Button */}
            <div>
              <button
                id="add-step-btn"
                onClick={handleAddStep}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </section>
  );
};
