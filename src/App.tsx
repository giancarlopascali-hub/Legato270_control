import React, { useState } from 'react';
import { Header } from './components/Header';
import { TopSection } from './components/TopSection';
import { BottomSection } from './components/BottomSection';
import { DiagnosticConsole } from './components/DiagnosticConsole';

export default function App() {
  const [showTerminal, setShowTerminal] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Header with Connect USB, Status Flag (Idle/Running/Error), Baud selector, and Terminal Toggle */}
      <Header
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal((prev) => !prev)}
      />

      {/* 2. Main Single-Page Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        
        {/* Top Section: Command Buttons, Dynamic Syringe Visualizer, and Summary of System Parameters */}
        <TopSection />

        {/* Diagnostic Live Serial Terminal (matching PumpTerminal & Communicator tools) */}
        {showTerminal && <DiagnosticConsole />}

        {/* Bottom Section: Syringe Dimensions, Target Volumes, Advanced Setup & Custom Programs */}
        <BottomSection />

      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-3.5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">KD Scientific Legato 270 Controller</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-slate-500 font-mono text-[11px]">Harvard Bioscience ASCII Standard V2.1</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Direct Browser USB Web Serial API Control &bull; Chrome &amp; Edge Hardware Supported
          </div>
        </div>
      </footer>

    </div>
  );
}
