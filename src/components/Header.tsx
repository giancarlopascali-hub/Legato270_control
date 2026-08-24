import React, { useState, useEffect } from 'react';
import { pumpController, PumpTelemetry, Legato270WebController } from '../services/webSerialPump';
import { Usb, Unplug, RefreshCw, AlertCircle, ExternalLink, Terminal } from 'lucide-react';

interface HeaderProps {
  onToggleTerminal?: () => void;
  showTerminal?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleTerminal, showTerminal }) => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedBaud, setSelectedBaud] = useState<number>(115200);
  const [isIframe, setIsIframe] = useState<boolean>(false);

  useEffect(() => {
    setIsIframe(Legato270WebController.isInsideIframe());
    const unsub = pumpController.subscribeTelemetry((t) => {
      setTelemetry(t);
      if (t.baudRate) setSelectedBaud(t.baudRate);
    });
    return unsub;
  }, []);

  const handleConnectToggle = async () => {
    if (telemetry.isRealHardware) {
      await pumpController.disconnectUSB();
    } else {
      setIsConnecting(true);
      await pumpController.connectUSB(selectedBaud);
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await pumpController.queryAllPumpParameters();
    setTimeout(() => setIsSyncing(false), 500);
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  // Status flag: Idle / Running / Error
  const renderStatusFlag = () => {
    if (telemetry.statusCategory === 'Running') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 font-semibold text-xs animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>Status: Running ({telemetry.statusText})</span>
        </div>
      );
    }

    if (telemetry.statusCategory === 'Error') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 font-semibold text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>Status: Error ({telemetry.statusText || 'Alarm/Stall'})</span>
        </div>
      );
    }

    // Default: Idle
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        <span>Status: Idle</span>
      </div>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Title */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              KDS
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                KD Scientific Legato 270 Controller
              </h1>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {telemetry.isRealHardware
                  ? `USB Hardware Connected (${telemetry.baudRate} Baud)`
                  : 'Virtual Laboratory Simulator Mode'}
              </p>
            </div>
          </div>
        </div>

        {/* Title Line Actions: Status Flag + Baud select + Connect USB + Sync from pump */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          
          {/* Iframe New Tab Shortcut */}
          {isIframe && (
            <button
              id="header-open-tab-btn"
              onClick={handleOpenNewTab}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-lg border border-amber-300 transition-colors shadow-2xs cursor-pointer"
              title="Open in standalone browser tab to bypass iframe Web Serial restrictions"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
              <span>New Tab</span>
            </button>
          )}

          {/* Status Flag (Idle / Running / Error) */}
          {renderStatusFlag()}

          {/* Terminal / Diagnostics Inspector Toggle */}
          {onToggleTerminal && (
            <button
              id="toggle-terminal-btn"
              onClick={onToggleTerminal}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                showTerminal
                  ? 'bg-slate-800 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Toggle Live Serial Communication Terminal & Inspector"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{showTerminal ? 'Hide Terminal' : 'Serial Terminal'}</span>
            </button>
          )}

          {/* Sync from pump Button */}
          <button
            id="sync-from-pump-btn"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
            title="Query current position, diameter, flow rates, and volume registers from pump"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          {/* Baud Rate Selector (before connecting) */}
          {!telemetry.isRealHardware && (
            <select
              value={selectedBaud}
              onChange={(e) => setSelectedBaud(parseInt(e.target.value, 10))}
              className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Target Baud Rate"
            >
              <option value={115200}>115200 Baud (Default)</option>
              <option value={57600}>57600 Baud</option>
              <option value={38400}>38400 Baud</option>
              <option value={19200}>19200 Baud</option>
              <option value={9600}>9600 Baud</option>
            </select>
          )}

          {/* Dynamic Connect / Disconnect USB Button */}
          <button
            id="connect-usb-btn"
            onClick={handleConnectToggle}
            disabled={isConnecting}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
              telemetry.isRealHardware
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
            } disabled:opacity-50`}
            title={
              telemetry.isRealHardware
                ? 'Click to disconnect USB serial connection from physical pump'
                : 'Connect to physical KD Scientific Legato pump via USB Serial (Chrome/Edge)'
            }
          >
            {isConnecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : telemetry.isRealHardware ? (
              <Unplug className="w-3.5 h-3.5" />
            ) : (
              <Usb className="w-3.5 h-3.5" />
            )}
            <span>
              {isConnecting
                ? 'Connecting...'
                : telemetry.isRealHardware
                ? 'Disconnect USB'
                : 'Connect USB'}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
