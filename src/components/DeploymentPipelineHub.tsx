import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  Cloud,
  Copy,
  Check,
  Globe,
  Database
} from 'lucide-react';

interface DeploymentPipelineHubProps {
  onStatusToast: (msg: string) => void;
}

export const DeploymentPipelineHub: React.FC<DeploymentPipelineHubProps> = ({ onStatusToast }) => {
  const [manifests, setManifests] = useState<{ renderYaml: string; githubWorkflow: string } | null>(null);
  const [healthInfo, setHealthInfo] = useState<{
    status: string;
    agency: string;
    environment: string;
    appUrl: string;
    timestamp: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/deployment/manifests')
      .then(r => r.json())
      .then(data => setManifests(data))
      .catch(() => null);

    fetch('/api/health')
      .then(r => r.json())
      .then(data => setHealthInfo(data))
      .catch(() => null);
  }, []);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onStatusToast('In die Zwischenablage kopiert.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const gitInitCommands = `git init
git add .
git commit -m "feat: CA-POST Officer Portal with 5-Role Hierarchy & Render CI/CD"
git branch -M main
git remote add origin https://github.com/DEIN-ORG-NAME/ca-post-officer-portal.git
git push -u origin main`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono text-sky-600 font-semibold">
            ADMIN SYSTEMTECHNIK // GITHUB REPOSITORY &amp; RENDER CI/CD PIPELINE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            GitHub Repository &amp; Render.com Deployment (Nur für Admin sichtbar)
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Dieser technische Infrastruktur-Bereich ist für Colonel, Officer, Rookie und Trainee komplett ausgeblendet.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <Globe className="w-4 h-4 text-sky-600" />
          <span>URL:</span>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline truncate max-w-xs"
          >
            {window.location.origin}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>EXPRESS BACKEND SERVER</span>
            <Cloud className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-2">
            {healthInfo ? 'OPERATIONAL (/api/health)' : 'ACTIVE RUNTIME'}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Start: npm run start (NODE_ENV=production tsx server.ts)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>DATENBANK &amp; LIVE-STATUS</span>
            <Database className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-2">
            Echtzeit Account- &amp; PDF-Persistenz
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Inklusive Live Online/Offline Heartbeat
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>CI/CD PIPELINE</span>
            <GitBranch className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-base font-bold text-slate-900 mt-2">
            GitHub Actions → Render Web Service
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            render.yaml &amp; deploy-render.yml bereit
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-sky-600 font-semibold">SCHRITT 1 // GITHUB REPOSITORY</div>
              <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                Repository initialisieren &amp; pushen
              </h2>
            </div>
            <button
              type="button"
              onClick={() => copyText('git', gitInitCommands)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
            >
              {copiedKey === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              Kopieren
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
            {gitInitCommands}
          </pre>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-sky-600 font-semibold">SCHRITT 2 // RENDER.YAML BLUEPRINT</div>
              <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                Hinterlegte Datei: /render.yaml
              </h2>
            </div>
            {manifests && (
              <button
                type="button"
                onClick={() => copyText('render', manifests.renderYaml)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
              >
                {copiedKey === 'render' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                YAML kopieren
              </button>
            )}
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
            {manifests?.renderYaml || 'Lade /render.yaml...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
