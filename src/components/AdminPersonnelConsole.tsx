import React, { useState } from 'react';
import {
  Users,
  Shield,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus,
  Edit2
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
  OfficerRole,
  ROLE_HIERARCHY,
  UserPrivateProfile,
  UserProgressDoc,
  UserPublicProfile,
  WhitelistStatus
} from '../types/portal';

interface AdminPersonnelConsoleProps {
  currentUser: UserPublicProfile;
  roster: UserPublicProfile[];
  privateProfiles: UserPrivateProfile[];
  allProgress: UserProgressDoc[];
  isAdmin: boolean;
  onStatusToast: (msg: string) => void;
}

export const AdminPersonnelConsole: React.FC<AdminPersonnelConsoleProps> = ({
  currentUser,
  roster,
  privateProfiles,
  allProgress,
  isAdmin,
  onStatusToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editingUid, setEditingUid] = useState<string | null>(null);

  // Edit Buffer
  const [editBadge, setEditBadge] = useState('');
  const [editCallsign, setEditCallsign] = useState('');
  const [editRank, setEditRank] = useState('');
  const [editRole, setEditRole] = useState<OfficerRole>('officer');
  const [editClearance, setEditClearance] = useState<number>(3);
  const [editDivision, setEditDivision] = useState('');
  const [editWhitelist, setEditWhitelist] = useState<WhitelistStatus>('whitelisted');
  const [editNotes, setEditNotes] = useState('');

  // Create New Officer Account Modal/Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newBadge, setNewBadge] = useState('CA-4092');
  const [newCallsign, setNewCallsign] = useState('2-L-40');
  const [newRole, setNewRole] = useState<OfficerRole>('officer');
  const [newDivision, setNewDivision] = useState('Metropolitan Patrol Division');
  const [newWhitelist, setNewWhitelist] = useState<WhitelistStatus>('whitelisted');

  const filteredRoster = roster.filter(u => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.callsign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.division.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const startEditing = (officer: UserPublicProfile) => {
    const priv = privateProfiles.find(p => p.uid === officer.uid);
    setEditingUid(officer.uid);
    setEditBadge(officer.badgeNumber);
    setEditCallsign(officer.callsign);
    setEditRank(officer.rank);
    setEditRole(officer.role);
    setEditClearance(officer.clearanceLevel);
    setEditDivision(officer.division);
    setEditWhitelist(officer.whitelistStatus);
    setEditNotes(priv?.supervisorNotes || '');
  };

  const handleSaveOfficer = async (uid: string) => {
    if (!isAdmin) return;
    const cleanBadge = editBadge.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 20) || 'CA-0001';
    try {
      await updateDoc(doc(db, 'users', uid), {
        badgeNumber: cleanBadge,
        callsign: editCallsign.trim().slice(0, VALIDATION_LIMITS.CALLSIGN_MAX),
        rank: editRank.trim().slice(0, VALIDATION_LIMITS.RANK_MAX),
        role: editRole,
        clearanceLevel: Math.max(0, Math.min(10, Number(editClearance))),
        division: editDivision.trim().slice(0, VALIDATION_LIMITS.DIVISION_MAX),
        whitelistStatus: editWhitelist,
        updatedAt: serverTimestamp()
      });

      const existingPriv = privateProfiles.find(p => p.uid === uid);
      if (existingPriv) {
        await updateDoc(doc(db, 'users_private', uid), {
          supervisorNotes: editNotes.slice(0, VALIDATION_LIMITS.NOTES_MAX),
          updatedAt: serverTimestamp()
        });
      }

      if (editRole === 'admin') {
        await setDoc(doc(db, 'admins', uid), {
          uid,
          grantedAt: serverTimestamp()
        });
      }

      onStatusToast(`Personalakte (${cleanBadge}) sowie Rollen- und Whitelist-Berechtigungen aktualisiert.`);
      setEditingUid(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleCreateSimulatedOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || newDisplayName.trim().length < 2) return;
    const uid = sanitizeId(`officer_${Date.now()}`);
    const roleMeta = ROLE_HIERARCHY[newRole];
    const cleanBadge = newBadge.toUpperCase().replace(/[^A-Z0-9\-]/g, '').slice(0, 20) || 'CA-1099';

    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        displayName: newDisplayName.trim().slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
        badgeNumber: cleanBadge,
        callsign: newCallsign.trim().slice(0, VALIDATION_LIMITS.CALLSIGN_MAX),
        rank: roleMeta.defaultRank,
        role: newRole,
        clearanceLevel: roleMeta.defaultClearance,
        division: newDivision.trim().slice(0, VALIDATION_LIMITS.DIVISION_MAX),
        whitelistStatus: newWhitelist,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await setDoc(doc(db, 'users_private', uid), {
        uid,
        email: `${uid}@lapd-post.ca.gov`,
        discordTag: `${newDisplayName.toLowerCase().replace(/\s+/g, '.')}#1099`.slice(0, 64),
        steamHex: 'steam:11000010a94f82c',
        supervisorNotes: 'Durch Command Staff im Admin-Portal angelegt.',
        updatedAt: serverTimestamp()
      });

      setNewDisplayName('');
      setShowCreateForm(false);
      onStatusToast(`Neues Benutzerkonto "${newDisplayName}" (${cleanBadge}) in Datenbank angelegt.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
            COMMAND STAFF // PERSONNEL & ROLE-BASED ACCESS CONTROL (RBAC)
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Benutzerkonten, Dienstgrade & Nutzergruppen-Verwaltung
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Zentrale Verwaltung aller registrierten Officers, Bewerber und Nutzergruppen. Änderungen an Rolle oder Clearance Level steuern in Echtzeit die Sichtbarkeit von geheimen Lehrmaterialien und Prüfungen.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-md hover:bg-amber-400 transition-colors cursor-pointer self-start whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" /> Neues Officer-Konto anlegen
          </button>
        )}
      </div>

      {/* Create Officer Account Drawer */}
      {isAdmin && showCreateForm && (
        <form
          onSubmit={handleCreateSimulatedOfficer}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Neues Benutzerkonto direkt in die Personaldatenbank eintragen
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              required
              value={newDisplayName}
              onChange={e => setNewDisplayName(e.target.value)}
              placeholder="Name (z.B. Sgt. Elena Vance)"
              className="px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              required
              value={newBadge}
              onChange={e => setNewBadge(e.target.value)}
              placeholder="Badge (CA-4092)"
              className="px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              required
              value={newCallsign}
              onChange={e => setNewCallsign(e.target.value)}
              placeholder="Callsign (2-L-40)"
              className="px-3 py-2 text-xs font-mono rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as OfficerRole)}
              className="px-3 py-2 text-xs rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="applicant">Applicant (Level 1)</option>
              <option value="cadet">Academy Cadet (Level 2)</option>
              <option value="officer">Patrol Officer (Level 3)</option>
              <option value="fto">FTO Instructor (Level 4)</option>
              <option value="supervisor">Supervisor (Level 5)</option>
              <option value="admin">Command Admin (Level 10)</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-500 transition-colors cursor-pointer"
            >
              Konto speichern
            </button>
          </div>
        </form>
      )}

      {/* Role & Clearance Matrix Explanation Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(Object.keys(ROLE_HIERARCHY) as OfficerRole[]).map(roleKey => {
          const meta = ROLE_HIERARCHY[roleKey];
          const count = roster.filter(r => r.role === roleKey).length;
          return (
            <div
              key={roleKey}
              onClick={() => setRoleFilter(roleFilter === roleKey ? 'ALL' : roleKey)}
              className={`p-3.5 rounded-lg border transition-colors cursor-pointer ${
                roleFilter === roleKey
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="uppercase">{roleKey}</span>
                <span>LVL {meta.defaultClearance}</span>
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {count}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{meta.defaultRank}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suche nach Officer, Dienstnummer (CA-...), Callsign oder Division..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span>ANGEZEIGTE KONTEN: {filteredRoster.length}</span>
          {roleFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className="text-amber-500 hover:underline cursor-pointer"
            >
              [Filter zurücksetzen]
            </button>
          )}
        </div>
      </div>

      {/* High-Density Personnel Roster Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 bg-slate-50/60 dark:bg-slate-950/60">
                <th className="py-3 px-4">BADGE / CALLSIGN</th>
                <th className="py-3 px-4">OFFICER NAME &amp; DIVISION</th>
                <th className="py-3 px-4">ROLLE &amp; RANG</th>
                <th className="py-3 px-4 text-right">CLEARANCE</th>
                <th className="py-3 px-4">WHITELIST STATUS</th>
                <th className="py-3 px-4 text-right">ACADEMY FORTSCHRITT</th>
                <th className="py-3 px-4 text-right">AKTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredRoster.map(officer => {
                const isEditing = editingUid === officer.uid;
                const officerProg = allProgress.filter(p => p.userId === officer.uid);
                const completedCount = officerProg.filter(
                  p => p.status === 'completed' || p.status === 'passed'
                ).length;
                const priv = privateProfiles.find(p => p.uid === officer.uid);

                return (
                  <React.Fragment key={officer.uid}>
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {officer.badgeNumber}
                        </span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-amber-600 dark:text-amber-400">{officer.callsign}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {officer.displayName}
                        </div>
                        <div className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{officer.division}</span>
                          {priv && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{priv.discordTag}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {officer.rank}
                        </div>
                        <div className="font-mono text-slate-500 uppercase">{officer.role}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        LEVEL {officer.clearanceLevel}
                      </td>
                      <td className="py-3 px-4 font-mono uppercase whitespace-nowrap">
                        {officer.whitelistStatus === 'whitelisted' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            WHITELISTED
                          </span>
                        )}
                        {officer.whitelistStatus === 'probation' && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            PROBATION (FTO)
                          </span>
                        )}
                        {officer.whitelistStatus === 'pending' && (
                          <span className="text-slate-500">PENDING</span>
                        )}
                        {(officer.whitelistStatus === 'suspended' ||
                          officer.whitelistStatus === 'revoked') && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            {officer.whitelistStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {completedCount} ZERTIFIKATE
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() =>
                              isEditing ? setEditingUid(null) : startEditing(officer)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            {isEditing ? 'Schließen' : 'Konto verwalten'}
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono">READ-ONLY</span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Admin Account & Role Editor Row */}
                    {isAdmin && isEditing && (
                      <tr className="bg-slate-50 dark:bg-slate-950/90">
                        <td colSpan={7} className="p-5">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                              <div className="text-xs font-mono text-amber-500">
                                ADMIN BENUTZERKONTO- &amp; RECHTEVERWALTUNG // UID: {officer.uid}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Badge Number
                                </label>
                                <input
                                  type="text"
                                  value={editBadge}
                                  onChange={e => setEditBadge(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Funkrufname (Callsign)
                                </label>
                                <input
                                  type="text"
                                  value={editCallsign}
                                  onChange={e => setEditCallsign(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Nutzergruppe / Rolle
                                </label>
                                <select
                                  value={editRole}
                                  onChange={e => {
                                    const r = e.target.value as OfficerRole;
                                    setEditRole(r);
                                    setEditClearance(ROLE_HIERARCHY[r].defaultClearance);
                                    setEditRank(ROLE_HIERARCHY[r].defaultRank);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                >
                                  <option value="applicant">Applicant (Bewerber)</option>
                                  <option value="cadet">Academy Cadet</option>
                                  <option value="officer">Patrol Officer</option>
                                  <option value="fto">Field Training Officer (FTO)</option>
                                  <option value="supervisor">Supervisor / Sergeant</option>
                                  <option value="admin">Command Staff / Admin</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Dienstgrad (Rank)
                                </label>
                                <input
                                  type="text"
                                  value={editRank}
                                  onChange={e => setEditRank(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Clearance Level (0–10)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={10}
                                  value={editClearance}
                                  onChange={e => setEditClearance(Number(e.target.value))}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                />
                              </div>

                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Whitelist-Freigabe
                                </label>
                                <select
                                  value={editWhitelist}
                                  onChange={e => setEditWhitelist(e.target.value as WhitelistStatus)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                >
                                  <option value="pending">Pending (Ausstehend)</option>
                                  <option value="probation">Probation (Auf Probe)</option>
                                  <option value="whitelisted">Whitelisted (Aktiv)</option>
                                  <option value="suspended">Suspended (Suspendiert)</option>
                                  <option value="revoked">Revoked (Entzogen)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Zugewiesene Division / Bureau
                                </label>
                                <input
                                  type="text"
                                  value={editDivision}
                                  onChange={e => setEditDivision(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 mb-1">
                                  Vertrauliche Supervisor-Aktennotiz (PII-isoliert in /users_private)
                                </label>
                                <input
                                  type="text"
                                  value={editNotes}
                                  onChange={e => setEditNotes(e.target.value)}
                                  placeholder="Interne Notiz (nur für Command Staff sichtbar)..."
                                  className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingUid(null)}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                              >
                                Abbrechen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveOfficer(officer.uid)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 rounded hover:bg-amber-400 transition-colors cursor-pointer"
                              >
                                <Save className="w-3.5 h-3.5" /> Änderungen in Datenbank speichern
                              </button>
                            </div>
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
      </div>
    </div>
  );
};
