import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Trash2,
  ArrowRight,
  ArrowLeft,
  X,
  ClipboardCheck,
  FileText,
  Send
} from 'lucide-react';
import {
  OfficerRole,
  PortalRequestDoc,
  RequestCategory,
  RequestStatus,
  ROLE_HIERARCHY,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface RequestsCenterProps {
  currentUser: UserPublicProfile;
  requests: PortalRequestDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

const REQUEST_CATEGORY_LABELS: Record<RequestCategory, string> = {
  rank_change: 'Antrag auf Rangänderung / Beförderung',
  clearance: 'Antrag auf Sonderfreigabe / Modul-Freigabe',
  award: 'Vorschlag für Auszeichnung / Belobigung',
  transfer: 'Antrag auf Abteilungs- / Divisionswechsel',
  loa: 'Dienstabmeldung / Urlaubsantrag (LOA)'
};

export const RequestsCenter: React.FC<RequestsCenterProps> = ({
  currentUser,
  requests,
  onRefreshState,
  onStatusToast
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isColonel = currentUser.role === 'colonel';
  const canReviewRequests =
    isAdmin ||
    isColonel ||
    Boolean(currentUser.granularPermissions?.canReviewStandardRequests);

  const [statusFilter, setStatusFilter] = useState<'ALL' | RequestStatus>('ALL');

  // Interactive Modal + 3-Step Wizard State
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // New Request Form State
  const [category, setCategory] = useState<RequestCategory>('rank_change');
  const [title, setTitle] = useState('');
  const [requestedRole, setRequestedRole] = useState<OfficerRole>('rookie');
  const [targetDetail, setTargetDetail] = useState('');
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Admin / Reviewer Decision State
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [applyRankChange, setApplyRankChange] = useState(true);

  const filteredRequests = requests.filter(r =>
    statusFilter === 'ALL' ? true : r.status === statusFilter
  );

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const openWizardModal = () => {
    setWizardStep(1);
    setConfirmAccuracy(false);
    setShowNewRequestModal(true);
  };

  const closeWizardModal = () => {
    setShowNewRequestModal(false);
    setWizardStep(1);
  };

  const canProceedStep1 =
    title.trim().length >= 4 &&
    (category === 'rank_change' ? Boolean(requestedRole) : targetDetail.trim().length >= 2);

  const canProceedStep2 = justification.trim().length >= 10;

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep < 3) {
      if (wizardStep === 1 && canProceedStep1) setWizardStep(2);
      else if (wizardStep === 2 && canProceedStep2) setWizardStep(3);
      return;
    }

    if (!confirmAccuracy) {
      onStatusToast('Fehler: Bitte bestätige im Schritt 3 die Richtigkeit deiner Angaben.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch<{ ok: boolean; request: PortalRequestDoc }>(
      API_ENDPOINTS.REQUESTS,
      {
        method: 'POST',
        body: JSON.stringify({
          requesterUid: currentUser.uid,
          category,
          title: title.trim(),
          requestedRole: category === 'rank_change' ? requestedRole : undefined,
          targetDetail:
            category === 'rank_change'
              ? `Zielrang: ${requestedRole.toUpperCase()} (${ROLE_HIERARCHY[requestedRole].defaultRank})`
              : targetDetail.trim(),
          justification: justification.trim(),
          priority
        })
      }
    );

    setSubmitting(false);

    if (!res.ok) {
      onStatusToast(res.error || 'Fehler beim Speichern: Antrag konnte nicht eingereicht werden.');
      return;
    }

    setTitle('');
    setTargetDetail('');
    setJustification('');
    setConfirmAccuracy(false);
    setWizardStep(1);
    setShowNewRequestModal(false);
    await onRefreshState();
    onStatusToast('Antrag erfolgreich an den Admin übermittelt und zur Prüfung eingereiht.');
  };

  const handleDecision = async (reqDoc: PortalRequestDoc, nextStatus: RequestStatus) => {
    const res = await apiFetch(`${API_ENDPOINTS.REQUESTS}/${reqDoc.id}/review`, {
      method: 'PUT',
      body: JSON.stringify({
        reviewerUid: currentUser.uid,
        status: nextStatus,
        reviewerComment: reviewComment,
        applyRankChange
      })
    });

    if (!res.ok) {
      onStatusToast(res.error || 'Fehler: Antragsentscheidung fehlgeschlagen.');
      return;
    }

    setReviewingId(null);
    setReviewComment('');
    await onRefreshState();
    onStatusToast(
      nextStatus === 'approved'
        ? `Antrag "${reqDoc.title}" wurde genehmigt.`
        : `Antrag "${reqDoc.title}" wurde abgelehnt.`
    );
  };

  const handleDeleteRequest = async (reqId: string) => {
    const res = await apiFetch(
      `${API_ENDPOINTS.REQUESTS}/${reqId}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      await onRefreshState();
      onStatusToast('Antrag wurde aus dem System gelöscht.');
    } else {
      onStatusToast(res.error || 'Fehler beim Löschen des Antrags.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Antrags- &amp; Anforderungswesen · Formulare &amp; Statusverfolgung
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Anträge, Rangänderungen, Modul-Freigaben &amp; Auszeichnungen
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            Reiche strukturierte Anträge über den 3-stufigen Formular-Assistenten ein. Sämtliche
            Beförderungsanforderungen, Modul-Freigaben und Sonderanträge werden ohne Zwischenstufen
            direkt an das Admin-Dashboard geleitet.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Transparenter Ablauf:</strong> Jeder Antrag durchläuft drei klar gegliederte
            Schritte (Grunddaten, ausführliche Begründung, Bestätigung) und wird mit farblich
            codierten Status-Chips in Echtzeit verfolgt.
          </p>
        </div>

        <button
          type="button"
          onClick={openWizardModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer self-start whitespace-nowrap shadow-xs"
        >
          <Plus className="w-4 h-4" />
          + Neuen Antrag starten (3-Schritte-Assistent)
        </button>
      </div>

      {/* 3 Status KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              IN BEARBEITUNG / AUSSTEHEND
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {pendingCount}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              Direkt im Admin-Dashboard zur Entscheidung
            </div>
          </div>
          <Clock className="w-7 h-7 text-amber-500 shrink-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              GENEHMIGTE ANTRÄGE
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
              {approvedCount}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              Offiziell bewilligt &amp; im Audit-Log dokumentiert
            </div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs flex items-center justify-between transition-colors">
          <div>
            <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              ABGELEHNTE ANTRÄGE
            </div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
              {rejectedCount}
            </div>
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              Mit Stellungnahme geschlossen
            </div>
          </div>
          <XCircle className="w-7 h-7 text-rose-600 dark:text-rose-400 shrink-0" />
        </div>
      </div>

      {/* ==========================================================================
          INTERACTIVE MODAL WINDOW: 3-STEP FORM WIZARD (SCHRITT 1 -> 2 -> 3)
          ========================================================================== */}
      {showNewRequestModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wizard-modal-title"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8 transition-colors">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-sky-400 font-semibold">
                  FORMULAR-ASSISTENT (WIZARD) · DIREKT-ROUTING AN ADMIN
                </div>
                <h2 id="wizard-modal-title" className="text-base font-bold text-white mt-0.5">
                  Offiziellen Antrag stellen — Schritt {wizardStep} von 3
                </h2>
              </div>
              <button
                type="button"
                onClick={closeWizardModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Assistent schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress Indicator Bar */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1, label: 'Schritt 1: Grunddaten' },
                  { step: 2, label: 'Schritt 2: Begründung' },
                  { step: 3, label: 'Schritt 3: Bestätigung' }
                ].map(item => {
                  const isActive = wizardStep === item.step;
                  const isDone = wizardStep > item.step;
                  return (
                    <div
                      key={item.step}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono transition-colors ${
                        isActive
                          ? 'bg-sky-600 text-white font-bold shadow-xs'
                          : isDone
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold'
                            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-black/10 dark:bg-white/10 shrink-0">
                        {isDone ? '✓' : item.step}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wizard Form Body */}
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
              {/* STEP 1: GRUNDDATEN */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      SCHRITT 1 — GRUNDDATEN:{' '}
                    </span>
                    Wähle die Antragsart, das gewünschte Ziel (z. B. neuer Rang oder Modul-Freigabe)
                    und gib einen prägnanten Betreff ein.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Antragsart / Kategorie *
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as RequestCategory)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                      >
                        <option value="rank_change">Rangänderung / Beförderungsantrag</option>
                        <option value="clearance">Sonderfreigabe / Modul-Freigabe</option>
                        <option value="award">Auszeichnung / Belobigung (Commendation)</option>
                        <option value="transfer">Abteilungs- / Divisionswechsel</option>
                        <option value="loa">Dienstabmeldung / Urlaubsantrag (LOA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Priorität / Dringlichkeitsstufe
                      </label>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as 'normal' | 'high')}
                        className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-medium"
                      >
                        <option value="normal">Reguläre Bearbeitung (Standard)</option>
                        <option value="high">Dringend / Hohe Priorität</option>
                      </select>
                    </div>
                  </div>

                  {category === 'rank_change' ? (
                    <div>
                      <label className="block text-xs font-semibold text-sky-700 dark:text-sky-400 mb-1">
                        Beantragter Ziel-Rang (Exklusive Entscheidung durch Admin) *
                      </label>
                      <select
                        value={requestedRole}
                        onChange={e => setRequestedRole(e.target.value as OfficerRole)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-md bg-white dark:bg-slate-950 border border-sky-400 dark:border-sky-600 text-slate-900 dark:text-white focus:outline-none focus:border-sky-600 font-semibold"
                      >
                        <option value="rookie">4. Rookie (Anwärter nach Grundausbildung)</option>
                        <option value="officer">3. Officer (Regulärer Vollzugsdienst)</option>
                        <option value="colonel">2. Colonel (Ausbildungs- &amp; Stabsleitung)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Spezifisches Ziel / Detailangabe *
                      </label>
                      <input
                        type="text"
                        required
                        value={targetDetail}
                        onChange={e => setTargetDetail(e.target.value)}
                        placeholder="z.B. Freigabe Modul Tactical-02 / Air Support / Zeitraum"
                        className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kurztitel / Betreff des Antrags *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="z.B. Antrag auf Beförderung zum Rookie nach bestandenem Übungstest"
                      className="w-full px-3.5 py-2.5 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: BEGRÜNDUNG */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      SCHRITT 2 — BEGRÜNDUNG &amp; NACHWEISE:{' '}
                    </span>
                    Erläutere deine absolvierten Lehrgänge, bestandenen Prüfungen oder dienstlichen
                    Gründe für diesen Antrag.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ausführliche Begründung &amp; Referenz-Nachweise * (mind. 10 Zeichen)
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      placeholder="Führe hier deine abgeschlossenen Ausbildungsmodule, Testergebnisse, Dienstzeiten oder die Begründung für den Administrator auf..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: BESTÄTIGUNG */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 text-xs text-emerald-950 dark:text-emerald-200">
                    <span className="font-mono font-bold">
                      SCHRITT 3 — PRÜFUNG &amp; VERBINDLICHE ÜBERMITTLUNG:{' '}
                    </span>
                    Bitte überprüfe deine Angaben. Nach dem Absenden landet der Antrag ohne
                    Zwischenstufen direkt im zentralen Admin-Dashboard.
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                    <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        ANTRAGSTELLER:
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {currentUser.displayName} ({currentUser.badgeNumber} ·{' '}
                        {currentUser.role.toUpperCase()})
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        KATEGORIE:
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {REQUEST_CATEGORY_LABELS[category]}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        ZIEL / ANFORDERUNG:
                      </span>
                      <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                        {category === 'rank_change'
                          ? `Zielrang: ${requestedRole.toUpperCase()} (${ROLE_HIERARCHY[requestedRole].defaultRank})`
                          : targetDetail}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-mono text-slate-500 dark:text-slate-400">BETREFF:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <span className="font-mono text-slate-500 dark:text-slate-400 block">
                        BEGRÜNDUNG:
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 whitespace-pre-line">
                        {justification}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmAccuracy}
                      onChange={e => setConfirmAccuracy(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-sky-600"
                    />
                    <span>
                      Ich bestätige die dienstliche Richtigkeit aller Angaben. Mir ist bekannt, dass
                      dieser Antrag direkt an den Administrator übermittelt und im System-Audit-Log
                      protokolliert wird.
                    </span>
                  </label>
                </div>
              )}

              {/* Modal Footer Navigation */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep(prev => (prev === 3 ? 2 : 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Zurück
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeWizardModal}
                      className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Abbrechen
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {wizardStep === 1 && (
                    <button
                      type="button"
                      disabled={!canProceedStep1}
                      onClick={() => setWizardStep(2)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Weiter zu Schritt 2
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {wizardStep === 2 && (
                    <button
                      type="button"
                      disabled={!canProceedStep2}
                      onClick={() => setWizardStep(3)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Weiter zu Schritt 3
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {wizardStep === 3 && (
                    <button
                      type="submit"
                      disabled={submitting || !confirmAccuracy}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting
                        ? 'Übermittle an Admin...'
                        : 'Antrag verbindlich an Admin senden'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alle Anträge ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            In Bearbeitung ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('approved')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Genehmigt ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('rejected')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Abgelehnt ({rejectedCount})
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          {canReviewRequests
            ? 'ZENTRALE ADMIN-ANSICHT: ALLE EINGEREICHTEN ANTRÄGE'
            : 'ANSICHT: MEINE EINGEREICHTEN ANTRÄGE'}
        </div>
      </div>

      {/* Structured Table & Graphical Empty State */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors">
        {filteredRequests.length === 0 ? (
          /* GRAPHICAL EMPTY STATE (Leerer Zustand) */
          <div className="py-16 px-6 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400 shadow-xs">
              <ClipboardCheck className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Keine ausstehenden Anträge vorhanden
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Für die gewählte Filteransicht liegen aktuell keine Einträge vor. Du kannst jederzeit
                über den 3-Schritte-Assistenten einen neuen Antrag direkt an den Administrator
                übermitteln.
              </p>
            </div>
            <button
              type="button"
              onClick={openWizardModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Neuen Antrag im Assistenten starten
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-950/60">
                  <th className="py-3.5 px-4">STATUS-BADGE</th>
                  <th className="py-3.5 px-4">ANTRAGSTELLER</th>
                  <th className="py-3.5 px-4">ANTRAGSART &amp; BETREFF</th>
                  <th className="py-3.5 px-4">ZIEL / ANFORDERUNG</th>
                  <th className="py-3.5 px-4">DATUM</th>
                  <th className="py-3.5 px-4 text-right">AKTIONEN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredRequests.map(reqDoc => {
                  const isReviewing = reviewingId === reqDoc.id;
                  const canApproveThis =
                    isAdmin ||
                    ((isColonel ||
                      Boolean(currentUser.granularPermissions?.canReviewStandardRequests)) &&
                      reqDoc.category !== 'rank_change');

                  return (
                    <React.Fragment key={reqDoc.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {reqDoc.status === 'pending' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                                IN BEARBEITUNG
                              </span>
                            )}
                            {reqDoc.status === 'approved' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                GENEHMIGT
                              </span>
                            )}
                            {reqDoc.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                ABGELEHNT
                              </span>
                            )}
                            {reqDoc.priority === 'high' && (
                              <span className="px-2 py-0.5 text-[10px] rounded bg-rose-600 text-white font-bold">
                                DRINGEND
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {reqDoc.requesterName}
                          </div>
                          <div className="font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {reqDoc.requesterBadge} · {reqDoc.requesterCurrentRole.toUpperCase()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {reqDoc.title}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                            {REQUEST_CATEGORY_LABELS[reqDoc.category]}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-sky-700 dark:text-sky-400 font-semibold">
                          {reqDoc.targetDetail || '-'}
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(reqDoc.createdIso).toLocaleDateString('de-DE')}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingId(isReviewing ? null : reqDoc.id);
                                setReviewComment(reqDoc.reviewerComment || '');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/70 rounded border border-sky-200 dark:border-sky-800 cursor-pointer"
                            >
                              {isReviewing ? 'Schließen' : 'Details / Admin-Prüfung'}
                            </button>

                            {(isAdmin || reqDoc.requesterUid === currentUser.uid) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRequest(reqDoc.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                                title="Antrag löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Request Detail & Admin Review Row */}
                      {isReviewing && (
                        <tr className="bg-slate-100/90 dark:bg-slate-950/80">
                          <td colSpan={6} className="p-6">
                            <div className="space-y-4 max-w-4xl">
                              <div className="space-y-2">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                  Begründung des Antragstellers ({reqDoc.requesterName}):
                                </h3>
                                <div className="text-sm sm:text-base text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 leading-relaxed">
                                  {reqDoc.justification
                                    .split(/\n+/)
                                    .map(p => p.trim())
                                    .filter(Boolean)
                                    .map((para, pIdx) => (
                                      <p key={pIdx} className="leading-relaxed">
                                        {para}
                                      </p>
                                    ))}
                                </div>
                              </div>

                              {reqDoc.reviewerComment && (
                                <div className="p-3.5 rounded bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs">
                                  <div className="font-mono text-sky-800 dark:text-sky-300 font-semibold">
                                    STELLUNGNAHME DER LEITUNG ({reqDoc.reviewerName || 'Admin'}):
                                  </div>
                                  <div className="text-slate-800 dark:text-slate-200 mt-1">
                                    {reqDoc.reviewerComment}
                                  </div>
                                </div>
                              )}

                              {canApproveThis && (
                                <div className="pt-3 border-t border-slate-300 dark:border-slate-800 space-y-3">
                                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200 font-semibold">
                                    DIREKTE ENTSCHEIDUNG DURCH{' '}
                                    {isAdmin ? 'ADMINISTRATOR' : 'COLONEL'}:
                                  </div>

                                  <input
                                    type="text"
                                    value={reviewComment}
                                    onChange={e => setReviewComment(e.target.value)}
                                    placeholder="Optionaler Entscheidungsvermerk / Begründung für die Personalakte..."
                                    className="w-full px-3.5 py-2 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                  />

                                  {isAdmin &&
                                    reqDoc.category === 'rank_change' &&
                                    reqDoc.requestedRole && (
                                      <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={applyRankChange}
                                          onChange={e => setApplyRankChange(e.target.checked)}
                                          className="rounded border-slate-300 text-sky-600"
                                        />
                                        <span>
                                          Bei Genehmigung das Benutzerkonto von{' '}
                                          <strong>{reqDoc.requesterName}</strong> sofort automatisch
                                          auf{' '}
                                          <strong className="uppercase text-sky-700 dark:text-sky-400">
                                            {reqDoc.requestedRole}
                                          </strong>{' '}
                                          befördern
                                        </span>
                                      </label>
                                    )}

                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => handleDecision(reqDoc, 'approved')}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Antrag genehmigen
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDecision(reqDoc, 'rejected')}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded hover:bg-rose-500 transition-colors cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Antrag ablehnen
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
