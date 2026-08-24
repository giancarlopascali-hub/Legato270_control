import React from 'react';
import {
  Activity,
  BookOpen,
  Code2,
  Cpu,
  Github,
  Globe,
  Sliders,
  Terminal,
  Usb,
  Zap
} from 'lucide-react';

export type ActiveTab = 'direct' | 'python' | 'protocol' | 'continuous' | 'github';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs text-white font-black text-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  KD Scientific Legato 270
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Push / Pull Fluidics Suite
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direct Web Serial USB Controller &amp; Python Automation Driver
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto overflow-x-auto max-w-full">
            
            <button
              id="tab-direct-control"
              onClick={() => setActiveTab('direct')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'direct'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Usb className="w-4 h-4 text-blue-600" />
              <span>Direct USB Control</span>
            </button>

            <button
              id="tab-python-generator"
              onClick={() => setActiveTab('python')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'python'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Code2 className="w-4 h-4 text-indigo-600" />
              <span>Python Generator</span>
            </button>

            <button
              id="tab-command-manual"
              onClick={() => setActiveTab('protocol')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'protocol'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-slate-700" />
              <span>Command Manual</span>
            </button>

            <button
              id="tab-continuous-guide"
              onClick={() => setActiveTab('continuous')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'continuous'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Push/Pull Guide</span>
            </button>

            <button
              id="tab-github-deploy"
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'github'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Github className="w-4 h-4 text-slate-800" />
              <span>GitHub Deploy</span>
            </button>

          </nav>

        </div>
      </div>
    </header>
  );
};
