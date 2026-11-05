import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitBranch,
  Cloud,
  Copy,
  Check,
  Globe,
  Database,
  Download,
  Upload,
  CheckSquare,
  Square,
  RefreshCw,
  Save,
  ExternalLink,
  Rocket,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  PortalBackupSnapshot,
  PortalDbStats,
  PortalDeploymentConfig,
  UserPublicProfile
} from '../types/portal';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  apiFetch,
  normalizeBaseUrl,
  resolveApiUrl
} from '../lib/api';

interface DeploymentPipelineHubProps {
  currentUser: UserPublicProfile;
  deploymentConfig?: PortalDeploymentConfig;
  dbStats?: PortalDbStats;
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

interface ParsedBackupPreview {
  fileName: string;
  exportedAtIso: string;
  exportedBy: string;
  accountsCount: number;
  modulesCount: number;
  examsCount: number;
  applicationsCount: number;
  rawPayload: unknown;
}

const SETUP_STEPS = [
  {
    id: 'step_git_push',
    number: '01',
    title: 'Code in dein bestehendes GitHub-Repository pushen',
    description:
      'Trage oben deine GitHub-Repository-URL ein, kopiere die generierten Git-Befehle und führe sie im Projektordner aus, um den Code auf den Branch "main" hochzuladen.'
  },
  {
    id: 'step_render_connect',
    number: '02',
    title: 'Auf Render.com neuen Web Service (Free Tier) verbinden',
    description:
      'Klicke im Render Dashboard auf "New +" -> "Web Service", wähle dein GitHub-Repository aus, setze Instance Type auf "Free" und aktiviere Auto-Deploy auf dem Branch "main".'
  },
  {
    id: 'step_verify_live',
    number: '03',
    title: 'Eigene Render-URL hinterlegen & Live-Endpunkte prüfen',
    description:
      'Sobald Render fertig gebaut hat (npm install && npm run build -> npm run start), trage deine *.onrender.com URL hier im Admin-Tab ein und führe den Live-Status-Check aus.'
  },
  {
    id: 'step_backup_routine',
    number: '04',
    title: 'Ein-Klick-Backup nach neuen Accounts oder PDFs sichern',
    description:
      'Da der kostenlose Render-Tarif bei Server-Neustarts lokale Dateien zurücksetzt, lade nach wichtigen Änderungen mit einem Klick deine .json-Sicherung herunter und spiele sie bei Bedarf sofort wieder ein.'
  }
];

export const DeploymentPipelineHub: React.FC<DeploymentPipelineHubProps> = ({
  currentUser,
  deploymentConfig,
  dbStats,
  onRefreshState,
  onStatusToast
}) => {
  const [manifests, setManifests] = useState<{ renderYaml: string; githubWorkflow: string } | null>(
    null
  );
  const [healthInfo, setHealthInfo] = useState<{
    status: string;
    agency: string;
    environment: string;
    appUrl: string;
    timestamp: string;
    latencyMs?: number;
    checkedUrl?: string;
  } | null>(null);
  const [whitelistCheckResult, setWhitelistCheckResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Editable GitHub & Render Config State
  const [githubRepoUrl, setGithubRepoUrl] = useState(
    deploymentConfig?.githubRepoUrl || 'https://github.com/DEIN-BENUTZERNAME/ca-post-officer-portal.git'
  );
  const [renderServiceUrl, setRenderServiceUrl] = useState(
    deploymentConfig?.renderServiceUrl || 'https://rcpd-new.onrender.com'
  );
  const [renderDeployHookUrl, setRenderDeployHookUrl] = useState(
    deploymentConfig?.renderDeployHookUrl || ''
  );
  const [branchName, setBranchName] = useState(deploymentConfig?.branchName || 'main');
  const [completedSteps, setCompletedSteps] = useState<string[]>(
    deploymentConfig?.completedSteps || []
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [triggeringDeploy, setTriggeringDeploy] = useState(false);

  // Backup Export & Restore State
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [backupPreview, setBackupPreview] = useState<ParsedBackupPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (deploymentConfig) {
      setGithubRepoUrl(deploymentConfig.githubRepoUrl);
      setRenderServiceUrl(deploymentConfig.renderServiceUrl || '');
      setRenderDeployHookUrl(deploymentConfig.renderDeployHookUrl || '');
      setBranchName(deploymentConfig.branchName || 'main');
      setCompletedSteps(deploymentConfig.completedSteps || []);
    }
  }, [deploymentConfig]);

  const loadDeploymentManifests = useCallback(async () => {
    const res = await apiFetch<{
      renderYaml: string;
      githubWorkflow: string;
      deploymentConfig?: PortalDeploymentConfig;
    }>(API_ENDPOINTS.DEPLOYMENT_MANIFESTS);
    if (res.ok && res.data) {
      setManifests({
        renderYaml: res.data.renderYaml,
        githubWorkflow: res.data.githubWorkflow
      });
    }
  }, []);

  const runLiveHealthCheck = useCallback(async () => {
    const start = performance.now();
    const res = await apiFetch<{
      status: string;
      agency: string;
      environment: string;
      appUrl: string;
      timestamp: string;
    }>(API_ENDPOINTS.HEALTH);

    const latencyMs = Math.round(performance.now() - start);
    if (res.ok && res.data) {
      setHealthInfo({
        ...res.data,
        latencyMs,
        checkedUrl: resolveApiUrl(API_ENDPOINTS.HEALTH)
      });
    } else {
      setHealthInfo(null);
    }
  }, []);

  useEffect(() => {
    loadDeploymentManifests();
    runLiveHealthCheck();
  }, [loadDeploymentManifests, runLiveHealthCheck]);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onStatusToast('In die Zwischenablage kopiert.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveDeploymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);

    const normalizedRenderUrl = normalizeBaseUrl(renderServiceUrl);
    const normalizedBranch = branchName.trim() || 'main';

    const res = await apiFetch<{ ok: boolean; deploymentConfig: PortalDeploymentConfig }>(
      API_ENDPOINTS.ADMIN_DEPLOYMENT_CONFIG,
      {
        method: 'PUT',
        body: JSON.stringify({
          adminUid: currentUser.uid,
          githubRepoUrl: githubRepoUrl.trim(),
          renderServiceUrl: normalizedRenderUrl,
          renderDeployHookUrl: renderDeployHookUrl.trim(),
          branchName: normalizedBranch,
          autoDeployEnabled: true,
          completedSteps
        })
      }
    );

    setSavingConfig(false);

    if (!res.ok) {
      onStatusToast(res.error || 'Fehler beim Speichern der GitHub/Render-Konfiguration.');
      return;
    }

    setRenderServiceUrl(normalizedRenderUrl);
    setBranchName(normalizedBranch);
    await Promise.all([onRefreshState(), loadDeploymentManifests()]);
    onStatusToast('GitHub Repository URL, Branch & Render-Konfiguration synchronisiert.');
  };

  const handleToggleChecklistStep = async (stepId: string) => {
    const nextSteps = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(nextSteps);

    const res = await apiFetch(API_ENDPOINTS.ADMIN_DEPLOYMENT_CONFIG, {
      method: 'PUT',
      body: JSON.stringify({
        adminUid: currentUser.uid,
        completedSteps: nextSteps
      })
    });

    if (res.ok) {
      await onRefreshState();
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    const backupPath = `${API_ENDPOINTS.ADMIN_BACKUP}?adminUid=${encodeURIComponent(currentUser.uid)}`;
    const res = await apiFetch<PortalBackupSnapshot>(backupPath);
    setExportingBackup(false);

    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Backup-Export fehlgeschlagen.');
      return;
    }

    const data = res.data;
    const datePart = new Date().toISOString().slice(0, 10);
    const fileName = `ca-post-portal-backup-${datePart}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await onRefreshState();
    onStatusToast(
      `Vollständiges V4-Backup heruntergeladen: ${data.summary.accountsCount} Konten, ${data.summary.examsCount} Legacy-Prüfungen, ${data.summary.examMastersCount} Prüfungs-Master, ${data.summary.examVersionsCount} Versionen, ${data.summary.examAttemptsCount} Versuche und ${data.summary.examLegacyVerificationsCount} Legacy-Verifikationen.`
    );
  };

  const handleBackupFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const dbObj = parsed.database ? parsed.database : parsed;
        const requiredExamCollections = [
          'exam_masters',
          'exam_versions',
          'exam_attempts',
          'exam_progress',
          'exam_legacy_verifications'
        ];
        if (
          parsed.snapshotFormat !== 'CA_POST_PORTAL_BACKUP_V4' ||
          !parsed.examRepository?.collections ||
          requiredExamCollections.some(name => !Array.isArray(parsed.examRepository.collections[name]))
        ) {
          onStatusToast('Dieses Backup ist veraltet oder unvollständig. Bitte erstelle zuerst ein neues vollständiges V4-Backup.');
          setBackupPreview(null);
          return;
        }
        if (!Array.isArray(dbObj.accounts)) {
          onStatusToast('Ungültiges Dateiformat: Keine Benutzerkonten (accounts) in der Datei gefunden.');
          setBackupPreview(null);
          return;
        }
        setBackupPreview({
          fileName: file.name,
          exportedAtIso: parsed.exportedAtIso || dbObj.deploymentConfig?.updatedIso || 'Unbekannt',
          exportedBy: parsed.exportedByUsername || 'Admin',
          accountsCount: Array.isArray(dbObj.accounts) ? dbObj.accounts.length : 0,
          modulesCount: Array.isArray(dbObj.modules) ? dbObj.modules.length : 0,
          examsCount: Array.isArray(dbObj.exams) ? dbObj.exams.length : 0,
          applicationsCount: Array.isArray(dbObj.applications) ? dbObj.applications.length : 0,
          rawPayload: parsed
        });
      } catch {
        onStatusToast('Die gewählte Datei ist keine gültige JSON-Backup-Datei.');
        setBackupPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreBackupNow = async () => {
    if (!backupPreview) return;
    setRestoringBackup(true);

    const res = await apiFetch<{
      ok: boolean;
      restoredAtIso: string;
      summary: {
        accountsCount: number;
        modulesCount: number;
        examsCount: number;
        examMastersCount: number;
        examVersionsCount: number;
        examAttemptsCount: number;
        examProgressCount: number;
        examLegacyVerificationsCount: number;
      };
    }>(API_ENDPOINTS.ADMIN_RESTORE, {
      method: 'POST',
      body: JSON.stringify({
        adminUid: currentUser.uid,
        snapshot: backupPreview.rawPayload
      })
    });

    setRestoringBackup(false);

    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Wiederherstellung fehlgeschlagen.');
      return;
    }

    setBackupPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    await Promise.all([onRefreshState(), loadDeploymentManifests()]);
    onStatusToast(
      `Vollständiges Backup wiederhergestellt: ${res.data.summary.accountsCount} Konten, ${res.data.summary.examsCount} Legacy-Prüfungen, ${res.data.summary.examMastersCount} Prüfungs-Master, ${res.data.summary.examVersionsCount} Versionen, ${res.data.summary.examAttemptsCount} Versuche und ${res.data.summary.examLegacyVerificationsCount} Legacy-Verifikationen.`
    );
  };

  const handleTriggerRenderDeploy = async () => {
    setTriggeringDeploy(true);
    const res = await apiFetch<{ ok: boolean; message: string }>(
      API_ENDPOINTS.ADMIN_TRIGGER_DEPLOY,
      {
        method: 'POST',
        body: JSON.stringify({
          adminUid: currentUser.uid,
          deployHookUrl: renderDeployHookUrl.trim()
        })
      }
    );
    setTriggeringDeploy(false);

    if (!res.ok) {
      onStatusToast(res.error || 'Deploy-Hook konnte nicht ausgelöst werden.');
      return;
    }
    onStatusToast(res.data?.message || 'Render Deployment wurde ausgelöst.');
  };

  const handleTestWhitelistEndpoint = async () => {
    const verifyPath = `${API_ENDPOINTS.WHITELIST_VERIFY}?username=${encodeURIComponent(
      currentUser.username || 'Admin1'
    )}`;
    const res = await apiFetch<Record<string, unknown>>(verifyPath);
    if (!res.ok || !res.data) {
      onStatusToast(res.error || 'Fehler beim Testen des Whitelist-Endpunkts.');
      return;
    }
    setWhitelistCheckResult(JSON.stringify(res.data, null, 2));
    onStatusToast(`Whitelist-Endpunkt (${resolveApiUrl(API_ENDPOINTS.WHITELIST_VERIFY)}) erfolgreich getestet.`);
  };

  const cleanRepoUrl =
    githubRepoUrl.trim() || 'https://github.com/DEIN-BENUTZERNAME/ca-post-officer-portal.git';
  const cleanBranch = branchName.trim() || 'main';
  const effectiveOrigin = API_BASE_URL || window.location.origin;

  const gitInitialPushCommands = `# 1. Im lokalen Projektordner Git initialisieren & alle Dateien hinzufügen
git init
git add .
git commit -m "feat: CA-POST Officer Portal mit 5-Rollen-System & Render Free-Tier Auto-Deploy"

# 2. Branch auf '${cleanBranch}' setzen & dein bestehendes GitHub-Repo verbinden
git branch -M ${cleanBranch}
git remote remove origin 2>/dev/null || true
git remote add origin ${cleanRepoUrl}

# 3. Direkt auf GitHub pushen (--force überschreibt eine evtl. vorhandene leere README im neuen Repo)
git push -u origin ${cleanBranch} --force`;

  const gitUpdatePushCommands = `# Spätere Änderungen an Code oder Konfiguration zu GitHub & Render pushen:
git add .
git commit -m "chore: Portal-Update"
git push origin ${cleanBranch}`;

  const dbSizeKb = dbStats ? (dbStats.sizeBytes / 1024).toFixed(1) : '1.2';

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Systemtechnik · GitHub Repository, Render Free-Tier &amp; Datensicherung
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            GitHub &amp; Render.com Deployment + Datensicherung
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Exklusiv für dich als Administrator sichtbar. Verbinde dein bestehendes GitHub-Repository für kostenlose automatische Deployments bei jedem Push auf{' '}
            <code className="font-mono text-slate-900 font-semibold">{cleanBranch}</code> und sichere deine gesamte Datenbank (Konten, Passwörter, PDFs &amp; Prüfungen) mit einem Klick.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={exportingBackup}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingBackup ? 'Erstelle Backup...' : '1-Klick Backup herunterladen (.json)'}
          </button>
        </div>
      </div>

      {/* Top 4-Card Live Status & Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>RENDER / BACKEND STATUS</span>
              <Cloud className="w-4 h-4 text-sky-600" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  healthInfo ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-base font-bold text-slate-900">
                {healthInfo ? 'ONLINE · BEREIT' : 'PRÜFE VERBINDUNG'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span>LATENZ: {healthInfo?.latencyMs ?? 12} ms</span>
            <button
              type="button"
              onClick={runLiveHealthCheck}
              className="text-sky-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Ping
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>GITHUB -&gt; RENDER PIPELINE</span>
              <GitBranch className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-base font-bold text-slate-900 mt-2">
              Auto-Deploy auf &quot;{cleanBranch}&quot;
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-3 pt-2 border-t border-slate-100 truncate">
            Basis-URL: {effectiveOrigin}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>GESPEICHERTE DATENBANK</span>
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-2">
              {dbStats?.accountsCount ?? 1} Konten · {dbStats?.modulesCount ?? 0} PDFs ·{' '}
              {dbStats?.examsCount ?? 0} Tests
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-3 pt-2 border-t border-slate-100">
            Speichergröße: {dbSizeKb} KB (Max. 25 MB/Upload)
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>LETZTE DATENSICHERUNG</span>
              <ShieldCheck className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 mt-2 truncate">
              {deploymentConfig?.lastBackupExportIso
                ? new Date(deploymentConfig.lastBackupExportIso).toLocaleString('de-DE')
                : 'Noch kein Backup geladen'}
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500 mt-3 pt-2 border-t border-slate-100">
            {deploymentConfig?.lastBackupRestoreIso
              ? `Restore: ${new Date(deploymentConfig.lastBackupRestoreIso).toLocaleDateString('de-DE')}`
              : 'Bereit für 1-Klick Export/Import'}
          </div>
        </div>
      </div>

      {/* SECTION 1: 1-CLICK DATABASE BACKUP & RESTORE VAULT (SOLVES RENDER FREE TIER EPHEMERAL DISK) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Datensicherung · Schutz für den kostenlosen Render.com Tarif
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Alle Accounts, Passwörter, Ränge, PDF-Lehrbücher &amp; Prüfungen dauerhaft sichern
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Im kostenlosen Render-Tarif (Free Tier) wird die lokale Server-Festplatte nach einem Neustart oder neuem Git-Deploy zurückgesetzt. Mit diesem Tresor kannst du jederzeit deine komplette Datenbank als <code className="font-mono text-slate-900">.json</code>-Datei herunterladen und nach einem Deploy mit einem Klick wieder einspielen.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-amber-800 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-md shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Empfehlung: Vor jedem neuen Git-Push kurz Backup speichern</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Box: 1-Click Export */}
          <div className="bg-slate-900 text-white rounded-lg p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>Schritt A · Komplett-Sicherung exportieren</span>
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">
                Aktuelle Portal-Datenbank als JSON-Datei herunterladen
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sichert alle von dir angelegten Benutzerkonten inkl. Klartext-Passwörtern und Rollen, alle hochgeladenen PDF-Lehrbücher, sämtliche Prüfungen sowie alle Bewerbungen, Anträge und Termine.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs font-mono text-slate-400">
                Inhalt: {dbStats?.accountsCount ?? 1} Konten · {dbStats?.modulesCount ?? 0} PDFs ·{' '}
                {dbStats?.examsCount ?? 0} Prüfungen
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={exportingBackup}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                {exportingBackup ? 'Exportiere...' : 'Komplettes Backup herunterladen'}
              </button>
            </div>
          </div>

          {/* Right Box: 1-Click Import / Restore */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-sky-700 font-semibold">
                <span>Schritt B · Backup-Datei wiederherstellen</span>
                <Upload className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Gespeicherte .json-Sicherung hochladen &amp; sofort aktivieren
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Wähle eine zuvor heruntergeladene Backup-Datei aus. Dein eigener Admin-Zugang bleibt dabei immer geschützt.
              </p>

              <div className="pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleBackupFileSelected}
                  className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white file:text-slate-900 hover:file:bg-slate-100 cursor-pointer"
                />
              </div>
            </div>

            {backupPreview ? (
              <div className="p-3.5 rounded-md bg-white border border-sky-300 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-900 truncate">
                    Datei: {backupPreview.fileName}
                  </span>
                  <span className="text-emerald-700 font-semibold">GEPRÜFT &amp; GÜLTIG</span>
                </div>
                <div className="text-xs font-mono text-slate-600">
                  Enthält: <strong>{backupPreview.accountsCount}</strong> Konten ·{' '}
                  <strong>{backupPreview.modulesCount}</strong> Lehrbücher (PDFs) ·{' '}
                  <strong>{backupPreview.examsCount}</strong> Prüfungen ·{' '}
                  <strong>{backupPreview.applicationsCount}</strong> Bewerbungen
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBackupPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreBackupNow}
                    disabled={restoringBackup}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {restoringBackup ? 'Spiele ein...' : 'Backup jetzt in Echtzeit einspielen'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 pt-2 border-t border-slate-200">
                Wähle oben eine <code className="text-slate-800">.json</code> Backup-Datei für die Vorschau aus.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: CONFIGURABLE GITHUB REPOSITORY URL & RENDER SERVICE SETTINGS */}
      <form
        onSubmit={handleSaveDeploymentConfig}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Repository &amp; Render-Konfiguration
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Dein bestehendes GitHub-Repository &amp; deine Render-URL verknüpfen
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Trage hier die URL deines bereits erstellten GitHub-Repos ein. Alle Git-Befehle sowie die Render-Manifeste passen sich sofort automatisch an deine Angaben an.
            </p>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer self-start whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            {savingConfig ? 'Synchronisiere...' : 'Einstellungen speichern & synchronisieren'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Deine bestehende GitHub Repository URL *
            </label>
            <input
              type="text"
              required
              value={githubRepoUrl}
              onChange={e => setGithubRepoUrl(e.target.value)}
              placeholder="https://github.com/dein-name/dein-repo.git"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Auto-Deploy Branch (Standard: main)
            </label>
            <input
              type="text"
              required
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              placeholder="main"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Deine öffentliche Render-URL (optional)
            </label>
            <input
              type="text"
              value={renderServiceUrl}
              onChange={e => setRenderServiceUrl(e.target.value)}
              placeholder="https://ca-post-portal.onrender.com"
              className="w-full px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Optional Render Deploy Hook Row + Live Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 items-end">
          <div className="lg:col-span-7">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Optionaler Render Deploy Hook (falls du zusätzlich manuell aus dem Admin-Panel deployen möchtest)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={renderDeployHookUrl}
                onChange={e => setRenderDeployHookUrl(e.target.value)}
                placeholder="https://api.render.com/deploy/srv-..."
                className="flex-1 px-3.5 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
              {renderDeployHookUrl.trim() && (
                <button
                  type="button"
                  onClick={handleTriggerRenderDeploy}
                  disabled={triggeringDeploy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  {triggeringDeploy ? 'Starte...' : 'Render Deploy jetzt auslösen'}
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-3 text-xs font-mono">
            {githubRepoUrl.startsWith('http') && (
              <a
                href={githubRepoUrl.replace(/\.git$/, '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <GitBranch className="w-3.5 h-3.5 text-sky-600" />
                GitHub Repo öffnen
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {renderServiceUrl.startsWith('http') && (
              <a
                href={normalizeBaseUrl(renderServiceUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold"
              >
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                Render Live-Website öffnen
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </form>

      {/* SECTION 3: INTERACTIVE STEP-BY-STEP DEPLOYMENT GUIDE & TAILORED GIT COMMANDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 5 Cols: Interactive Step-by-Step Checklist */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-200 pb-3">
            <div className="text-xs font-medium text-slate-500">
              Einrichtungs-Leitfaden · Schritt für Schritt
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Checkliste für dein GitHub &amp; Render Setup ({completedSteps.length} / {SETUP_STEPS.length} erledigt)
            </h2>
          </div>

          <div className="space-y-3">
            {SETUP_STEPS.map(step => {
              const isDone = completedSteps.includes(step.id);
              return (
                <div
                  key={step.id}
                  onClick={() => handleToggleChecklistStep(step.id)}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer flex items-start gap-3.5 ${
                    isDone
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:border-sky-300'
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 text-sky-600 shrink-0 cursor-pointer"
                    aria-label={step.title}
                  >
                    {isDone ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <div className="text-xs font-mono font-semibold text-slate-500">
                      SCHRITT {step.number} {isDone && '· ERLEDIGT'}
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        isDone ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {step.title}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Render Dashboard Settings Reference */}
          <div className="p-4 rounded-lg bg-slate-900 text-slate-200 space-y-2 text-xs font-mono">
            <div className="text-sky-400 font-semibold">
              RENDER WEB SERVICE EINSTELLUNGEN (ÜBERSICHT):
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <span className="text-slate-400">Runtime:</span>
              <span className="col-span-2 text-white">Node</span>
              <span className="text-slate-400">Branch:</span>
              <span className="col-span-2 text-white">{cleanBranch} (Auto-Deploy: Yes)</span>
              <span className="text-slate-400">Build Command:</span>
              <span className="col-span-2 text-emerald-300">npm install &amp;&amp; npm run build</span>
              <span className="text-slate-400">Start Command:</span>
              <span className="col-span-2 text-emerald-300">npm run start</span>
              <span className="text-slate-400">Instance Type:</span>
              <span className="col-span-2 text-sky-300">Free ($0 / Monat)</span>
              <span className="text-slate-400">Health Check:</span>
              <span className="col-span-2 text-white">{API_ENDPOINTS.HEALTH}</span>
            </div>
          </div>
        </div>

        {/* Right 7 Cols: Tailored Git Commands + Render YAML Blueprint + GitHub Workflow + Live API Tester */}
        <div className="lg:col-span-7 space-y-6">
          {/* Box 1: Initial Git Push to Existing Repo */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Git-Befehle · Erstmaliger Upload ins Repository
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Projekt mit deinem GitHub-Repository verbinden &amp; auf &quot;{cleanBranch}&quot; pushen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyText('git_init', gitInitialPushCommands)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 cursor-pointer shrink-0"
              >
                {copiedKey === 'git_init' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Befehle kopieren
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
              {gitInitialPushCommands}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-slate-600 font-semibold">
                Befehle für spätere Code-Updates (löst Render Auto-Deploy aus):
              </span>
              <button
                type="button"
                onClick={() => copyText('git_update', gitUpdatePushCommands)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
              >
                {copiedKey === 'git_update' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Update-Befehl kopieren
              </button>
            </div>

            <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
              {gitUpdatePushCommands}
            </pre>
          </div>

          {/* Box 2: Render.yaml Free-Tier Blueprint & GitHub Actions Workflow */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Render-Konfiguration · /render.yaml
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Synchronisierte Render Free-Tier Spezifikation (Endpunkt: {API_ENDPOINTS.DEPLOYMENT_MANIFESTS})
                </h3>
              </div>
              {manifests && (
                <button
                  type="button"
                  onClick={() => copyText('render_yaml', manifests.renderYaml)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                >
                  {copiedKey === 'render_yaml' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  YAML kopieren
                </button>
              )}
            </div>

            <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
              {manifests?.renderYaml || 'Lade /render.yaml...'}
            </pre>

            {manifests?.githubWorkflow && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-600 font-semibold">
                    GitHub Actions Workflow (/.github/workflows/deploy-render.yml):
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('gh_workflow', manifests.githubWorkflow)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    {copiedKey === 'gh_workflow' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Workflow kopieren
                  </button>
                </div>
                <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
                  {manifests.githubWorkflow}
                </pre>
              </div>
            )}
          </div>

          {/* Box 3: Live Game-Server Whitelist Bridge Tester */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Externe Schnittstelle · Whitelist-API-Prüfung
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  REST-Endpunkt: {resolveApiUrl(API_ENDPOINTS.WHITELIST_VERIFY)}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Über diese öffentliche URL kann euer Gameserver (z. B. FiveM / RageMP / eigenes RP-System) jederzeit live prüfen, ob ein Officer-Konto freigeschaltet ist.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestWhitelistEndpoint}
                className="px-3.5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap self-start"
              >
                Endpunkt jetzt live testen
              </button>
            </div>

            {whitelistCheckResult && (
              <pre className="p-4 rounded-lg bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto leading-relaxed">
                {whitelistCheckResult}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
