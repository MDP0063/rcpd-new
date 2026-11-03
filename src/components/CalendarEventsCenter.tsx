import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  UserCheck
} from 'lucide-react';
import {
  CalendarEventCategory,
  CalendarEventDoc,
  OfficerRole,
  ROLE_HIERARCHY,
  UserPublicProfile
} from '../types/portal';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

interface CalendarEventsCenterProps {
  currentUser: UserPublicProfile;
  events: CalendarEventDoc[];
  onRefreshState: () => Promise<void>;
  onStatusToast: (msg: string) => void;
}

const EVENT_CATEGORIES: CalendarEventCategory[] = [
  'Training & Lehrgang',
  'Prüfungstermin',
  'Dienstbesprechung',
  'Sondereinsatz'
];

export const CalendarEventsCenter: React.FC<CalendarEventsCenterProps> = ({
  currentUser,
  events,
  onRefreshState,
  onStatusToast
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create Event State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CalendarEventCategory>('Training & Lehrgang');
  const [courseCode, setCourseCode] = useState('SOP-01');
  const [location, setLocation] = useState('CA-POST Regional Training Center · Raum 102');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [description, setDescription] = useState('');
  const [mandatoryRoles, setMandatoryRoles] = useState<OfficerRole[]>(['trainee', 'rookie']);
  const [submitting, setSubmitting] = useState(false);

  const canManageEvents =
    currentUser.role === 'admin' ||
    currentUser.role === 'colonel' ||
    Boolean(currentUser.granularPermissions?.canManageEvents);

  const filteredEvents = events.filter(evt =>
    categoryFilter === 'ALL' ? true : evt.category === categoryFilter
  );

  const toggleMandatoryRole = (role: OfficerRole) => {
    setMandatoryRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;
    setSubmitting(true);

    const res = await apiFetch(API_ENDPOINTS.EVENTS, {
      method: 'POST',
      body: JSON.stringify({
        actorUid: currentUser.uid,
        title: title.trim(),
        category,
        courseCode: courseCode.trim().toUpperCase(),
        location: location.trim(),
        startIso: new Date(startDate).toISOString(),
        durationMinutes: Number(durationMinutes) || 60,
        maxParticipants: Number(maxParticipants) || 20,
        description: description.trim(),
        mandatoryForRoles: mandatoryRoles
      })
    });

    setSubmitting(false);
    if (!res.ok) {
      onStatusToast(res.error || 'Termin konnte nicht angelegt werden.');
      return;
    }

    setTitle('');
    setDescription('');
    setShowCreateForm(false);
    await onRefreshState();
    onStatusToast('Neuer Kalender-Termin veröffentlicht und Team benachrichtigt.');
  };

  const handleRsvp = async (eventId: string, status: 'attending' | 'declined') => {
    const res = await apiFetch(`${API_ENDPOINTS.EVENTS}/${eventId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({
        userUid: currentUser.uid,
        status
      })
    });

    if (!res.ok) {
      onStatusToast(res.error || 'An-/Abmeldung fehlgeschlagen.');
      return;
    }

    await onRefreshState();
    onStatusToast(
      status === 'attending'
        ? 'Du hast dich verbindlich zum Termin angemeldet.'
        : 'Du hast dich vom Termin abgemeldet.'
    );
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    const res = await apiFetch(
      `${API_ENDPOINTS.EVENTS}/${eventId}?actorUid=${encodeURIComponent(currentUser.uid)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      onStatusToast(res.error || 'Termin konnte nicht gelöscht werden.');
      return;
    }
    await onRefreshState();
    onStatusToast(`Termin "${eventTitle}" wurde entfernt.`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono text-sky-600 font-semibold">
            EINSATZ- &amp; AUSBILDUNGSKALENDER
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Trainings, Prüfungen, Besprechungen &amp; Sondereinsätze
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Melde dich direkt mit einem Klick für kommende Lehrgänge, Prüfungstermine oder
            Sondereinsätze an oder ab.
          </p>
        </div>

        {canManageEvents && (
          <button
            type="button"
            onClick={() => setShowCreateForm(prev => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Formular schließen' : 'Neuen Termin anlegen'}
          </button>
        )}
      </div>

      {/* Create Event Form */}
      {showCreateForm && canManageEvents && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-xs"
        >
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900">
              Neuen Kalender-Termin veröffentlichen
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Alle Beamten erhalten automatisch eine Echtzeit-Benachrichtigung über den neuen Termin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titel des Termins / Lehrgangs
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z. B. Schießstand-Qualifikation & High-Risk Stops"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Termin-Kategorie
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as CalendarEventCategory)}
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              >
                {EVENT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Datum &amp; Uhrzeit
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dauer (Minuten)
              </label>
              <input
                type="number"
                min={15}
                max={480}
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max. Teilnehmer
              </label>
              <input
                type="number"
                min={2}
                max={200}
                value={maxParticipants}
                onChange={e => setMaxParticipants(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Zugehöriger Kurs-Code (optional)
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                placeholder="SOP-01"
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Treffpunkt / Einsatzort
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="z. B. Hauptquartier · Besprechungsraum 204"
                className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Empfohlen / Pflicht für folgende Ränge
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {(['trainee', 'rookie', 'officer', 'colonel', 'admin'] as OfficerRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleMandatoryRole(r)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border cursor-pointer ${
                      mandatoryRoles.includes(r)
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inhaltliche Beschreibung &amp; Voraussetzungen
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ausrüstung, Vorbereitung, Themengebiete..."
              className="w-full px-3.5 py-2 text-xs rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-600 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Wird gespeichert...' : 'Termin veröffentlichen'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Alle Termine ({events.length})
        </button>
        {EVENT_CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500">
          Keine Termine in dieser Kategorie geplant.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map(evt => {
            const attendingList = evt.attendees.filter(a => a.status === 'attending');
            const declinedList = evt.attendees.filter(a => a.status === 'declined');
            const myEntry = evt.attendees.find(a => a.uid === currentUser.uid);
            const isMandatoryForMe = evt.mandatoryForRoles.includes(currentUser.role);
            const capacityPercent = Math.min(
              100,
              Math.round((attendingList.length / Math.max(1, evt.maxParticipants)) * 100)
            );

            return (
              <div
                key={evt.id}
                className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-5 shadow-xs"
              >
                <div className="space-y-3">
                  {/* Top Metadata Line (Unboxed clean metadata per design guidelines) */}
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sky-700 font-semibold">{evt.category}</span>
                      {evt.courseCode && (
                        <>
                          <span>·</span>
                          <span className="text-slate-800 font-semibold">
                            Kurs: {evt.courseCode}
                          </span>
                        </>
                      )}
                      {isMandatoryForMe && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700 font-semibold">
                            Empfohlen für {ROLE_HIERARCHY[currentUser.role].label.split(' ')[0]}
                          </span>
                        </>
                      )}
                    </div>

                    {canManageEvents && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt.id, evt.title)}
                        title="Termin löschen"
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{evt.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>

                  {/* Event Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="font-mono">
                        {new Date(evt.startIso).toLocaleString('de-DE', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}{' '}
                        Uhr
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Dauer: {evt.durationMinutes} Minuten</span>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{evt.location}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:col-span-2">
                      <UserCheck className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Leitung / Ausbilder: {evt.instructorName}</span>
                    </div>
                  </div>
                </div>

                {/* Capacity Bar & Attendees */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-600" />
                        Angemeldete Teilnehmer
                      </span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {attendingList.length} / {evt.maxParticipants} Plätze ({capacityPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-sky-600 transition-all duration-300"
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Roster of signed-up officers */}
                  {attendingList.length > 0 && (
                    <div className="text-[11px] text-slate-600 font-mono">
                      <span className="text-slate-400">ZUGESAGT: </span>
                      {attendingList
                        .map(a => `${a.displayName} (${a.badgeNumber})`)
                        .join(' · ')}
                    </div>
                  )}

                  {declinedList.length > 0 && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      <span>ABGESAGT: </span>
                      {declinedList.map(a => a.displayName).join(' · ')}
                    </div>
                  )}

                  {/* Interactive RSVP Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="text-xs font-mono">
                      {myEntry?.status === 'attending' ? (
                        <span className="text-emerald-700 font-semibold">
                          ✓ Du bist angemeldet
                        </span>
                      ) : myEntry?.status === 'declined' ? (
                        <span className="text-rose-600 font-semibold">✕ Du hast abgesagt</span>
                      ) : (
                        <span className="text-slate-400">Noch keine Rückmeldung</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRsvp(evt.id, 'attending')}
                        disabled={myEntry?.status === 'attending'}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          myEntry?.status === 'attending'
                            ? 'bg-emerald-600 text-white opacity-90'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Anmelden
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRsvp(evt.id, 'declined')}
                        disabled={myEntry?.status === 'declined'}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          myEntry?.status === 'declined'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Abmelden
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
