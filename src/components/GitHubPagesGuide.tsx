import React, { useState } from 'react';
import {
  Github,
  Globe,
  Check,
  Copy,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Usb,
  Sparkles,
  FileCode,
  FolderGit2,
  AlertCircle
} from 'lucide-react';

export const GitHubPagesGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const githubActionsYaml = `name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm install

      - name: Build production applet
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const codespacesSetup = `# Open directly in GitHub Codespaces
# 1. Click "<> Code" -> "Codespaces" -> "Create codespace on main"
# 2. Run inside the Codespace terminal:
npm install
npm run dev

# 3. For Web Serial USB forwarding in Codespaces:
# Ensure you open the forwarded port (3000) directly in Google Chrome / Edge on your local machine.
`;

  return (
    <div id="github-pages-guide-tab" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-slate-900 text-white rounded-lg">
                <Github className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">GitHub Pages &amp; GitHub Spaces Deployment Guide</h2>
            </div>
            <p className="text-xs text-slate-600">
              Configured for your repository: <a href="https://github.com/giancarlopascali-hub/Legato270_control" target="_blank" rel="noreferrer" className="text-blue-700 font-mono font-semibold hover:underline">giancarlopascali-hub/Legato270_control</a>. When exported, your live web controller will be accessible at <a href="https://giancarlopascali-hub.github.io/Legato270_control/" target="_blank" rel="noreferrer" className="text-emerald-700 font-mono font-semibold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 hover:underline">https://giancarlopascali-hub.github.io/Legato270_control/</a>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>100% Client-Side / HTTPS Ready</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Step-by-Step Deployment Steps */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-600" />
              <span>Option A: Automated GitHub Pages Deployment (Recommended)</span>
            </h3>

            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-900">Export or Push to your Repository:</strong>
                  <p className="text-slate-600 mt-0.5">
                    Click <strong>Export &rarr; GitHub</strong> in AI Studio (or push via git remote) to <code className="font-mono text-blue-700 font-semibold bg-blue-50 px-1 py-0.5 rounded">giancarlopascali-hub/Legato270_control</code> on branch <code className="font-mono text-slate-800">main</code>.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">Pre-Configured GitHub Actions Workflow:</strong>
                  <p className="text-slate-600 mt-0.5">
                    The workflow is already created in <code className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded">.github/workflows/deploy.yml</code> and will automatically trigger on push.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-900">Enable GitHub Pages in Repo Settings:</strong>
                  <p className="text-slate-600 mt-0.5">
                    In your repository, go to <strong>Settings &rarr; Pages</strong>. Under <strong>Build and deployment &gt; Source</strong>, choose <strong>GitHub Actions</strong>.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-slate-900">Access your Live Controller App:</strong>
                  <p className="text-slate-600 mt-0.5">
                    GitHub will deploy your live controller at <a href="https://giancarlopascali-hub.github.io/Legato270_control/" target="_blank" rel="noreferrer" className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded hover:underline">https://giancarlopascali-hub.github.io/Legato270_control/</a>.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Option B: GitHub Codespaces */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Option B: GitHub Codespaces (Browser Cloud IDE)</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you want to edit and test the code from any machine (tablet, Chromebook, Mac) without installing Node.js locally:
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 space-y-1">
              <div># 1. On your GitHub repo page, click:</div>
              <div className="text-blue-700 font-bold">&lt;&gt; Code &rarr; Codespaces &rarr; Create codespace on main</div>
              <div className="pt-2"># 2. In the Codespace terminal:</div>
              <div className="text-emerald-700 font-bold">npm install &amp;&amp; npm run dev</div>
            </div>
          </div>

          {/* Browser & OS Compatibility Note */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Usb className="w-4 h-4 text-amber-700" />
              <span>Web Serial API Browser Compatibility</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
              <li><strong>Google Chrome</strong> (v89+ on Windows, macOS, Linux, ChromeOS)</li>
              <li><strong>Microsoft Edge</strong> (v89+ on Windows, macOS, Linux)</li>
              <li><strong>Opera / Brave</strong> (Chromium-based engines)</li>
              <li><strong>Linux Permission Tip:</strong> Add your user to the <code className="font-mono font-bold">dialout</code> group (<code className="font-mono">sudo usermod -a -G dialout $USER</code>) so Chrome can access <code className="font-mono">/dev/ttyUSB0</code> without root.</li>
            </ul>
          </div>

        </div>

        {/* Right Column: Copyable .github/workflows/deploy.yml */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-mono font-bold text-slate-800">.github/workflows/deploy.yml</span>
              </div>

              <button
                id="copy-github-actions-yaml-btn"
                onClick={() => copyCode(githubActionsYaml, 'yaml')}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedSection === 'yaml' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy YAML</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-[11px] text-slate-200 h-[460px] overflow-y-auto select-text leading-relaxed">
              <pre>{githubActionsYaml}</pre>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
