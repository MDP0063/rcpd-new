import React, { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import './AcademyMaterialTaxonomyManager.css';
import type { AcademyMaterialCategoryDoc, AcademyMaterialCategoryView } from '../types/academy';

interface Props {
  onStatusToast: (message: string) => void;
}

const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const primaryButton = 'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const secondaryButton = 'inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const dangerButton = 'inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600';

function errorMessage(code?: string): string {
  switch (code) {
    case 'ACADEMY_MATERIAL_CATEGORY_NAME_ALREADY_EXISTS':
      return 'Eine Kategorie mit diesem Namen ist bereits vorhanden.';
    case 'ACADEMY_MATERIAL_CATEGORY_REVISION_CONFLICT':
      return 'Die Kategorie wurde zwischenzeitlich geändert. Lade die Liste neu und öffne sie erneut.';
    case 'ACADEMY_MATERIAL_CATEGORY_NOT_FOUND':
      return 'Diese Kategorie ist nicht mehr vorhanden. Lade die Liste neu.';
    case 'ACADEMY_MATERIAL_CATEGORY_IN_USE':
      return 'Diese Kategorie wird noch von mindestens einem Material verwendet. Archiviere sie stattdessen, damit bestehende Zuordnungen erhalten bleiben.';
    case 'ACADEMY_MATERIAL_CATEGORY_INVALID':
      return 'Der Kategoriename ist ungültig. Er darf 1 bis 80 Zeichen enthalten.';
    default:
      return code || 'Die Kategorie konnte nicht gespeichert werden.';
  }
}

export const AcademyMaterialCategoryManager: React.FC<Props> = ({ onStatusToast }) => {
  const [categories, setCategories] = useState<AcademyMaterialCategoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AcademyMaterialCategoryView | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [formErrorField, setFormErrorField] = useState<'name' | 'description' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const response = await apiFetch<{ categories: AcademyMaterialCategoryView[] }>(API_ENDPOINTS.ACADEMY_MATERIAL_CATEGORIES);
    if (!response.ok || !response.data) {
      setLoadError(errorMessage(response.error));
      setLoading(false);
      return;
    }
    setCategories(response.data.categories);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const hasFormChanges = formOpen && (
    name !== (editing?.name || '') ||
    description !== (editing?.description || '')
  );

  const resetForm = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFormError('');
    setFormErrorField(null);
  };

  const beginCreate = () => {
    if (hasFormChanges && !window.confirm('Ungespeicherte Änderungen verwerfen und eine neue Kategorie beginnen?')) return;
    resetForm();
    setFormOpen(true);
  };

  const beginEdit = (category: AcademyMaterialCategoryView) => {
    if (hasFormChanges && !window.confirm('Ungespeicherte Änderungen verwerfen und eine andere Kategorie bearbeiten?')) return;
    setEditing(category);
    setName(category.name);
    setDescription(category.description || '');
    setFormError('');
    setFormErrorField(null);
    setFormOpen(true);
  };

  const cancelEdit = () => {
    if (hasFormChanges && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return;
    resetForm();
    setFormOpen(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setFormError('Gib einen Kategorienamen ein.');
      setFormErrorField('name');
      return;
    }
    if (normalizedName.length > 80) {
      setFormError('Der Kategoriename darf höchstens 80 Zeichen enthalten.');
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
      ? await apiFetch<{ category: AcademyMaterialCategoryDoc }>(
          API_ENDPOINTS.ACADEMY_MATERIAL_CATEGORY(editing.id),
          {
            method: 'PUT',
            body: JSON.stringify({
              expectedRevision: editing.revision,
              name: normalizedName,
              description: description.trim()
            })
          }
        )
      : await apiFetch<{ category: AcademyMaterialCategoryDoc }>(
          API_ENDPOINTS.ACADEMY_MATERIAL_CATEGORIES,
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
    const saved = response.data.category;
    await load();
    resetForm();
    setFormOpen(false);
    setBusy(false);
    onStatusToast(editing ? `Kategorie „${saved.name}“ aktualisiert.` : `Kategorie „${saved.name}“ angelegt.`);
  };

  const changeArchiveState = async (category: AcademyMaterialCategoryView) => {
    const archive = category.status === 'active';
    const confirmed = window.confirm(
      archive
        ? `Kategorie „${category.name}“ archivieren? Bestehende Dokumentverweise bleiben erhalten; die Kategorie kann anschließend nicht mehr für neue Materialien ausgewählt werden.`
        : `Kategorie „${category.name}“ wieder aktivieren?`
    );
    if (!confirmed) return;
    setBusy(true);
    const response = await apiFetch<{ category: AcademyMaterialCategoryDoc }>(
      API_ENDPOINTS.ACADEMY_MATERIAL_CATEGORY_STATE(category.id, archive ? 'archive' : 'restore'),
      { method: 'POST', body: JSON.stringify({ expectedRevision: category.revision }) }
    );
    if (!response.ok || !response.data) {
      onStatusToast(errorMessage(response.error));
      setBusy(false);
      return;
    }
    await load();
    if (editing?.id === category.id) beginCreate();
    setBusy(false);
    onStatusToast(archive ? `Kategorie „${category.name}“ archiviert.` : `Kategorie „${category.name}“ wieder aktiviert.`);
  };

  const deleteCategory = async (category: AcademyMaterialCategoryView) => {
    const typedName = window.prompt(
      `Kategorie „${category.name}“ endgültig löschen? Das ist nur möglich, wenn kein Material mehr auf sie verweist. Zum Bestätigen bitte den Namen exakt eingeben:`
    );
    if (typedName === null) return;
    if (typedName.trim() !== category.name) {
      onStatusToast('Der Kategoriename stimmt nicht überein. Es wurde nichts gelöscht.');
      return;
    }
    setBusy(true);
    const response = await apiFetch(
      API_ENDPOINTS.ACADEMY_MATERIAL_CATEGORY(category.id),
      {
        method: 'DELETE',
        body: JSON.stringify({ expectedRevision: category.revision })
      }
    );
    if (!response.ok) {
      onStatusToast(errorMessage(response.error));
      setBusy(false);
      await load();
      return;
    }
    if (editing?.id === category.id) beginCreate();
    await load();
    setBusy(false);
    onStatusToast(`Kategorie „${category.name}“ endgültig gelöscht.`);
  };

  const visibleCategories = categories.filter(category =>
    `${category.name} ${category.description || ''}`.toLocaleLowerCase('de-DE').includes(search.trim().toLocaleLowerCase('de-DE'))
  );

  return (
    <section className="academy-material-taxonomy-manager space-y-5" aria-labelledby="academy-category-heading">
      <header className="academy-material-taxonomy-heading space-y-1">
        <h2 id="academy-category-heading" className="text-xl font-semibold text-slate-900 dark:text-white">Kategorien verwalten</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Kategorien können hier erstellt, umbenannt, archiviert, reaktiviert und – solange kein Material darauf verweist – endgültig gelöscht werden. Die Kennung bleibt bei einer Umbenennung stabil.
        </p>
      </header>

      <div className="academy-material-taxonomy-layout">
        {formOpen ? (
        <form onSubmit={save} className="academy-material-taxonomy-form rounded-lg border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Kategorie bearbeiten' : 'Kategorie hinzufügen'}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kategorien sind globale Bibliotheks-Metadaten und werden nicht als Freitext an jedem Dokument gepflegt.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="academy-category-name" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Kategoriename</label>
            <input
              id="academy-category-name"
              className={inputClass}
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={80}
              required
              aria-invalid={formErrorField === 'name'}
              aria-describedby={formErrorField === 'name' ? 'academy-category-name-hint academy-category-form-error' : 'academy-category-name-hint'}
              disabled={busy}
            />
            <p id="academy-category-name-hint" className="text-xs text-slate-500 dark:text-slate-400">1 bis 80 Zeichen</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="academy-category-description" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Beschreibung (optional)</label>
            <textarea
              id="academy-category-description"
              className={inputClass}
              value={description}
              onChange={event => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              disabled={busy}
              aria-invalid={formErrorField === 'description'}
              aria-describedby={formErrorField === 'description' ? 'academy-category-description-hint academy-category-form-error' : 'academy-category-description-hint'}
            />
            <p id="academy-category-description-hint" className="text-xs text-slate-500 dark:text-slate-400">Bis zu 300 Zeichen</p>
          </div>

          <p id="academy-category-form-error" role="alert" className={formError ? "rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200" : "sr-only"}>{formError}</p>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? 'Speichert …' : editing ? 'Änderungen speichern' : 'Kategorie hinzufügen'}
            </button>
            <button type="button" className={secondaryButton} onClick={cancelEdit} disabled={busy}>Zurück zur Kategorienübersicht</button>
          </div>
        </form>
        ) : (
        <div className="academy-material-taxonomy-list rounded-lg border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Vorhandene Kategorien</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {categories.filter(item => item.status === 'active').length} aktiv · {categories.filter(item => item.status === 'archived').length} archiviert
              </p>
            </div>
            <button type="button" className={primaryButton} onClick={beginCreate} disabled={busy}>Neue Kategorie</button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="academy-category-search" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Kategorien durchsuchen</label>
            <input id="academy-category-search" type="search" className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Name oder Beschreibung" />
          </div>

          <div className={loadError ? "space-y-3" : "sr-only"}>
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
            {loadError ? <button type="button" className={secondaryButton} onClick={() => void load()}>Erneut versuchen</button> : null}
          </div>
          {loading ? (
            <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Kategorien werden geladen …</p>
          ) : loadError ? null : visibleCategories.length === 0 ? (
            <p role="status" className="rounded-md border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              {categories.length === 0 ? 'Noch keine Kategorien angelegt.' : 'Keine Kategorie entspricht deiner Suche.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleCategories.map(category => (
                <li key={category.id} className="academy-material-taxonomy-item py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-slate-900 dark:text-white">{category.name}</span>
                        <span className={category.status === 'active'
                          ? 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200'}>
                          {category.status === 'active' ? 'Aktiv' : 'Archiviert'}
                        </span>
                      </div>
                      {category.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{category.description}</p>}
                    </div>
                    <div className="academy-material-taxonomy-actions flex shrink-0 flex-wrap gap-2">
                      <button type="button" className={secondaryButton} onClick={() => beginEdit(category)} disabled={busy}>Bearbeiten</button>
                      <button type="button" className={secondaryButton} onClick={() => void changeArchiveState(category)} disabled={busy}>
                        {category.status === 'active' ? 'Archivieren' : 'Reaktivieren'}
                      </button>
                      <button type="button" className={dangerButton} onClick={() => void deleteCategory(category)} disabled={busy}>
                        Endgültig löschen
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Archivierte Kategorien bleiben für bestehende Verweise nachvollziehbar und können nicht neuen Materialien zugewiesen werden. Endgültiges Löschen ist nur ohne bestehende Materialzuordnungen möglich; der Server prüft das unmittelbar beim Löschversuch.
      </p>
    </section>
  );
};
