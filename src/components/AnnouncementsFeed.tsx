import React, { useState } from 'react';
import {
  Megaphone,
  Pin,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  AnnouncementCategory,
  AnnouncementDoc,
  AnnouncementPriority,
  ROLE_HIERARCHY,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface AnnouncementsFeedProps {
  currentUser: UserPublicProfile;
  announcements: AnnouncementDoc[];
  totalOfficersCount: number;
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

/**
 * Formats official announcement content into well-spaced paragraphs and clear subheadings
 * to maximize legibility (Leserlichkeit) and visual hierarchy (Visuelle Hierarchie).
 */
const renderStructuredAnnouncementContent = (rawText: string) => {
  const blocks = rawText
    .split(/\n{2,}/)
    .map(b => b.trim())
    .filter(Boolean);

  // If single block with multiple lines, split by newline for cleaner paragraph structure
  const normalizedBlocks =
    blocks.length === 1 && rawText.includes('\n')
      ? rawText
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean)
      : blocks;

  return (
    <div className="space-y-3.5 text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed max-w-4xl">
      {normalizedBlocks.map((block, idx) => {
        if (block.startsWith('### ') || block.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pt-2 border-b border-slate-200 dark:border-slate-800 pb-1"
            >
              {block.replace(/^#{2,3}\s+/, '')}
            </h3>
          );
        }
        if (block.endsWith(':') && block.length < 85) {
          return (
            <h3
              key={idx}
              className="text-base font-bold text-slate-900 dark:text-white pt-1"
            >
              {block}
            </h3>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {block}
          </p>
        );
      })}
    </div>
  );
};

export const AnnouncementsFeed: React.FC<AnnouncementsFeedProps> = ({
  currentUser,
  announcements,
  totalOfficersCount,
  onRefreshState,
  onStatusToast
}) => {
  const canPublish =
    ROLE_HIERARCHY[currentUser.role]?.canEditAcademy ||
    currentUser.role === 'admin' ||
    Boolean(currentUser.granularPermissions?.canPublishAnnouncements);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create Announcement Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('Dienstanweisung');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdIso).getTime() - new Date(a.createdIso).getTime();
  });

  const filteredAnnouncements = sortedAnnouncements.filter(ann =>
    categoryFilter === 'ALL' ? true : ann.category === categoryFilter
  );

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish) return;
    setSubmitting(true);

    const res = await apiFetch<{ ok: boolean; announcement: AnnouncementDoc }>(
      API_ENDPOINTS.ANNOUNCEMENTS,
      {
        method: 'POST',
        body: JSON.stringify({
          actorUid: currentUser.uid,
          title,
          category,
          priority,
          content,
          pinned
        })
      }
    );

    setSubmitting(false);

    if (!res.ok) {
      onStatusToast(res.error || 'Bekanntmachung konnte nicht veröffentlicht werden.');
      return;
    }

    setTitle('');
    setContent('');
    setPinned(false);
    setShowCreateForm(false);
    await onRefreshState();
    onStatusToast('Offizielle Bekanntmachung wurde im Department-Feed veröffentlicht.');
  };

  const handleAcknowledge = async (annId: string) => {
    const res = await apiFetch(`${API_ENDPOINTS.ANNOUNCEMENTS}/${annId}/ack`, {
      method: 'POST',
      body: JSON.stringify({ userUid: currentUser.uid })
    });
    if (res.ok) {
      await onRefreshState();
      onStatusToast('Kenntnisnahme der Dienstanweisung protokolliert.');
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!canPublish) return;
    const res = await apiFetch(
      `${API_ENDPOINTS.ANNOUNCEMENTS}/${annId}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      await onRefreshState();
      onStatusToast('Bekanntmachung entfernt.');
    } else {
      onStatusToast(res.error || 'Fehler beim Entfernen.');
    }
  };

  const categories: AnnouncementCategory[] = [
    'Dienstanweisung',
    'Ausbildung & Academy',
    'Personal & Beförderungen',
    'Allgemeine Bekanntmachung'
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner with Prominent Hierarchy & Structured Lead Paragraphs */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Offizielles Schwarzes Brett · Dienstbekanntmachungen
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ankündigungen, Dienstanweisungen &amp; Updates
          </h1>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
            Zentraler Informations-Feed für alle Dienstgrade des California POST Portals. Alle
            Mitteilungen sind nach Dringlichkeit und Fachbereich gegliedert, um eine schnelle
            Erfassung im laufenden Dienstbetrieb zu gewährleisten.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Hinweis zur Kenntnisnahme:</strong> Bitte bestätige gelesene Dienstanweisungen
            über die Schaltfläche am Ende jeder Meldung, damit dein Ausbildungs- und Dienststatus
            aktuell bleibt.
          </p>
        </div>

        {canPublish && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer self-start whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Formular schließen' : '+ Neue Bekanntmachung veröffentlichen'}
          </button>
        )}
      </div>

      {/* Create Announcement Form (Admin & Colonel Only) */}
      {canPublish && showCreateForm && (
        <form
          onSubmit={handleCreateAnnouncement}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Neue Bekanntmachung · Administration &amp; Ausbildungsleitung
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Offizielle Mitteilung veröffentlichen
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Kategorie
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as AnnouncementCategory)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Prioritätsstufe
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
              >
                <option value="normal">Standard-Information</option>
                <option value="important">Wichtige Dienstanweisung</option>
                <option value="urgent">Eilmeldung / Höchste Priorität</option>
              </select>
            </div>

            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={e => setPinned(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>Oben im Feed &amp; Dashboard anheften (Pin)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Betreff / Titel der Bekanntmachung *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Aktualisierte Funkordnung & Prüfungsrichtlinien ab sofort gültig"
              className="w-full px-3.5 py-2.5 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Mitteilungstext / Weisungsinhalt (Absätze durch Leerzeile gliedern) *
            </label>
            <textarea
              rows={5}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Gib hier den vollständigen Text der Bekanntmachung ein. Nutze Absätze für maximale Leserlichkeit..."
              className="w-full px-3.5 py-2.5 text-sm rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-sky-600 text-white rounded-md hover:bg-sky-500 transition-colors cursor-pointer"
            >
              {submitting ? 'Veröffentliche...' : 'Bekanntmachung veröffentlichen'}
            </button>
          </div>
        </form>
      )}

      {/* Interactive Filter Control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Alle Meldungen ({announcements.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white dark:bg-sky-600 text-slate-900 dark:text-white font-semibold shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
          ANGEZEIGT: {filteredAnnouncements.length} BEKANNTMACHUNGEN
        </div>
      </div>

      {/* Announcements Feed List */}
      <div className="space-y-5">
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center space-y-2.5">
            <Megaphone className="w-9 h-9 text-sky-600 dark:text-sky-400 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Keine Bekanntmachungen in dieser Kategorie vorhanden
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Sobald neue offizielle Meldungen veröffentlicht werden, erscheinen sie hier strukturiert im Feed.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map(ann => {
            const isAcked = ann.acknowledgedByUids.includes(currentUser.uid);
            const ackCount = ann.acknowledgedByUids.length;
            const ackPercent = Math.min(
              100,
              Math.round((ackCount / Math.max(1, totalOfficersCount)) * 100)
            );

            return (
              <article
                key={ann.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-6 sm:p-7 space-y-5 shadow-xs transition-colors ${
                  ann.priority === 'urgent'
                    ? 'border-rose-300 dark:border-rose-800'
                    : ann.pinned
                    ? 'border-sky-300 dark:border-sky-700'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                      {ann.pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
                          <Pin className="w-3.5 h-3.5" /> ANGEHEFTET
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold uppercase">
                        {ann.category}
                      </span>
                      {ann.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> EILMELDUNG
                        </span>
                      )}
                      {ann.priority === 'important' && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                          WICHTIGE WEISUNG
                        </span>
                      )}
                      {ann.priority === 'normal' && (
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          REGULÄR
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 tabular-nums font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(ann.createdIso).toLocaleString('de-DE')}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {ann.title}
                    </h2>
                  </div>

                  {canPublish && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 rounded border border-transparent hover:border-rose-200 cursor-pointer self-start"
                      title="Bekanntmachung löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Structured Paragraph Content with High Contrast */}
                {renderStructuredAnnouncementContent(ann.content)}

                {/* Footer with Author Info, Read Progress Bar & Acknowledge Button */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-2 flex-1 max-w-md">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300">
                      <span>
                        VERFASST VON:{' '}
                        <strong className="text-slate-900 dark:text-white">{ann.authorName}</strong> (
                        {ann.authorRank})
                      </span>
                      <span className="tabular-nums font-semibold">
                        LESEBESTÄTIGUNG: {ackCount} / {Math.max(ackCount, totalOfficersCount)} ({ackPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div
                        className="h-full bg-sky-600 rounded-full transition-all"
                        style={{ width: `${ackPercent}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    {isAcked ? (
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Kenntnisnahme bestätigt
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(ann.id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-900 dark:bg-sky-600 text-white rounded-md hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-sky-400 dark:text-white" />
                        Kenntnisnahme bestätigen
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
