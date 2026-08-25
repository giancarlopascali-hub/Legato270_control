import React, { useState, useEffect } from 'react';
import { pumpController, PumpTelemetry, formatDisplayUnit } from '../services/webSerialPump';
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
  HelpCircle
} from 'lucide-react';

export const BottomSection: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);

  // 1. Syringe Dimensions State
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(3); // Default to BD Plastic 10ml
  const [diameterMm, setDiameterMm] = useState<number>(14.50);
  const [diameterSaved, setDiameterSaved] = useState<boolean>(false);

  // 2. Target Volumes State
  const [infuseTarget, setInfuseTarget] = useState<number>(5.0);
  const [infuseTargetUnit, setInfuseTargetUnit] = useState<'ml' | 'ul' | 'nl'>('ml');

  const [withdrawTarget, setWithdrawTarget] = useState<number>(5.0);
  const [withdrawTargetUnit, setWithdrawTargetUnit] = useState<'ml' | 'ul' | 'nl'>('ml');

  const [strokeTarget, setStrokeTarget] = useState<number>(5.0);
  const [strokeTargetUnit, setStrokeTargetUnit] = useState<'ml' | 'ul' | 'nl'>('ml');

  const [flowRate, setFlowRate] = useState<number>(2.5);
  const [flowRateUnit, setFlowRateUnit] = useState<string>('ml/min');
  const [targetsSaved, setTargetsSaved] = useState<boolean>(false);

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

  // Explicitly pull parameters from pump into UI forms if requested
  const handleReadFromPump = async () => {
    await pumpController.queryAllPumpParameters();
    const t = pumpController.state;
    if (t.diameterMm && t.diameterMm > 0) {
      setDiameterMm(t.diameterMm);
    }
    if (t.flowRate && t.flowRate > 0) {
      setFlowRate(t.flowRate);
    }
    if (t.flowUnit) {
      setFlowRateUnit(t.flowUnit);
    }
    if (t.targetVolume && t.targetVolume > 0) {
      setStrokeTarget(t.targetVolume);
      setInfuseTarget(t.targetVolume);
      setWithdrawTarget(t.targetVolume);
    }
    if (t.targetUnit) {
      setStrokeTargetUnit(t.targetUnit as any);
      setInfuseTargetUnit(t.targetUnit as any);
      setWithdrawTargetUnit(t.targetUnit as any);
    }
  };

  // Handle Preset Change
  const handlePresetSelect = (idx: number) => {
    setSelectedPresetIndex(idx);
    const preset = SYRINGE_PRESETS[idx];
    if (preset) {
      setDiameterMm(preset.diameterMm);
    }
  };

  // Apply Syringe Diameter
  const handleApplyDiameter = async () => {
    await pumpController.setParameters({ diameterMm });
    setDiameterSaved(true);
    setTimeout(() => setDiameterSaved(false), 2000);
  };

  // Apply Target Volumes & Flow Rate
  const handleApplyTargets = async () => {
    await pumpController.setParameters({
      diameterMm,
      flowRate,
      flowUnit: flowRateUnit,
      targetVolume: strokeTarget || infuseTarget,
      targetUnit: strokeTargetUnit,
      strokeTarget,
      infuseTarget,
      withdrawTarget
    });
    setTargetsSaved(true);
    setTimeout(() => setTargetsSaved(false), 2000);
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
                <p className="text-[11px] text-slate-500 mt-1">
                  Sends standard <code className="font-mono text-blue-700 bg-blue-50 px-1 rounded">diameter &lt;val&gt;</code> ASCII command.
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
                  <span className="text-emerald-700">Diameter Applied to Pump!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-slate-600" />
                  <span>Send Diameter to Pump</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TARGET VOLUMES BOX */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Target Volumes &amp; Flow Rates</h2>
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
              
              {/* Flow Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pumping Flow Rate:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="target-flow-rate-input"
                    type="number"
                    step="0.001"
                    min="0.0001"
                    value={flowRate}
                    onChange={(e) => setFlowRate(parseFloat(e.target.value) || 0)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    id="target-flow-unit-select"
                    value={flowRateUnit}
                    onChange={(e) => setFlowRateUnit(e.target.value)}
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

              {/* Stroke Target (Primary Stroke Volume) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stroke Target (Per-Cycle Limit):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    id="stroke-target-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={strokeTarget}
                    onChange={(e) => setStrokeTarget(parseFloat(e.target.value) || 0)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    id="stroke-target-unit-select"
                    value={strokeTargetUnit}
                    onChange={(e) => setStrokeTargetUnit(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ml">ml</option>
                    <option value="ul">µl</option>
                    <option value="nl">nl</option>
                  </select>
                </div>
              </div>

              {/* Infuse Target & Withdraw Target */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Infuse Target:
                  </label>
                  <div className="relative">
                    <input
                      id="infuse-target-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={infuseTarget}
                      onChange={(e) => setInfuseTarget(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                      {formatDisplayUnit(strokeTargetUnit)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Withdraw Target:
                  </label>
                  <div className="relative">
                    <input
                      id="withdraw-target-input"
                      type="number"
                      step="0.1"
                      min="0"
                      value={withdrawTarget}
                      onChange={(e) => setWithdrawTarget(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                      {formatDisplayUnit(strokeTargetUnit)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              id="apply-targets-btn"
              onClick={handleApplyTargets}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {targetsSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Settings Sent to Pump!</span>
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
