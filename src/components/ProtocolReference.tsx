import React, { useState } from 'react';
import { LEGATO_COMMANDS, PROMPT_CODES } from '../data/legatoCommands';
import { Search, Info, Terminal, Cable, AlertTriangle, CheckCircle2, Copy, Check, BookOpen } from 'lucide-react';

export const ProtocolReference: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const filteredCommands = LEGATO_COMMANDS.filter((cmd) => {
    const matchesSearch =
      cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.syntax.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="protocol-reference-tab" className="space-y-6">
      
      {/* Intro Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">KD Scientific Legato 270 ASCII Command Manual</h2>
        <p className="text-xs text-slate-600 mt-1">
          Complete reference for all serial commands, syntax formats, response structures, and status prompt characters used by the Harvard Bioscience / KD Scientific Legato 200 series controllers.
        </p>
      </div>

      {/* Serial Hardware Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-blue-600">
            <Cable className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">USB / Serial Hardware Specs</h3>
          </div>
          <ul className="text-xs text-slate-700 space-y-2">
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">Baud Rates:</span>
              <span className="font-mono font-semibold text-slate-900">115200 or 9600 (8-N-1)</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500">Handshake:</span>
              <span className="font-mono font-semibold text-slate-900">None (Flow Control: Off)</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-500">Line Terminator:</span>
              <span className="font-mono font-semibold text-blue-700">\r (CR - ASCII 0x0D)</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-emerald-600">
            <Terminal className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Packet &amp; Address Protocol</h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2">
            <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[11px] text-slate-800 border border-slate-200">
              TX: [address]command\r<br />
              RX: \n[address:]response\n[address]prompt
            </div>
            <p className="text-[11px] text-slate-500">
              Standalone pump address is typically <code className="font-mono text-blue-700">00</code> (or empty prefix if address=0).
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-amber-600">
            <Info className="w-5 h-5" />
            <h3 className="font-bold text-sm text-slate-900">Critical Integration Notes</h3>
          </div>
          <ul className="text-xs text-slate-700 space-y-1.5">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span>Send <code className="font-mono text-blue-700">echo off</code> on startup to avoid duplicated echo packets.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <span>Always send <code className="font-mono text-blue-700">diameter</code> before setting flow rates.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Prompt Status Characters Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <span>Legato Return Prompt Characters</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {PROMPT_CODES.map((item) => (
            <div key={item.prompt} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <div className="text-lg font-mono font-bold text-blue-700">{item.prompt}</div>
              <div className="text-xs font-semibold text-slate-800 mt-0.5">{item.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search commands, syntax, keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['all', 'motion', 'rate', 'volume', 'config', 'query'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Command List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Command</th>
                <th className="py-3 px-4">Syntax &amp; Parameters</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Example Response</th>
                <th className="py-3 px-4 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommands.map((cmd) => (
                <tr key={cmd.command} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">
                    {cmd.command}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800">
                    {cmd.syntax}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs">
                    {cmd.description}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-emerald-700 whitespace-pre-wrap">
                    {cmd.response}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => copyToClipboard(cmd.syntax, cmd.command)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      title="Copy command syntax"
                    >
                      {copiedCmd === cmd.command ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
