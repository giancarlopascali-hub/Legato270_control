import React, { useState, useEffect } from 'react';
import { pumpController, PumpTelemetry } from '../services/webSerialPump';
import { Usb, RefreshCw, Activity, CheckCircle, AlertCircle, AlertTriangle, Play, Square } from 'lucide-react';

export const Header: React.FC = () => {
  const [telemetry, setTelemetry] = useState<PumpTelemetry>(pumpController.state);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = pumpController.subscribeTelemetry((t) => setTelemetry(t));
    return unsub;
  }, []);

  const handleConnectToggle = async () => {
    if (telemetry.isRealHardware) {
      await pumpController.disconnectUSB();
    } else {
      setIsConnecting(true);
      await pumpController.connectUSB(telemetry.baudRate || 115200);
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await pumpController.queryAllPumpParameters();
    setTimeout(() => setIsSyncing(false), 500);
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
                {telemetry.isRealHardware ? 'Hardware USB Connected (Web Serial)' : 'Virtual Laboratory Simulator Mode'}
              </p>
            </div>
          </div>
        </div>

        {/* Title Line Actions: Status Flag + Connect USB + Sync from pump */}
        <div className="flex items-center gap-2.5 flex-wrap justify-end w-full sm:w-auto">
          
          {/* Status Flag (Idle / Running / Error) */}
          {renderStatusFlag()}

          {/* Sync from pump Button */}
          <button
            id="sync-from-pump-btn"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
            title="Query current position, diameter, flow rates, and volume registers from pump"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync from pump</span>
          </button>

          {/* Connect USB Button */}
          <button
            id="connect-usb-btn"
            onClick={handleConnectToggle}
            disabled={isConnecting}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              telemetry.isRealHardware
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>
              {isConnecting
                ? 'Connecting...'
                : telemetry.isRealHardware
                ? 'USB Connected'
                : 'Connect USB'}
            </span>
          </button>

        </div>

      </div>
    </header>
  );
};
