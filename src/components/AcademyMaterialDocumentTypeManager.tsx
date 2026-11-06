import React, { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyMaterialDocumentTypeDoc } from '../types/academy';

interface Props {
  onStatusToast: (message: string) => void;
}

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const primaryButton = 'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const secondaryButton = 'inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

function errorMessage(code?: string): string {
  switch (code) {
    case 'ACADEMY_MATERIAL_DOCUMENT_TYPE_NAME_ALREADY_EXISTS':
      return 'Ein Dokumenttyp mit diesem Namen ist bereits vorhanden.';
    case 'ACADEMY_MATERIAL_DOCUMENT_TYPE_REVISION_CONFLICT':
      return 'Der Dokumenttyp wurde zwischenzeitlich geändert. Lade die Liste neu und öffne sie erneut.';
    case 'ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_FOUND':
      return 'Dieser Dokumenttyp ist nicht mehr vorhanden. Lade die Liste neu.';
    case 'ACADEMY_MATERIAL_DOCUMENT_TYPE_IN_USE':
      return 'Dieser Dokumenttyp wird noch von mindestens einem Material verwendet. Archiviere sie stattdessen, damit bestehende Zuordnungen erhalten bleiben.';
    case 'ACADEMY_MATERIAL_DOCUMENT_TYPE_INVALID':
      return 'Der Dokumenttypname ist ungültig. Er darf 1 bis 80 Zeichen enthalten.';
    default:
      return code || 'Der Dokumenttyp konnte nicht gespeichert werden.';
  }
}

