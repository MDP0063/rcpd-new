import React, { useState } from 'react';
import {
  Mail,
  Send,
  Inbox,
  Reply,
  Trash2,
  CheckCheck,
  Plus,
  ShieldAlert,
  Lock,
  X,
  MessageSquareOff
} from 'lucide-react';
import {
  DirectMessageDoc,
  MessagePriority,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface MessagesCenterProps {
  currentUser: UserPublicProfile;
  roster: UserPublicProfile[];
  messages: DirectMessageDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

export const MessagesCenter: React.FC<MessagesCenterProps> = ({
  currentUser,
  roster,
  messages,
  onRefreshState,
  onStatusToast
}) => {
  const isAdmin = currentUser.role === 'admin';
  const canBroadcast = isAdmin || currentUser.role === 'colonel';

  const adminMember =
    roster.find(r => r.role === 'admin') ||
    roster.find(r => r.uid === 'usr_admin_1') ||
    roster[0];

  const [activeBox, setActiveBox] = useState<'inbox' | 'admin_center' | 'sent'>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Interactive Modal Overlay State for Composing Direct Message OR Confidential Admin Support Ticket
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isExclusiveAdminTicketMode, setIsExclusiveAdminTicketMode] = useState(false);
  const [adminTicketType, setAdminTicketType] = useState<
    'SUPPORT-ANFRAGE' | 'FEHLERMELDUNG / BUG' | 'VERTRAULICHE MELDUNG' | 'PASSWORT- / KONTENHILFE'
  >('SUPPORT-ANFRAGE');

  // Compose Form State
  const [recipientUid, setRecipientUid] = useState<string>(() => {
    const firstOther = roster.find(r => r.uid !== currentUser.uid);
    return firstOther ? firstOther.uid : currentUser.uid;
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<MessagePriority>('routine');
  const [sending, setSending] = useState(false);

  const inboxMessages = messages.filter(
    m => m.recipientUid === currentUser.uid || m.recipientUid === 'ALL'
  );
  const sentMessages = messages.filter(m => m.senderUid === currentUser.uid);

  // Exklusives Admin-Meldezentrum: Confidential messages & tickets addressed directly to Admin
  const adminExclusiveMessages = messages.filter(
    m =>
      m.recipientUid === currentUser.uid &&
      (m.priority === 'confidential' ||
        m.subject.includes('[ADMIN-') ||
        m.subject.includes('[SUPPORT') ||
        m.subject.includes('[FEHLER'))
  );

  const unreadInboxCount = inboxMessages.filter(
    m => !m.readByUids.includes(currentUser.uid)
  ).length;

  const unreadAdminExclusiveCount = adminExclusiveMessages.filter(
    m => !m.readByUids.includes(currentUser.uid)
  ).length;

  const displayedList =
    activeBox === 'sent'
      ? sentMessages
      : activeBox === 'admin_center' && isAdmin
        ? adminExclusiveMessages
        : inboxMessages;

  const activeMessage =
    displayedList.find(m => m.id === selectedMessageId) || displayedList[0] || null;

  const openRegularComposeModal = () => {
    setIsExclusiveAdminTicketMode(false);
    const firstOther = roster.find(r => r.uid !== currentUser.uid);
    setRecipientUid(firstOther ? firstOther.uid : currentUser.uid);
    setSubject('');
    setBody('');
    setPriority('routine');
    setShowComposeModal(true);
  };

  const openAdminSupportModal = () => {
    setIsExclusiveAdminTicketMode(true);
    if (adminMember) {
      setRecipientUid(adminMember.uid);
    }
    setPriority('confidential');
    setSubject('');
    setBody('');
    setShowComposeModal(true);
  };

  const handleSelectMessage = async (msg: DirectMessageDoc) => {
    setSelectedMessageId(msg.id);
    if (!msg.readByUids.includes(currentUser.uid)) {
      await apiFetch(`${API_ENDPOINTS.MESSAGES}/${msg.id}/read`, {
        method: 'PUT',
        body: JSON.stringify({ userUid: currentUser.uid })
      });
      await onRefreshState();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const targetRecipientUid = isExclusiveAdminTicketMode
      ? adminMember?.uid || 'usr_admin_1'
      : recipientUid;

    const finalSubject = isExclusiveAdminTicketMode
      ? `[ADMIN-${adminTicketType}] ${subject.trim()}`
      : subject.trim();

    const finalPriority: MessagePriority = isExclusiveAdminTicketMode
      ? 'confidential'
      : priority;

    const res = await apiFetch<{ ok: boolean; message: DirectMessageDoc }>(
      API_ENDPOINTS.MESSAGES,
      {
        method: 'POST',
        body: JSON.stringify({
          senderUid: currentUser.uid,
          recipientUid: targetRecipientUid,
          subject: finalSubject,
          body: body.trim(),
          priority: finalPriority
        })
      }
    );

    setSending(false);

    if (!res.ok) {
      onStatusToast(res.error || 'Fehler beim Senden: Nachricht konnte nicht übermittelt werden.');
      return;
    }

    setSubject('');
    setBody('');
    setPriority('routine');
    setShowComposeModal(false);
    setActiveBox('sent');
    if (res.data?.message) {
      setSelectedMessageId(res.data.message.id);
    }
    await onRefreshState();
    onStatusToast(
      isExclusiveAdminTicketMode
        ? 'Vertrauliche Meldung erfolgreich exklusiv an das Admin-Meldezentrum übermittelt.'
        : 'Dienstnachricht erfolgreich übermittelt.'
    );
  };

  const handleReplyToMessage = (msg: DirectMessageDoc) => {
    setIsExclusiveAdminTicketMode(false);
    setRecipientUid(msg.senderUid);
    setSubject(msg.subject.startsWith('AW:') ? msg.subject : `AW: ${msg.subject}`);
    setBody(
      `\n\n--- Ursprüngliche Nachricht von ${msg.senderName} (${msg.senderBadge}) ---\n${msg.body}`
    );
    setPriority(msg.priority);
    setShowComposeModal(true);
  };

  const handleDeleteMessage = async (msgId: string) => {
    const res = await apiFetch(
      `${API_ENDPOINTS.MESSAGES}/${msgId}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      if (selectedMessageId === msgId) {
        setSelectedMessageId(null);
      }
      await onRefreshState();
      onStatusToast('Nachricht wurde gelöscht.');
    } else {
      onStatusToast(res.error || 'Fehler: Nachricht konnte nicht gelöscht werden.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Internes Kommunikationssystem · Dienstpostfach &amp; Meldezentrum
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Nachrichten- &amp; Meldezentrale
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            Direkte Dienstkommunikation zwischen Beamten sowie das exklusive Admin-Meldezentrum für
            technischen Support, Fehlermeldungen und vertrauliche Personal-Anfragen.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Klares Routing:</strong> Reguläre Dienstpost erreicht den gewählten Kollegen
            oder alle Dienstgrade, während Support- und Fehlermeldungen geschützt im Admin-Postfach
            eingehen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start">
          {!isAdmin && (
            <button
              type="button"
              onClick={openAdminSupportModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 rounded-md hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Support / Fehlermeldung an Admin
            </button>
          )}

          <button
            type="button"
            onClick={openRegularComposeModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" />
            + Neue Nachricht verfassen
          </button>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveBox('inbox')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeBox === 'inbox'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Posteingang ({inboxMessages.length})
            {unreadInboxCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-600 text-white">
                {unreadInboxCount} neu
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveBox('admin_center')}
              className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activeBox === 'admin_center'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Exklusives Admin-Meldezentrum ({adminExclusiveMessages.length})
              {unreadAdminExclusiveCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-600 text-white">
                  {unreadAdminExclusiveCount} neu
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveBox('sent')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeBox === 'sent'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Gesendet ({sentMessages.length})
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          DIENSTKONTO: {currentUser.displayName} ({currentUser.badgeNumber})
        </div>
      </div>

      {/* ==========================================================================
          INTERACTIVE MODAL WINDOW (POP-UP OVERLAY): COMPOSE MESSAGE / ADMIN TICKET
          ========================================================================== */}
      {showComposeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8 transition-colors">
            <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono text-sky-400 font-semibold">
                  {isExclusiveAdminTicketMode
                    ? 'EXKLUSIVES ADMIN-MELDEZENTRUM · VERTRAULICHER DIREKTKANAL'
                    : 'DIENSTNACHRICHT VERFASSEN · INTERNES DISPATCH-MEMO'}
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {isExclusiveAdminTicketMode
                    ? 'Support-Anfrage, Fehlermeldung oder vertrauliches Anliegen an den Admin'
                    : 'Direkte Mitteilung an einen Beamten oder die Leitung senden'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="p-6 space-y-5">
              {/* Mode Switch inside Modal */}
              {!isAdmin && (
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIsExclusiveAdminTicketMode(false)}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      !isExclusiveAdminTicketMode
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Reguläre Dienstnachricht
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExclusiveAdminTicketMode(true);
                      if (adminMember) setRecipientUid(adminMember.uid);
                      setPriority('confidential');
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      isExclusiveAdminTicketMode
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Exklusives Admin-Meldezentrum (Vertraulich)
                  </button>
                </div>
              )}

              {isExclusiveAdminTicketMode ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-950 dark:text-amber-200">
                    <span className="font-mono font-bold">EXKLUSIVER ADMIN-POSTEINGANG: </span>
                    Diese Nachricht wird verschlüsselt als <strong>Vertraulich</strong> eingestuft
                    und landet ausschließlich im persönlichen Posteingang des Administrators (
                    {adminMember?.displayName || 'Admin1'}).
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Art der Meldung an den Administrator *
                    </label>
                    <select
                      value={adminTicketType}
                      onChange={e =>
                        setAdminTicketType(e.target.value as typeof adminTicketType)
                      }
                      className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="SUPPORT-ANFRAGE">
                        Allgemeine Support-Anfrage / Technische Hilfe
                      </option>
                      <option value="FEHLERMELDUNG / BUG">
                        Fehlermeldung (Bug-Report) im Portal oder Lehrgang
                      </option>
                      <option value="VERTRAULICHE MELDUNG">
                        Vertrauliche Personal- oder Beschwerdemeldung
                      </option>
                      <option value="PASSWORT- / KONTENHILFE">
                        Zugangsdaten- / Berechtigungs-Rückfrage
                      </option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Empfänger auswählen *
                    </label>
                    <select
                      value={recipientUid}
                      onChange={e => setRecipientUid(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      {canBroadcast && (
                        <option value="ALL">
                          [RUNDSCHREIBEN] An alle Beamten im Department senden
                        </option>
                      )}
                      {roster.map(member => (
                        <option key={member.uid} value={member.uid}>
                          {member.displayName} ({member.badgeNumber} · Rang:{' '}
                          {member.role.toUpperCase()})
                          {member.uid === currentUser.uid ? ' [Eigene Notiz]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dringlichkeit / Status-Badge
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as MessagePriority)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="routine">Routine (Standard-Dienstpost)</option>
                      <option value="urgent">Dringend (Priorisierte Bearbeitung)</option>
                      <option value="confidential">
                        Vertraulich (Personal- / Führungsangelegenheit)
                      </option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Betreffzeile *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={
                    isExclusiveAdminTicketMode
                      ? 'z.B. Fehler beim Öffnen von Modul SOP-01 / Vertrauliche Anfrage'
                      : 'z.B. Rückfrage zur FTO-Ausbildungsakte / Schichtübergabe'
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nachrichtentext / Beschreibung *
                </label>
                <textarea
                  rows={5}
                  required
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Schreibe hier deine ausführliche dienstliche Mitteilung oder Meldung..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending
                    ? 'Sende...'
                    : isExclusiveAdminTicketMode
                      ? 'Vertraulich an Admin absenden'
                      : 'Nachricht jetzt absenden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2-PANE MESSAGE LIST & READER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Message Table / List */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs transition-colors">
          <div className="px-4 py-3 bg-slate-100/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>
              {activeBox === 'inbox'
                ? 'POSTEINGANG (INBOX)'
                : activeBox === 'admin_center'
                  ? 'EXKLUSIVES ADMIN-MELDEZENTRUM'
                  : 'GESENDETE NACHRICHTEN'}
            </span>
            <span className="tabular-nums">{displayedList.length} EINTRÄGE</span>
          </div>

          {displayedList.length === 0 ? (
            /* GRAPHICAL EMPTY STATE (Leerer Zustand) */
            <div className="p-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400">
                <MessageSquareOff className="w-7 h-7" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {activeBox === 'admin_center'
                  ? 'Keine vertraulichen Admin-Meldungen vorhanden'
                  : 'Keine Nachrichten in diesem Ordner vorhanden'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {activeBox === 'admin_center'
                  ? 'Sobald Beamte über das Support- und Meldeformular Fehler melden oder vertrauliche Anfragen stellen, erscheinen diese exklusiv hier.'
                  : 'Dein Postfach für diese Ansicht ist aktuell leer. Klicke oben auf „+ Neue Nachricht verfassen“, um eine Mitteilung zu starten.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {displayedList.map(msg => {
                const isUnread = !msg.readByUids.includes(currentUser.uid);
                const isSelected = activeMessage?.id === msg.id;

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50/90 dark:bg-slate-800'
                        : isUnread
                          ? 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {activeBox === 'sent'
                            ? `An: ${msg.recipientName}`
                            : `${msg.senderName} (${msg.senderBadge})`}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                        {new Date(msg.createdIso).toLocaleDateString('de-DE')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                      {msg.subject}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span className="truncate">{msg.body.slice(0, 55)}</span>
                      {msg.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                          DRINGEND
                        </span>
                      )}
                      {msg.priority === 'confidential' && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                          VERTRAULICH
                        </span>
                      )}
                      {msg.priority === 'routine' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
                          AKTIV
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 7 Cols: Message Detail Reader */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-xs transition-colors">
          {!activeMessage ? (
            <div className="py-16 text-center space-y-2 text-slate-500 dark:text-slate-400">
              <Mail className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Wähle links eine Nachricht aus, um den Inhalt zu lesen
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold uppercase ${
                        activeMessage.priority === 'urgent'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : activeMessage.priority === 'confidential'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {activeMessage.priority === 'urgent'
                        ? 'DRINGENDE DIENSTPOST'
                        : activeMessage.priority === 'confidential'
                          ? 'VERTRAULICH / ADMIN-MELDUNG'
                          : 'ROUTINE-MITTEILUNG'}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {new Date(activeMessage.createdIso).toLocaleString('de-DE')}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white pt-1">
                    {activeMessage.subject}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReplyToMessage(activeMessage)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Antworten
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(activeMessage.id)}
                    className="p-2 text-slate-500 hover:text-rose-600 rounded border border-slate-200 dark:border-slate-700 hover:border-rose-200 cursor-pointer"
                    title="Nachricht löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono">
                <div>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">ABSENDER: </span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeMessage.senderName} ({activeMessage.senderBadge})
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">EMPFÄNGER: </span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {activeMessage.recipientName} ({activeMessage.recipientBadge})
                  </span>
                </div>
              </div>

              {/* Structured Message Body with Clear Paragraph Spacing */}
              <div className="space-y-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed min-h-[180px]">
                {activeMessage.body
                  .split(/\n{2,}/)
                  .map(b => b.trim())
                  .filter(Boolean)
                  .map((para, idx) => (
                    <p key={idx} className="whitespace-pre-line leading-relaxed">
                      {para}
                    </p>
                  ))}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCheck className="w-4 h-4" />
                  Gelesen von {activeMessage.readByUids.length} Empfänger(n)
                </span>
                <span>ID: {activeMessage.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
