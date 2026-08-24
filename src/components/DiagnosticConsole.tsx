import React, { useState, useEffect, useRef } from 'react';
import { pumpController, PumpTelemetry, SerialLogItem, Legato270WebController } from '../services/webSerialPump';
import {
  Terminal,
  Send,
  Trash2,
  Copy,
  ExternalLink,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Usb,
  Power,
  ArrowDownCircle
} from 'lucide-react';

export const DiagnosticConsole: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);
  const [logs, setLogs] = useState<SerialLogItem[]>([]);
  const [manualCmd, setManualCmd] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [autoDetecting, setAutoDetecting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsIframe(Legato270WebController.isInsideIframe());

    const unsubTelemetry = pumpController.subscribeTelemetry((t) => setTelemetry(t));
    const unsubLogs = pumpController.subscribeLog((log) => {
      setLogs((prev) => [...prev.slice(-250), log]);
    });

    return () => {
      unsubTelemetry();
      unsubLogs();
    };
  }, []);

  // Scroll ONLY the inner terminal container without affecting the browser page scroll
  useEffect(() => {
    if (autoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleTerminalScroll = () => {
    if (!terminalContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  };

  const handleSendCommand = async (cmdToSend?: string) => {
    const cmd = cmdToSend || manualCmd;
    if (!cmd.trim()) return;

    setCommandHistory((prev) => [cmd, ...prev.slice(0, 30)]);
    setHistoryIndex(-1);
    if (!cmdToSend) setManualCmd('');

    scrollToBottom();
    await pumpController.sendCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setManualCmd(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setManualCmd(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setManualCmd('');
      }
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoDetectBaud = async () => {
    setAutoDetecting(true);
    await pumpController.autoDetectBaudRate();
    setAutoDetecting(false);
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const quickCommands = [
    { label: 'ver', cmd: 'ver', desc: 'Query firmware model & version' },
    { label: 'status', cmd: 'status', desc: 'Query current motor state' },
    { label: 'poll', cmd: 'poll', desc: 'Query address & prompt symbol' },
    { label: 'echo off', cmd: 'echo off', desc: 'Disable terminal command echo' },
    { label: 'diameter ?', cmd: 'diameter', desc: 'Query calibrated syringe ID' },
    { label: 'irate ?', cmd: 'irate', desc: 'Query infuse flow rate' },
    { label: 'wrate ?', cmd: 'wrate', desc: 'Query withdraw flow rate' },
    { label: 'tvolume ?', cmd: 'tvolume', desc: 'Query target volume' },
    { label: 'ivolume', cmd: 'ivolume', desc: 'Query delivered infuse volume' },
    { label: 'wvolume', cmd: 'wvolume', desc: 'Query delivered withdraw volume' },
    { label: 'cvolume', cmd: 'cvolume', desc: 'Clear volume counters to 0' },
    { label: 'irun', cmd: 'irun', desc: 'Start forward push' },
    { label: 'wrun', cmd: 'wrun', desc: 'Start reverse refill' },
    { label: 'stop', cmd: 'stop', desc: 'Emergency halt motor' },
  ];

  return (
    <section id="diagnostic-terminal-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-xl space-y-4">
      
      {/* Header with connection indicators */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Hardware Communication Terminal &amp; Protocol Inspector
              </h2>
              <button
                id="terminal-toggle-usb-btn"
                onClick={async () => {
                  if (telemetry.isRealHardware) {
                    await pumpController.disconnectUSB();
                  } else {
                    await pumpController.connectUSB(telemetry.baudRate || 115200);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                  telemetry.isRealHardware
                    ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40'
                    : 'bg-slate-800 hover:bg-blue-600/30 text-slate-400 hover:text-blue-300 border border-slate-700 hover:border-blue-500/40'
                }`}
                title={telemetry.isRealHardware ? 'Click to Disconnect physical USB' : 'Click to Connect physical USB'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${telemetry.isRealHardware ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                <span>{telemetry.isRealHardware ? 'Direct USB Active (Disconnect)' : 'Virtual Simulator (Connect)'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Harvard Bioscience / KD Scientific ASCII Protocol (8-N-1, {telemetry.baudRate} Baud, Prompt: <span className="text-amber-400 font-bold">{telemetry.prompt}</span>)
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="terminal-autoscroll-btn"
            onClick={() => {
              if (!autoScroll) scrollToBottom();
              else setAutoScroll(false);
            }}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              autoScroll
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title={autoScroll ? 'Auto-scroll is active. Click to pause.' : 'Auto-scroll is paused. Click to resume and snap to bottom.'}
          >
            <ArrowDownCircle className={`w-3.5 h-3.5 ${autoScroll ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>{autoScroll ? 'Auto-scroll: ON' : 'Scroll: PAUSED'}</span>
          </button>

          <button
            id="terminal-copy-btn"
            onClick={handleCopyLogs}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy all serial logs to clipboard"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>{copied ? 'Copied!' : 'Copy Log'}</span>
          </button>
          
          <button
            id="terminal-clear-btn"
            onClick={handleClearLogs}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            title="Clear terminal screen"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Iframe Notice & New Tab Button */}
      {isIframe && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Browser Security Notice:</strong>
              <p className="text-amber-200/90 text-[11px] mt-0.5">
                Chrome &amp; Edge block Web Serial API access inside embedded iframe previews. For direct USB communication with the physical Legato 200 pump, open this app in a dedicated browser tab.
              </p>
            </div>
          </div>
          <button
            id="open-new-tab-btn"
            onClick={handleOpenNewTab}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </button>
        </div>
      )}

      {/* Hardware Control Signals & Auto-Baud Bar */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
        
        {/* Baud rate & Auto-detect */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-semibold">Baud:</span>
          <select
            value={telemetry.baudRate}
            onChange={(e) => pumpController.setParameters({ baudRate: parseInt(e.target.value, 10) })}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-blue-500"
          >
            <option value={9600}>9600 baud</option>
            <option value={19200}>19200 baud</option>
            <option value={38400}>38400 baud</option>
            <option value={57600}>57600 baud</option>
            <option value={115200}>115200 baud (Default)</option>
          </select>

          {telemetry.isRealHardware && (
            <button
              onClick={handleAutoDetectBaud}
              disabled={autoDetecting}
              className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${autoDetecting ? 'animate-spin' : ''}`} />
              <span>{autoDetecting ? 'Detecting...' : 'Auto-Detect'}</span>
            </button>
          )}
        </div>

        {/* Hardware Control Signals (DTR / RTS) */}
        <div className="flex items-center gap-4 sm:justify-center">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={telemetry.dtrEnabled}
              onChange={(e) => pumpController.setControlSignals(e.target.checked, telemetry.rtsEnabled)}
              className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0"
            />
            <span>DTR (Data Terminal Ready)</span>
          </label>

          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={telemetry.rtsEnabled}
              onChange={(e) => pumpController.setControlSignals(telemetry.dtrEnabled, e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0"
            />
            <span>RTS (Request To Send)</span>
          </label>
        </div>

        {/* Active Pump Info */}
        <div className="flex items-center justify-start sm:justify-end gap-2 text-[11px] text-slate-400 font-mono">
          <span>Model: <strong className="text-slate-200">{telemetry.pumpModel || 'Legato 200/270'}</strong></span>
          <span className="text-slate-600">|</span>
          <span>Addr: <strong className="text-blue-400">{telemetry.pumpAddress || '00'}</strong></span>
        </div>

      </div>

      {/* Terminal Output Log Screen */}
      <div className="relative">
        <div
          id="terminal-output-container"
          ref={terminalContainerRef}
          onScroll={handleTerminalScroll}
          className="h-64 sm:h-72 bg-black/90 border border-slate-800 rounded-xl p-3 font-mono text-xs overflow-y-auto space-y-1.5 shadow-inner"
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs">
              <Terminal className="w-8 h-8 mb-2 opacity-30" />
              <p>Serial Terminal ready. Connect USB or send ASCII commands below.</p>
            </div>
          ) : (
            logs.map((item) => (
              <div key={item.id} className="leading-relaxed flex items-start gap-2">
                <span className="text-slate-600 text-[10px] select-none shrink-0 font-mono">
                  {item.timestamp}
                </span>

                {item.type === 'tx' && (
                  <div className="text-cyan-400">
                    <span className="text-cyan-600 font-bold select-none">&rarr; TX: </span>
                    <span className="font-bold">{item.text}</span>
                    <span className="text-slate-600 text-[10px]"> \r</span>
                  </div>
                )}

                {item.type === 'rx' && (
                  <div className="text-emerald-400">
                    <span className="text-emerald-600 font-bold select-none">&larr; RX: </span>
                    <span className="whitespace-pre-wrap">{item.text}</span>
                  </div>
                )}

                {item.type === 'info' && (
                  <div className="text-blue-300 italic">
                    <span className="text-blue-500 select-none">[INFO] </span>
                    <span>{item.text}</span>
                  </div>
                )}

                {item.type === 'error' && (
                  <div className="text-rose-400 font-semibold">
                    <span className="text-rose-500 select-none">[ERROR] </span>
                    <span>{item.text}</span>
                  </div>
                )}

                {item.type === 'cycle' && (
                  <div className="text-purple-300 font-bold">
                    <span className="text-purple-500 select-none">[CYCLE] </span>
                    <span>{item.text}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Floating pill when auto-scroll is paused and user scrolled up */}
        {!autoScroll && logs.length > 0 && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-3 right-4 px-3 py-1 bg-blue-600/90 hover:bg-blue-500 text-white text-xs rounded-full shadow-lg border border-blue-400/30 flex items-center gap-1.5 backdrop-blur transition-all active:scale-95 cursor-pointer"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Scroll to latest</span>
          </button>
        )}
      </div>

      {/* Quick Command Toolbar */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
          <span>Quick Protocol Commands:</span>
          <span className="text-slate-500 text-[10px]">Click any chip to transmit immediately with \r</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickCommands.map((q) => (
            <button
              key={q.cmd}
              onClick={() => handleSendCommand(q.cmd)}
              title={q.desc}
              className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-md text-xs font-mono transition-all active:scale-95 cursor-pointer"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Command Input Box */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            id="manual-serial-cmd-input"
            type="text"
            value={manualCmd}
            onChange={(e) => setManualCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type raw ASCII command (e.g. ver, irate 5.0 ml/min, irun, stop)... Press Enter or Send"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-12 shadow-inner"
          />
          <span className="absolute right-3 top-2.5 text-slate-500 font-mono text-xs pointer-events-none select-none">
            \r
          </span>
        </div>

        <button
          id="send-manual-cmd-btn"
          onClick={() => handleSendCommand()}
          disabled={!manualCmd.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>

    </section>
  );
};
