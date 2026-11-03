import React, { useState } from 'react';
import {
  FileCheck,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Edit3
} from 'lucide-react';
import {
  ApplicationStatus,
  OfficerRole,
  UserPublicProfile,
  WhitelistApplicationDoc
} from '../types/portal';

interface WhitelistPortalProps {
  currentUser: UserPublicProfile;
  applications: WhitelistApplicationDoc[];
  isAdmin: boolean;
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

export const WhitelistPortal: React.FC<WhitelistPortalProps> = ({
  currentUser,
  applications,
  isAdmin,
  onRefreshState,
  onStatusToast
}) => {
  const myExistingApp = applications.find(a => a.applicantUid === currentUser.uid);

  const [characterName, setCharacterName] = useState(
    myExistingApp?.characterName || currentUser.displayName
  );
  const [dateOfBirth, setDateOfBirth] = useState(myExistingApp?.dateOfBirth || '1998-05-14');
  const [discordTag, setDiscordTag] = useState(myExistingApp?.discordTag || '');
  const [priorExperience, setPriorExperience] = useState(myExistingApp?.priorExperience || '');
  const [scenarioResponse, setScenarioResponse] = useState(myExistingApp?.scenarioResponse || '');
  const [penalCodeAck, setPenalCodeAck] = useState(myExistingApp?.penalCodeAck ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin review states
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ApplicationStatus>('accepted');
  const [promoteToRole, setPromoteToRole] = useState<OfficerRole>('trainee');

  const isTerminal =
    myExistingApp && (myExistingApp.status === 'accepted' || myExistingApp.status === 'rejected');

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      characterName.trim().length < 2 ||
      priorExperience.trim().length < 5 ||
      scenarioResponse.trim().length < 5
    ) {
      onStatusToast('Bitte alle Felder des Personalbogens vollständig ausfüllen.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantUid: currentUser.uid,
          characterName,
          dateOfBirth,
          discordTag: discordTag || 'officer#0001',
          priorExperience,
          scenarioResponse,
          penalCodeAck
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Bewerbung konnte nicht gespeichert werden.');
        return;
      }
      await onRefreshState();
      onStatusToast('Personalbogen erfolgreich eingereicht.');
    } catch {
      onStatusToast('Netzwerkfehler beim Senden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDecision = async (app: WhitelistApplicationDoc) => {
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminUid: currentUser.uid,
          status: reviewStatus,
          reviewerFeedback: reviewFeedback,
          promoteToRole
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onStatusToast(data.error || 'Fehler bei der Entscheidung.');
        return;
      }
      await onRefreshState();
      setSelectedAppId(null);
      onStatusToast(`Akte von ${app.characterName} auf "${reviewStatus.toUpperCase()}" aktualisiert.`);
    } catch {
      onStatusToast('Serverfehler.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono text-sky-600 font-semibold">
            CALIFORNIA POST // PERSONALBOGEN &amp; WHITELIST-AKTE
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Personalbogen &amp; Beförderungsantrag
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Hinterlege hier deine offiziellen Charakterdaten und Einsatzszenarien für die Personalakte.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
          <span>STATUS:</span>
          <span className="font-semibold text-slate-900 uppercase">
            {currentUser.whitelistStatus}
          </span>
          <span aria-hidden="true">·</span>
          <span className="uppercase">RANG: {currentUser.role}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Personal History Statement (Form 2-251)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {myExistingApp
                  ? `Eingereicht für: ${myExistingApp.characterName} · Status: ${myExistingApp.status.toUpperCase()}`
                  : 'Personalakte vervollständigen'}
              </p>
            </div>
            <FileCheck className="w-5 h-5 text-sky-600 shrink-0" />
          </div>

          {myExistingApp && myExistingApp.reviewerFeedback && (
            <div className="mb-6 p-4 rounded-lg bg-sky-50 border border-sky-200">
              <div className="text-xs font-mono text-sky-700 font-semibold mb-1">
                VERMERK DER BEHÖRDENLEITUNG (ADMIN):
              </div>
              <p className="text-sm text-slate-800">{myExistingApp.reviewerFeedback}</p>
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  RP Charaktername (Vor- &amp; Nachname)
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(isTerminal)}
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Geburtsdatum
                </label>
                <input
                  type="date"
                  required
                  disabled={Boolean(isTerminal)}
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Discord-Kennung
              </label>
              <input
                type="text"
                required
                disabled={Boolean(isTerminal)}
                value={discordTag}
                onChange={e => setDiscordTag(e.target.value)}
                placeholder="z.B. officer.miller#0001"
                className="w-full px-3.5 py-2 text-sm font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Bisherige Diensterfahrung &amp; Laufbahn
              </label>
              <textarea
                rows={3}
                required
                disabled={Boolean(isTerminal)}
                value={priorExperience}
                onChange={e => setPriorExperience(e.target.value)}
                placeholder="Beschreibe deine bisherige Laufbahn..."
                className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Stellungnahme / Taktische Fallstudie
              </label>
              <textarea
                rows={4}
                required
                disabled={Boolean(isTerminal)}
                value={scenarioResponse}
                onChange={e => setScenarioResponse(e.target.value)}
                placeholder="Beschreibe dein Vorgehen im Streifendienst..."
                className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <label className="flex items-start gap-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={penalCodeAck}
                disabled={Boolean(isTerminal)}
                onChange={e => setPenalCodeAck(e.target.checked)}
                className="mt-0.5 rounded border-slate-400 text-sky-600 focus:ring-sky-500"
              />
              <span>
                Ich bestätige die Richtigkeit der Angaben gemäß den internen Dienstvorschriften.
              </span>
            </label>

            <div className="pt-2">
              {isTerminal ? (
                <div className="text-xs font-mono text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-sky-600" />
                  Akte abgeschlossen ({myExistingApp?.status.toUpperCase()}).
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {myExistingApp ? 'Personalbogen aktualisieren' : 'Personalbogen einreichen'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right 5 Cols */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {isAdmin ? 'Eingegangene Personalbögen (Admin)' : 'Dein Aktenstatus'}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {applications.length} AKTEN
            </span>
          </div>

          {applications.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Noch keine Einträge vorhanden.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {applications.map(app => {
                const isEditingThis = selectedAppId === app.id;
                return (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {app.characterName}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {app.applicantName} · DOB {app.dateOfBirth} · {app.discordTag}
                        </div>
                      </div>

                      <div className="text-xs font-mono shrink-0">
                        {app.status === 'accepted' && (
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
                          </span>
                        )}
                        {app.status === 'rejected' && (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> REJECTED
                          </span>
                        )}
                        {app.status !== 'accepted' && app.status !== 'rejected' && (
                          <span className="text-sky-700 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {app.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-3">
                      {app.scenarioResponse}
                    </p>

                    {isAdmin && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        {!isEditingThis ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppId(app.id);
                              setReviewStatus(app.status === 'pending' ? 'accepted' : app.status);
                              setReviewFeedback(app.reviewerFeedback || 'Akte geprüft und freigegeben.');
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Als Admin bearbeiten &amp; Rang zuweisen
                          </button>
                        ) : (
                          <div className="space-y-3 bg-slate-50 p-3.5 rounded-md border border-slate-200">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-slate-600 mb-1">Status</label>
                                <select
                                  value={reviewStatus}
                                  onChange={e => setReviewStatus(e.target.value as ApplicationStatus)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                                >
                                  <option value="under_review">In Prüfung</option>
                                  <option value="accepted">Freigeben</option>
                                  <option value="rejected">Ablehnen</option>
                                </select>
                              </div>
                              {reviewStatus === 'accepted' && (
                                <div>
                                  <label className="block text-xs text-slate-600 mb-1">Ziel-Rang</label>
                                  <select
                                    value={promoteToRole}
                                    onChange={e => setPromoteToRole(e.target.value as OfficerRole)}
                                    className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                                  >
                                    <option value="trainee">Trainee</option>
                                    <option value="rookie">Rookie</option>
                                    <option value="officer">Officer</option>
                                    <option value="colonel">Colonel</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Notiz</label>
                              <textarea
                                rows={2}
                                value={reviewFeedback}
                                onChange={e => setReviewFeedback(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded bg-white border border-slate-300"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAdminDecision(app)}
                                className="px-3 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded hover:bg-sky-500 cursor-pointer"
                              >
                                Speichern
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAppId(null)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
