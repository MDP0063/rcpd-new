import React, { useState } from 'react';
import {
  FileCheck,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Edit3,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  VALIDATION_LIMITS
} from '../lib/firebase';
import {
  ApplicationStatus,
  OfficerRole,
  ROLE_HIERARCHY,
  UserPublicProfile,
  WhitelistApplicationDoc
} from '../types/portal';

interface WhitelistPortalProps {
  currentUser: UserPublicProfile;
  applications: WhitelistApplicationDoc[];
  isAdmin: boolean;
  onStatusToast: (msg: string) => void;
}

export const WhitelistPortal: React.FC<WhitelistPortalProps> = ({
  currentUser,
  applications,
  isAdmin,
  onStatusToast
}) => {
  const myExistingApp = applications.find(a => a.applicantUid === currentUser.uid);

  const [characterName, setCharacterName] = useState(myExistingApp?.characterName || '');
  const [dateOfBirth, setDateOfBirth] = useState(myExistingApp?.dateOfBirth || '1996-05-14');
  const [discordTag, setDiscordTag] = useState(myExistingApp?.discordTag || '');
  const [priorExperience, setPriorExperience] = useState(
    myExistingApp?.priorExperience ||
      'Erfahrung im strukturierten Law Enforcement Roleplay (LAPD / CHP Standards, 10-Codes, Funkdisziplin).'
  );
  const [scenarioResponse, setScenarioResponse] = useState(
    myExistingApp?.scenarioResponse ||
      'Bei einem Code-6 Traffic Stop sichere ich zunächst über SCC Dispatch den Standort (10-20) und das Kennzeichen ab. Bei Verdacht auf eine Schusswaffe (PC 25400) ziehe ich mich hinter die B-Säule bzw. den Motorblock zurück, fordere ein 10-33 Backup für einen High-Risk Felony Stop an und wende die Grundsätze aus CA Penal Code § 835a (Verhältnismäßigkeit & Deeskalation) an.'
  );
  const [penalCodeAck, setPenalCodeAck] = useState(myExistingApp?.penalCodeAck ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin review states
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ApplicationStatus>('accepted');
  const [promoteToRole, setPromoteToRole] = useState<OfficerRole>('cadet');

  const isTerminal = myExistingApp && (myExistingApp.status === 'accepted' || myExistingApp.status === 'rejected');

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (characterName.trim().length < 3 || priorExperience.trim().length < 10 || scenarioResponse.trim().length < 10) {
      onStatusToast('Bitte alle Pflichtfelder vollständig ausfüllen (Mindestlänge beachten).');
      return;
    }

    setIsSubmitting(true);
    const docId = myExistingApp ? myExistingApp.id : sanitizeId(`app_${currentUser.uid}`);
    const path = `applications/${docId}`;

    try {
      if (!myExistingApp) {
        await setDoc(doc(db, 'applications', docId), {
          applicantUid: currentUser.uid,
          applicantName: currentUser.displayName.slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
          characterName: characterName.trim().slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
          dateOfBirth: dateOfBirth.trim().slice(0, 20),
          discordTag: (discordTag.trim() || 'officer#0001').slice(0, VALIDATION_LIMITS.DISCORD_MAX),
          priorExperience: priorExperience.trim().slice(0, VALIDATION_LIMITS.PRIOR_EXP_MAX),
          scenarioResponse: scenarioResponse.trim().slice(0, VALIDATION_LIMITS.SCENARIO_MAX),
          penalCodeAck: Boolean(penalCodeAck),
          status: 'pending',
          reviewerUid: '',
          reviewerFeedback: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        onStatusToast('Bewerbung erfolgreich beim Recruitment & Background Board eingereicht.');
      } else {
        await updateDoc(doc(db, 'applications', docId), {
          characterName: characterName.trim().slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
          dateOfBirth: dateOfBirth.trim().slice(0, 20),
          discordTag: (discordTag.trim() || 'officer#0001').slice(0, VALIDATION_LIMITS.DISCORD_MAX),
          priorExperience: priorExperience.trim().slice(0, VALIDATION_LIMITS.PRIOR_EXP_MAX),
          scenarioResponse: scenarioResponse.trim().slice(0, VALIDATION_LIMITS.SCENARIO_MAX),
          penalCodeAck: Boolean(penalCodeAck),
          updatedAt: serverTimestamp()
        });
        onStatusToast('Bewerbungsunterlagen aktualisiert.');
      }
    } catch (error) {
      handleFirestoreError(error, myExistingApp ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminDecision = async (app: WhitelistApplicationDoc) => {
    const appPath = `applications/${app.id}`;
    try {
      await updateDoc(doc(db, 'applications', app.id), {
        status: reviewStatus,
        reviewerUid: currentUser.uid,
        reviewerFeedback: reviewFeedback.trim().slice(0, VALIDATION_LIMITS.NOTES_MAX),
        updatedAt: serverTimestamp()
      });

      // Automatically synchronize user's whitelistStatus and role if accepted/rejected
      if (reviewStatus === 'accepted') {
        const roleMeta = ROLE_HIERARCHY[promoteToRole];
        await updateDoc(doc(db, 'users', app.applicantUid), {
          whitelistStatus: promoteToRole === 'cadet' ? 'probation' : 'whitelisted',
          role: promoteToRole,
          rank: roleMeta.defaultRank,
          clearanceLevel: roleMeta.defaultClearance,
          updatedAt: serverTimestamp()
        });
      } else if (reviewStatus === 'rejected') {
        await updateDoc(doc(db, 'users', app.applicantUid), {
          whitelistStatus: 'revoked',
          updatedAt: serverTimestamp()
        });
      }

      onStatusToast(`Bewerbung von ${app.characterName} auf "${reviewStatus.toUpperCase()}" gesetzt & Akte synchronisiert.`);
      setSelectedAppId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, appPath);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Explanation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
            CALIFORNIA POST // RECRUITMENT & BACKGROUND INVESTIGATION DIVISION
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Whitelist & Academy Bewerbungsplattform
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Unabhängige Background-Verifizierung für den Polizeidienst. Angenommene Bewerber erhalten automatisch ihre POST-Clearance sowie die Freigabe über die Game-Server Whitelist-Bridge.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
          <span>AKTUELLER WHITELIST-STATUS:</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 uppercase">
            {currentUser.whitelistStatus}
          </span>
          <span aria-hidden="true">·</span>
          <span>CLEARANCE LEVEL {currentUser.clearanceLevel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Applicant Dossier Form (Left 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Personal History Statement (POST Form 2-251)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {myExistingApp
                  ? `Eingereicht für Charakter: ${myExistingApp.characterName} · Status: ${myExistingApp.status.toUpperCase()}`
                  : 'Neues Bewerbungsdossier für den kalifornischen Streifendienst erstellen'}
              </p>
            </div>
            <FileCheck className="w-5 h-5 text-amber-500 shrink-0" />
          </div>

          {myExistingApp && myExistingApp.reviewerFeedback && (
            <div className="mb-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400 mb-1">
                STELLUNGNAHME DER RECRUITMENT DIVISION:
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200">{myExistingApp.reviewerFeedback}</p>
            </div>
          )}

          <form onSubmit={handleSubmitApplication} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  RP Charaktername (Vor- & Nachname)
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(isTerminal)}
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  placeholder="z.B. Johnathan Miller"
                  className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Geburtsdatum (IC Date of Birth)
                </label>
                <input
                  type="date"
                  required
                  disabled={Boolean(isTerminal)}
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Discord-Identifikation (für FTO-Einweisung & Funk-Synchronisation)
              </label>
              <input
                type="text"
                required
                disabled={Boolean(isTerminal)}
                value={discordTag}
                onChange={e => setDiscordTag(e.target.value)}
                placeholder="z.B. miller.chp#1099"
                className="w-full px-3.5 py-2 text-sm font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Bisherige Law-Enforcement- & Rollenspiel-Erfahrung
              </label>
              <textarea
                rows={3}
                required
                disabled={Boolean(isTerminal)}
                value={priorExperience}
                onChange={e => setPriorExperience(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Taktische Fallstudie: Verhaltensweise bei einem bewaffneten Traffic Stop (PC § 835a / Terry v. Ohio)
              </label>
              <textarea
                rows={5}
                required
                disabled={Boolean(isTerminal)}
                value={scenarioResponse}
                onChange={e => setScenarioResponse(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              />
              <div className="mt-1 text-xs font-mono text-slate-500">
                Zeichen: {scenarioResponse.length} / {VALIDATION_LIMITS.SCENARIO_MAX}
              </div>
            </div>

            <label className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={penalCodeAck}
                disabled={Boolean(isTerminal)}
                onChange={e => setPenalCodeAck(e.target.checked)}
                className="mt-0.5 rounded border-slate-400 text-amber-500 focus:ring-amber-500"
              />
              <span>
                Ich bestätige, dass ich die California POST Standards, das Use-of-Force Continuum (AB 392 / PC § 835a) sowie die strikten Whitelist-Regeln gelesen habe.
              </span>
            </label>

            <div className="pt-2 flex items-center justify-between gap-4">
              {isTerminal ? (
                <div className="text-xs font-mono text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Bewerbung befindet sich im abgeschlossenen Status ({myExistingApp?.status.toUpperCase()}) und ist schreibgeschützt.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-md transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  {myExistingApp ? 'Bewerbungsdossier aktualisieren' : 'Offizielle Whitelist-Bewerbung absenden'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right 5 Cols: Application Queue & Command Review */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {isAdmin ? 'Command Review Queue (Alle Bewerbungen)' : 'Dein Bewerbungsstatus & Historie'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Echtzeit-Synchronisation mit Firestore & Whitelist-API
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {applications.length} AKTEN
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Noch keine Bewerbungsakten vorhanden. Reiche links dein Personal History Statement ein.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {applications.map(app => {
                  const isEditingThis = selectedAppId === app.id;
                  return (
                    <div key={app.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {app.characterName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap font-mono">
                            <span>{app.applicantName}</span>
                            <span aria-hidden="true">·</span>
                            <span>DOB {app.dateOfBirth}</span>
                            <span aria-hidden="true">·</span>
                            <span>{app.discordTag}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
                          {app.status === 'accepted' && (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> ACCEPTED
                            </span>
                          )}
                          {app.status === 'rejected' && (
                            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> REJECTED
                            </span>
                          )}
                          {app.status !== 'accepted' && app.status !== 'rejected' && (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {app.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3">
                        {app.scenarioResponse}
                      </p>

                      {isAdmin && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/70">
                          {!isEditingThis ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppId(app.id);
                                setReviewStatus(app.status === 'pending' ? 'accepted' : app.status);
                                setReviewFeedback(
                                  app.reviewerFeedback ||
                                    'Background Investigation bestanden. Freigabe als POST Academy Cadet erteilt.'
                                );
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Bewerbung prüfen & Whitelist vergeben
                            </button>
                          ) : (
                            <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">Entscheidung</label>
                                  <select
                                    value={reviewStatus}
                                    onChange={e => setReviewStatus(e.target.value as ApplicationStatus)}
                                    className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="under_review">In Prüfung (Under Review)</option>
                                    <option value="interview_scheduled">Interview angesetzt</option>
                                    <option value="accepted">Annehmen & Whitelisten</option>
                                    <option value="rejected">Ablehnen (Rejected)</option>
                                  </select>
                                </div>
                                {reviewStatus === 'accepted' && (
                                  <div>
                                    <label className="block text-xs text-slate-500 mb-1">Ziel-Rolle bei Annahme</label>
                                    <select
                                      value={promoteToRole}
                                      onChange={e => setPromoteToRole(e.target.value as OfficerRole)}
                                      className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                    >
                                      <option value="cadet">Academy Cadet (Level 2)</option>
                                      <option value="officer">Patrol Officer (Level 3)</option>
                                      <option value="fto">FTO Instructor (Level 4)</option>
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">Offizielle Begründung / Notiz</label>
                                <textarea
                                  rows={2}
                                  value={reviewFeedback}
                                  onChange={e => setReviewFeedback(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAdminDecision(app)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded hover:bg-amber-400 transition-colors cursor-pointer"
                                >
                                  Urteil speichern & Akte aktualisieren
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAppId(null)}
                                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
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

          {/* External Game-Server Verification Info Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400 mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>STANDALONE GAME-SERVER WHITELIST REST API</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Der Gameserver (FiveM / RageMP / Dedicated RP) fragt den Whitelist-Status unabhängig vom Spiel direkt über den integrierten Express-Endpunkt ab:
            </p>
            <div className="mt-3 p-2.5 rounded bg-slate-100 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
              GET /api/v1/whitelist/verify?badge={currentUser.badgeNumber}&amp;status={currentUser.whitelistStatus}&amp;role={currentUser.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
