import React from 'react';
import { Activity, ArrowLeftRight, CheckCircle2, Droplet, Layers, RefreshCw, ShieldAlert, Sparkles, Workflow, ArrowRight, ArrowLeft } from 'lucide-react';

export const ContinuousGuide: React.FC = () => {
  return (
    <div id="continuous-guide-tab" className="space-y-6">
      
      {/* Intro Hero Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Workflow className="w-3.5 h-3.5" />
            <span>Continuous Push / Pull Fluidics Principle</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            How the Legato 270 Delivers 24/7 Unbroken Continuous Flow
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            The <strong>KD Scientific Legato 270</strong> features an opposed dual-syringe rack mounted to a single bi-directional drive carriage. By combining two syringes with 4 one-way check valves (or automated 3-way switching valves), fluid delivery to your downstream system is never interrupted by syringe refill cycles.
          </p>
        </div>
      </div>

      {/* Visual Diagram of Push-Pull Alternation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Phase 1: Forward Stroke */}
        <div className="bg-white border border-emerald-200 rounded-xl p-6 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold rounded-bl-lg border-b border-l border-emerald-200">
            PHASE 1: FORWARD STROKE (<code>irun</code>)
          </div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Carriage Moves Right (&rarr;)</h3>
              <p className="text-xs text-slate-500">Infuse Side A &amp; Refill Side B</p>
            </div>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2.5">
              <Droplet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Syringe Group A (Infusing):</span>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Plunger is pushed forward. Outlet check valve opens; fluid is pumped directly into your reactor / downstream apparatus at the target flow rate.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Syringe Group B (Withdrawing / Refilling):</span>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Plunger is pulled backward simultaneously. Inlet check valve opens; fresh fluid is sucked from the bulk fluid reservoir.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2: Reverse Stroke */}
        <div className="bg-white border border-sky-200 rounded-xl p-6 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 px-3 py-1 bg-sky-100 text-sky-800 font-mono text-[11px] font-bold rounded-bl-lg border-b border-l border-sky-200">
            PHASE 2: REVERSE STROKE (<code>wrun</code>)
          </div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Carriage Moves Left (&larr;)</h3>
              <p className="text-xs text-slate-500">Infuse Side B &amp; Refill Side A</p>
            </div>
          </div>

          <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-start gap-2.5">
              <Droplet className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Syringe Group B (Infusing):</span>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Now full of fluid from Phase 1. Carriage reverses, pushing plunger B forward. Outlet check valve B opens; continuous delivery continues without interruption.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Syringe Group A (Withdrawing / Refilling):</span>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Plunger A is pulled backward. Inlet check valve A opens; Syringe A refills completely for the next cycle.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Hydraulic Plumbing & Manifold Schematic */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>4-Valve Continuous Fluidics Manifold Architecture</span>
        </h3>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 space-y-3">
          <div className="text-center font-bold text-blue-700 pb-1">
            [ BULK LIQUID SUPPLY RESERVOIR ]
          </div>
          <div className="flex justify-around text-center text-slate-500 text-[11px]">
            <div>&darr; Inlet Line A</div>
            <div>&darr; Inlet Line B</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-emerald-700 block">Check Valve A1 (Inlet)</strong>
              <span className="text-[10px] text-slate-500">Opens ONLY during Refill</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-sky-700 block">Check Valve B1 (Inlet)</strong>
              <span className="text-[10px] text-slate-500">Opens ONLY during Refill</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <strong className="text-emerald-900 block font-bold">[ SYRINGE A ]</strong>
              <span className="text-[10px] text-emerald-700">Forward Side</span>
            </div>
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
              <strong className="text-sky-900 block font-bold">[ SYRINGE B ]</strong>
              <span className="text-[10px] text-sky-700">Reverse Side</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-emerald-700 block">Check Valve A2 (Outlet)</strong>
              <span className="text-[10px] text-slate-500">Opens ONLY during Infuse</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <strong className="text-sky-700 block">Check Valve B2 (Outlet)</strong>
              <span className="text-[10px] text-slate-500">Opens ONLY during Infuse</span>
            </div>
          </div>

          <div className="flex justify-around text-center text-slate-500 text-[11px]">
            <div>&darr; Combined Manifold</div>
            <div>&darr; Combined Manifold</div>
          </div>
          <div className="text-center font-bold text-emerald-800 pt-1">
            [ OUTLET TO TARGET SYSTEM / REACTOR / COLUMN ]
          </div>
        </div>
      </div>

    </div>
  );
};