export const AcademyMaterialDocumentTypeManager: React.FC<Props> = ({ onStatusToast }) => {
  const [documentTypes, setDocumentTypes] = useState<AcademyMaterialDocumentTypeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AcademyMaterialDocumentTypeDoc | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formErrorField, setFormErrorField] = useState<'name' | 'description' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const response = await apiFetch<{ documentTypes: AcademyMaterialDocumentTypeDoc[] }>(API_ENDPOINTS.ACADEMY_MATERIAL_DOCUMENT_TYPES);
    if (!response.ok || !response.data) {
      setLoadError(errorMessage(response.error));
      setLoading(false);
      return;
    }
    setDocumentTypes(response.data.documentTypes);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const beginCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFormError('');
    setFormErrorField(null);
  };

  const beginEdit = (documentType: AcademyMaterialDocumentTypeDoc) => {
    setEditing(documentType);
    setName(documentType.name);
    setDescription(documentType.description || '');
    setFormError('');
    setFormErrorField(null);
  };

  const cancelEdit = () => {
    beginCreate();
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setFormError('Gib einen Dokumenttypnamen ein.');
      setFormErrorField('name');
      return;
    }
    if (normalizedName.length > 80) {
      setFormError('Der Dokumenttypname darf höchstens 80 Zeichen enthalten.');
      setFormErrorField('name');
      return;
    }
    if (description.length > 300) {
      setFormError('Die Beschreibung darf höchstens 300 Zeichen enthalten.');
      setFormErrorField('description');
      return;
    }
    setFormError('');
    setFormErrorField(null);
    setBusy(true);
    const response = editing
      ? await apiFetch<{ documentType: AcademyMaterialDocumentTypeDoc }>(
          API_ENDPOINTS.ACADEMY_MATERIAL_DOCUMENT_TYPE(editing.id),
          {
            method: 'PUT',
            body: JSON.stringify({
              expectedRevision: editing.revision,
              name: normalizedName,
              description: description.trim()
            })
          }
        )
      : await apiFetch<{ documentType: AcademyMaterialDocumentTypeDoc }>(
          API_ENDPOINTS.ACADEMY_MATERIAL_DOCUMENT_TYPES,
          {
            method: 'POST',
            body: JSON.stringify({ name: normalizedName, description: description.trim() })
          }
        );
    if (!response.ok || !response.data) {
      setFormError(errorMessage(response.error));
      setBusy(false);
      return;
    }
    const saved = response.data.documentType;
    await load();
    beginCreate();
    setBusy(false);
    onStatusToast(editing ? `Dokumenttyp „${saved.name}“ aktualisiert.` : `Dokumenttyp „${saved.name}“ angelegt.`);
  };

  const changeArchiveState = async (documentType: AcademyMaterialDocumentTypeDoc) => {
    const archive = documentType.status === 'active';
    const confirmed = window.confirm(
      archive
        ? `Dokumenttyp „${documentType.name}“ archivieren? Bestehende Dokumentverweise bleiben erhalten; der Dokumenttyp kann anschließend nicht mehr für neue Materialien ausgewählt werden.`
        : `Dokumenttyp „${documentType.name}“ wieder aktivieren?`
    );
    if (!confirmed) return;
    setBusy(true);
    const response = await apiFetch<{ documentType: AcademyMaterialDocumentTypeDoc }>(
      API_ENDPOINTS.ACADEMY_MATERIAL_DOCUMENT_TYPE_STATE(documentType.id, archive ? 'archive' : 'restore'),
      { method: 'POST', body: JSON.stringify({ expectedRevision: documentType.revision }) }
    );
    if (!response.ok || !response.data) {
      onStatusToast(errorMessage(response.error));
      setBusy(false);
      return;
    }
    await load();
    if (editing?.id === documentType.id) beginCreate();
    setBusy(false);
    onStatusToast(archive ? `Dokumenttyp „${documentType.name}“ archiviert.` : `Dokumenttyp „${documentType.name}“ wieder aktiviert.`);
  };

  const deleteDocumentType = async (documentType: AcademyMaterialDocumentTypeDoc) => {
    const typedName = window.prompt(
      `Dokumenttyp „${documentType.name}“ endgültig löschen? Das ist nur möglich, wenn kein Material mehr auf ihn verweist. Zum Bestätigen bitte den Namen exakt eingeben:`
    );
    if (typedName === null) return;
    if (typedName.trim() !== documentType.name) {
      onStatusToast('Der Dokumenttypname stimmt nicht überein. Es wurde nichts gelöscht.');
      return;
    }
    setBusy(true);
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_MATERIAL_DOCUMENT_TYPE(documentType.id),
      {
        method: 'DELETE',
        body: JSON.stringify({ expectedRevision: documentType.revision })
      }
    );
    if (!response.ok) {
      onStatusToast(errorMessage(response.error));
      setBusy(false);
      await load();
      return;
    }
    if (editing?.id === documentType.id) beginCreate();
    await load();
    setBusy(false);
    onStatusToast(`Dokumenttyp „${documentType.name}“ endgültig gelöscht.`);
  };

  const visibleDocumentTypes = documentTypes.filter(documentType =>
    `${documentType.name} ${documentType.description || ''}`.toLocaleLowerCase('de-DE').includes(search.trim().toLocaleLowerCase('de-DE'))
  );

  return (
    <section className="space-y-5" aria-labelledby="academy-documentType-heading">
      <header className="space-y-1">
        <h2 id="academy-documentType-heading" className="text-xl font-semibold text-slate-900 dark:text-white">Dokumenttypen verwalten</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Dokumenttypen können hier erstellt, umbenannt, archiviert, reaktiviert und – solange kein Material darauf verweist – endgültig gelöscht werden. Die Kennung bleibt bei einer Umbenennung stabil.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-5 items-start">
        <form onSubmit={save} className="rounded-lg border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Dokumenttyp bearbeiten' : 'Dokumenttyp hinzufügen'}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Dokumenttypen sind globale Bibliotheks-Metadaten und werden nicht als Freitext an jedem Dokument gepflegt.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="academy-documentType-name" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Dokumenttypname</label>
            <input
              id="academy-documentType-name"
              className={inputClass}
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={80}
              required
              aria-invalid={formErrorField === 'name'}
              aria-describedby={formErrorField === 'name' ? 'academy-documentType-name-hint academy-documentType-form-error' : 'academy-documentType-name-hint'}
              disabled={busy}
            />
            <p id="academy-documentType-name-hint" className="text-xs text-slate-500 dark:text-slate-400">1 bis 80 Zeichen</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="academy-documentType-description" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Beschreibung (optional)</label>
            <textarea
              id="academy-documentType-description"
              className={inputClass}
              value={description}
              onChange={event => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              disabled={busy}
              aria-invalid={formErrorField === 'description'}
              aria-describedby={formErrorField === 'description' ? 'academy-documentType-description-hint academy-documentType-form-error' : 'academy-documentType-description-hint'}
            />
            <p id="academy-documentType-description-hint" className="text-xs text-slate-500 dark:text-slate-400">Bis zu 300 Zeichen</p>
          </div>

          {formError && <p id="academy-documentType-form-error" role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{formError}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? 'Speichert …' : editing ? 'Änderungen speichern' : 'Dokumenttyp hinzufügen'}
            </button>
            {editing && <button type="button" className={secondaryButton} onClick={cancelEdit} disabled={busy}>Abbrechen</button>}
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Vorhandene Dokumenttypen</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {documentTypes.filter(item => item.status === 'active').length} aktiv · {documentTypes.filter(item => item.status === 'archived').length} archiviert
              </p>
            </div>
            <button type="button" className={secondaryButton} onClick={beginCreate} disabled={busy}>Neuer Dokumenttyp</button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="academy-documentType-search" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Dokumenttypen durchsuchen</label>
            <input id="academy-documentType-search" type="search" className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Name oder Beschreibung" />
          </div>

          {loading ? (
            <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Dokumenttypen werden geladen …</p>
          ) : loadError ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
              <button type="button" className={secondaryButton} onClick={() => void load()}>Erneut versuchen</button>
            </div>
          ) : visibleDocumentTypes.length === 0 ? (
            <p role="status" className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {documentTypes.length === 0 ? 'Noch keine Dokumenttypenen angelegt.' : 'Kein Dokumenttyp entspricht deiner Suche.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleDocumentTypes.map(documentType => (
                <li key={documentType.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 dark:text-white">{documentType.name}</span>
                        <span className={documentType.status === 'active'
                          ? 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200'}>
                          {documentType.status === 'active' ? 'Aktiv' : 'Archiviert'}
                        </span>
                      </div>
                      {documentType.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{documentType.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button type="button" className={secondaryButton} onClick={() => beginEdit(documentType)} disabled={busy}>Bearbeiten</button>
                      <button type="button" className={secondaryButton} onClick={() => void changeArchiveState(documentType)} disabled={busy}>
                        {documentType.status === 'active' ? 'Archivieren' : 'Reaktivieren'}
                      </button>
                      <button type="button" className={secondaryButton} onClick={() => void deleteDocumentType(documentType)} disabled={busy}>
                        Endgültig löschen
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Archivierte Dokumenttypen bleiben für bestehende Verweise nachvollziehbar und können nicht neuen Materialien zugewiesen werden. Endgültiges Löschen ist nur ohne bestehende Materialzuordnungen möglich; der Server prüft das unmittelbar beim Löschversuch.
      </p>
    </section>
  );
};
