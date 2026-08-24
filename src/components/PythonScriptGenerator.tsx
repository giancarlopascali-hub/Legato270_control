import React, { useState } from 'react';
import { SYRINGE_PRESETS } from '../data/legatoCommands';
import { generateContinuousPushPullScript, generatePythonDriver, generateQuickTestScript } from '../data/pythonTemplates';
import { PumpParameters, SerialSettings } from '../types';
import { Check, Copy, Download, FileCode, Play, Settings, Sliders, Sparkles, Terminal } from 'lucide-react';

export const PythonScriptGenerator: React.FC = () => {
  // Serial settings
  const [serial, setSerial] = useState<SerialSettings>({
    port: 'COM3',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    timeout: 1.0,
    address: 0,
  });

  // Pump parameters
  const [params, setParams] = useState<PumpParameters>({
    syringeBrand: 'BD Plastic (Luer-Lok)',
    syringeSize: '10 ml',
    customDiameterMm: 14.50,
    useCustomDiameter: false,
    infuseRate: 2.5,
    infuseUnit: 'ml/min',
    withdrawRate: 2.5,
    withdrawUnit: 'ml/min',
    targetVolume: 5.0,
    targetVolumeUnit: 'ml',
    mode: 'continuous_push_pull',
    cycleDelaySec: 0.2,
    cycles: 0, // 0 = continuous
  });

  const [activeCodeTab, setActiveCodeTab] = useState<'driver' | 'continuous' | 'quick'>('continuous');
  const [copied, setCopied] = useState(false);

  // Handle syringe preset change
  const handlePresetChange = (presetName: string) => {
    const found = SYRINGE_PRESETS.find(p => `${p.brand} - ${p.size}` === presetName);
    if (found) {
      setParams(prev => ({
        ...prev,
        syringeBrand: found.brand,
        syringeSize: found.size,
        customDiameterMm: found.diameterMm,
        useCustomDiameter: found.brand === 'Custom Syringe',
      }));
    }
  };

  const driverCode = generatePythonDriver(params, serial);
  const continuousCode = generateContinuousPushPullScript(params, serial);
  const quickCode = generateQuickTestScript(params, serial);

  const getActiveCode = () => {
    switch (activeCodeTab) {
      case 'driver': return { name: 'legato270.py', code: driverCode };
      case 'continuous': return { name: 'continuous_push_pull.py', code: continuousCode };
      case 'quick': return { name: 'test_connection.py', code: quickCode };
    }
  };

  const currentCode = getActiveCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([currentCode.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = currentCode.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div id="python-generator-tab" className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Python Automation Script &amp; Driver Generator</h2>
          <p className="text-xs text-slate-600 mt-1">
            Generate clean, zero-dependency <code className="font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">pyserial</code> Python scripts tailored to your KD Scientific Legato 270 push/pull experiment parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Python Code'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download .py</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Script Settings Form */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Serial Port Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
              <Terminal className="w-4 h-4 text-blue-600" />
              <span>USB Serial Communication Settings</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Port (e.g. COM3 or /dev/ttyUSB0)
                </label>
                <input
                  type="text"
                  value={serial.port}
                  onChange={(e) => setSerial({ ...serial, port: e.target.value })}
                  className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Baud Rate
                </label>
                <select
                  value={serial.baudRate}
                  onChange={(e) => setSerial({ ...serial, baudRate: Number(e.target.value) })}
                  className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={115200}>115200 bps (Standard)</option>
                  <option value={9600}>9600 bps</option>
                  <option value={19200}>19200 bps</option>
                  <option value={38400}>38400 bps</option>
                  <option value={57600}>57600 bps</option>
                </select>
              </div>
            </div>
          </div>

          {/* Syringe Configuration */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Syringe Calibration &amp; Dimensions</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Syringe Manufacturer &amp; Size
              </label>
              <select
                value={`${params.syringeBrand} - ${params.syringeSize}`}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {SYRINGE_PRESETS.map((preset) => (
                  <option key={`${preset.brand} - ${preset.size}`} value={`${preset.brand} - ${preset.size}`}>
                    {preset.brand} — {preset.size} ({preset.diameterMm} mm ID)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Barrel Inner Diameter (mm)
              </label>
              <input
                type="number"
                step="0.001"
                value={params.customDiameterMm}
                onChange={(e) => setParams({ ...params, customDiameterMm: parseFloat(e.target.value) || 0, useCustomDiameter: true })}
                className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Flow Parameters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
              <Settings className="w-4 h-4 text-blue-600" />
              <span>Flow Rates &amp; Stroke Distance</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Infusion Flow Rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={params.infuseRate}
                  onChange={(e) => setParams({ ...params, infuseRate: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Units
                </label>
                <select
                  value={params.infuseUnit}
                  onChange={(e) => setParams({ ...params, infuseUnit: e.target.value as any })}
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ml/min">ml/min</option>
                  <option value="ml/hr">ml/hr</option>
                  <option value="ul/min">ul/min</option>
                  <option value="ul/hr">ul/hr</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Stroke Volume (ml)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={params.targetVolume}
                  onChange={(e) => setParams({ ...params, targetVolume: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Cycles (0 = Non-stop)
                </label>
                <input
                  type="number"
                  value={params.cycles}
                  onChange={(e) => setParams({ ...params, cycles: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Code Viewer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Tab Selector */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveCodeTab('continuous')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeCodeTab === 'continuous'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  continuous_push_pull.py
                </button>
                <button
                  onClick={() => setActiveCodeTab('driver')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeCodeTab === 'driver'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  legato270.py (Driver Class)
                </button>
                <button
                  onClick={() => setActiveCodeTab('quick')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeCodeTab === 'quick'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  test_connection.py
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                Python 3.8+ / pyserial
              </span>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-200 h-[560px] overflow-y-auto select-text leading-relaxed">
              <pre>{currentCode.code}</pre>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
