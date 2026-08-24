import React, { useState } from 'react';
import { Header, ActiveTab } from './components/Header';
import { ConstantPumpMonitor } from './components/ConstantPumpMonitor';
import { DirectPumpControl } from './components/DirectPumpControl';
import { PythonScriptGenerator } from './components/PythonScriptGenerator';
import { ProtocolReference } from './components/ProtocolReference';
import { ContinuousGuide } from './components/ContinuousGuide';
import { GitHubPagesGuide } from './components/GitHubPagesGuide';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('direct');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Laboratory Navigation Bar */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Persistent Real-Time Pump Status & Dual-Carriage Monitor Window */}
      <ConstantPumpMonitor />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'direct' && <DirectPumpControl />}
        {activeTab === 'python' && <PythonScriptGenerator />}
        {activeTab === 'protocol' && <ProtocolReference />}
        {activeTab === 'continuous' && <ContinuousGuide />}
        {activeTab === 'github' && <GitHubPagesGuide />}
      </main>

      {/* Laboratory Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">KD Scientific Legato 270 Fluidics Suite</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500">Harvard Bioscience Standard ASCII Protocol</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Direct Browser USB Control (Web Serial API) &amp; Python driver generator. Zero software installation required.
          </div>
        </div>
      </footer>

    </div>
  );
}
