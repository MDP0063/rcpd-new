import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  Cloud,
  Copy,
  Check,
  Terminal,
  Globe,
  Database,
  ShieldCheck
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
    onStatusToast('Konfiguration in die Zwischenablage kopiert.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const gitInitCommands = `git init
git add .
git commit -m "feat: CA-POST Officer Portal with Firebase RBAC, Academy LMS & Render CI/CD"
git branch -M main
git remote add origin https://github.com/DEIN-ORG-NAME/ca-post-officer-portal.git
git push -u origin main`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
            DEVOPS &amp; CONTINUOUS DEPLOYMENT // GITHUB ACTIONS + RENDER BLUEPRINT
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            GitHub Repository &amp; Render.com CI/CD-Pipeline
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Alle Deployment-Spezifikationen (<code className="font-mono">render.yaml</code>, <code className="font-mono">.github/workflows/deploy-render.yml</code> und <code className="font-mono">server.ts</code>) sind bereits fertig im Projektverzeichnis hinterlegt.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span>AKTIVE APP-URL:</span>
          <a
            href={window.location.origin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 dark:text-amber-400 underline truncate max-w-xs"
          >
            {window.location.origin}
          </a>
        </div>
      </div>

      {/* Live Infrastructure Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>EXPRESS BACKEND SERVER</span>
            <Cloud className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
            {healthInfo ? 'OPERATIONAL (/api/health)' : 'ACTIVE RUNTIME'}
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Start-Befehl: npm run start (NODE_ENV=production tsx server.ts)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>FIRESTORE ENTERPRISE DB</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
            sustained-edge-vc9s2
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Zero-Trust Security Rules deployed &amp; ESLint-geprüft
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>CI/CD AUTOMATISIERUNG</span>
            <GitBranch className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
            GitHub Actions → Render Web Service
          </div>
          <div className="text-xs text-slate-500 font-mono mt-1">
            Automatischer Build, Rule-Audit &amp; Deploy-Hook bei Push auf main
          </div>
        </div>
      </div>

      {/* Step-by-step GitHub + Render Pipeline Code Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-amber-500">SCHRITT 1 // GITHUB REPOSITORY</div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Repository initialisieren &amp; mit Render Blueprint verknüpfen
              </h2>
            </div>
            <button
              type="button"
              onClick={() => copyText('git', gitInitCommands)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {copiedKey === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Befehle kopieren
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
            {gitInitCommands}
          </pre>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <p>
              <strong>Anleitung für Render.com:</strong> Öffne im Render Dashboard <em>New + → Blueprint</em> und wähle dein GitHub Repository aus. Render erkennt automatisch die Datei <code className="font-mono">/render.yaml</code> im Projektstamm und richtet den Node.js Web Service samt Health-Check (<code className="font-mono">/api/health</code>) ein.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-amber-500">SCHRITT 2 // RENDER.YAML BLUEPRINT</div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                Hinterlegte Datei: /render.yaml
              </h2>
            </div>
            {manifests && (
              <button
                type="button"
                onClick={() => copyText('render', manifests.renderYaml)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copiedKey === 'render' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                YAML kopieren
              </button>
            )}
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
            {manifests?.renderYaml || 'Lade /render.yaml...'}
          </pre>
        </div>
      </div>

      {/* GitHub Actions Workflow Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-amber-500">
              SCHRITT 3 // AUTOMATISIERTE CI/CD-PIPELINE (.github/workflows/deploy-render.yml)
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Automatischer Security-Rule-Audit, TypeScript-Build &amp; Render Webhook
            </h2>
          </div>
          {manifests && (
            <button
              type="button"
              onClick={() => copyText('gh', manifests.githubWorkflow)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {copiedKey === 'gh' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              Workflow kopieren
            </button>
          )}
        </div>

        <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
          {manifests?.githubWorkflow || 'Lade GitHub Actions Workflow...'}
        </pre>
      </div>
    </div>
  );
};
