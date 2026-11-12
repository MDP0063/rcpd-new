import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import './AcademyMaterialManagementCenter.css';
import type {
  AcademyMaterialCategoryView,
  AcademyMaterialDocumentTypeView,
  AcademyMaterialDraftDoc,
  AcademyMaterialListItem,
  AcademyMaterialMasterDoc,
  AcademyMaterialVersionDoc,
  AcademyMaterialVersionSummary
} from '../types/academy';
import type { OfficerRole, UserPublicProfile } from '../types/portal';

interface Props {
  currentUser: UserPublicProfile;
  onStatusToast: (message: string) => void;
}
interface MaterialDetailResponse {
  master: AcademyMaterialMasterDoc;
  draft: AcademyMaterialDraftDoc | null;
  currentVersion: AcademyMaterialVersionDoc | null;
  versions: AcademyMaterialVersionSummary[];
  hasMoreVersions?: boolean;
  nextVersionOffset?: number | null;
}

type FormErrors = Partial<Record<
  'title' | 'categoryId' | 'documentTypeId' | 'contentFormat' | 'content' | 'responsibleCourseCode' | 'description' | 'general',
  string
>>;

const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const fieldError = 'border-rose-500 dark:border-rose-500';
const primary = 'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const secondary = 'inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-sky-600';
const danger = 'inline-flex items-center justify-center rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-rose-600';

const roleOptions: Array<{ value: OfficerRole; label: string }> = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'rookie', label: 'Rookie' },
  { value: 'officer', label: 'Officer' },
  { value: 'colonel', label: 'Colonel' },
  { value: 'admin', label: 'Admin' }
];

function messageFor(error?: string): string {
  switch (error) {
    case 'ACADEMY_MATERIAL_TITLE_INVALID': return 'Gib einen Titel mit höchstens 200 Zeichen ein.';
    case 'ACADEMY_MATERIAL_METADATA_REQUIRED': return 'Wähle eine Kategorie und einen Dokumenttyp aus.';
    case 'ACADEMY_MATERIAL_CATEGORY_NOT_ACTIVE': return 'Die ausgewählte Kategorie ist archiviert. Wähle eine aktive Kategorie.';
    case 'ACADEMY_MATERIAL_DOCUMENT_TYPE_NOT_ACTIVE': return 'Der ausgewählte Dokumenttyp ist archiviert. Wähle einen aktiven Dokumenttyp.';
    case 'ACADEMY_MATERIAL_CONTENT_INVALID': return 'Gib Inhalt ein. Er darf höchstens 200.000 Zeichen umfassen.';
    case 'ACADEMY_MATERIAL_FORMAT_INVALID': return 'Wähle Markdown oder Code als Inhaltsformat aus.';
    case 'ACADEMY_MATERIAL_CODE_LANGUAGE_INVALID': return 'Die optionale Sprachkennung darf nur Buchstaben, Zahlen und die Zeichen _ + # . - enthalten.';
    case 'ACADEMY_MATERIAL_DESCRIPTION_INVALID': return 'Die Beschreibung darf höchstens 2.000 Zeichen enthalten.';
    case 'ACADEMY_MATERIAL_SCOPE_FORBIDDEN': return 'Für diese Kurszuständigkeit fehlt dir die erforderliche Berechtigung.';
    case 'ACADEMY_MATERIAL_COURSE_NOT_FOUND': return 'Die angegebene Kurskennung existiert nicht oder der Kurs ist archiviert.';
    case 'ACADEMY_WORKING_REVISION_CONFLICT': return 'Dieser Entwurf wurde zwischenzeitlich geändert. Lade ihn neu, bevor du weiterarbeitest.';
    case 'ACADEMY_MATERIAL_DRAFT_VERSION_MISMATCH': return 'Der gespeicherte Entwurf hat sich geändert. Öffne das Material erneut und prüfe deine Eingaben.';
    case 'ACADEMY_MATERIAL_CODE_ALREADY_EXISTS': return 'Die automatisch erzeugte Materialkennung ist bereits vergeben. Versuche es erneut.';
    case 'ACADEMY_MATERIAL_ARCHIVED': return 'Dieses Material ist archiviert und kann nicht mehr bearbeitet oder veröffentlicht werden.';
    case 'ACADEMY_COURSE_MATERIAL_VERSION_NOT_PUBLISHED': return 'Eine Kursversion darf nur auf vorhandene, veröffentlichte Materialversionen verweisen.';
    default: return error || 'Die Aktion konnte nicht abgeschlossen werden. Prüfe deine Eingaben und versuche es erneut.';
  }
}

function statusLabel(master: AcademyMaterialMasterDoc, draft: Pick<AcademyMaterialDraftDoc, 'workingRevision'> | null): string {
  if (master.publicationStatus === 'archived') return 'Archiviert';
  if (master.publicationStatus === 'draft') return 'Entwurf';
  if (draft && draft.workingRevision > (master.lastPublishedWorkingRevision ?? 0)) return 'Veröffentlicht · neuer Entwurf';
  return 'Veröffentlicht';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

function isGlobalMaterialManager(user: UserPublicProfile): boolean {
  return user.role === 'admin' || user.role === 'colonel';
}

export const AcademyMaterialManagementCenter: React.FC<Props> = ({ currentUser, onStatusToast }) => {
  const globalManager = isGlobalMaterialManager(currentUser);
  const assignedCourseCodes = currentUser.granularPermissions?.assignedCourseCodes || [];
  const canEditAnyAssignedCourse = Boolean(currentUser.granularPermissions?.canGradeAssignedCourses);
  const [materials, setMaterials] = useState<AcademyMaterialListItem[]>([]);
  const [categories, setCategories] = useState<AcademyMaterialCategoryView[]>([]);
  const [documentTypes, setDocumentTypes] = useState<AcademyMaterialDocumentTypeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [editingMaster, setEditingMaster] = useState<AcademyMaterialMasterDoc | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<AcademyMaterialDraftDoc | null>(null);
  const [currentVersion, setCurrentVersion] = useState<AcademyMaterialVersionDoc | null>(null);
  const [versions, setVersions] = useState<AcademyMaterialVersionSummary[]>([]);
  const [hasMoreVersions, setHasMoreVersions] = useState(false);
  const [nextVersionOffset, setNextVersionOffset] = useState<number | null>(null);
  const [loadingMoreVersions, setLoadingMoreVersions] = useState(false);
  const [responsibleCourseCode, setResponsibleCourseCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [requiredRole, setRequiredRole] = useState<'' | OfficerRole>('');
  const [contentFormat, setContentFormat] = useState<'markdown' | 'code'>('markdown');
  const [content, setContent] = useState('');
  const [contentPreview, setContentPreview] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formDirty, setFormDirty] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const versionHistoryMaterialIdRef = useRef<string | null>(null);

  const loadCatalogsAndMaterials = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const [materialResponse, categoryResponse, typeResponse] = await Promise.all([
      apiFetch<{ materials: AcademyMaterialListItem[] }>(API_ENDPOINTS.ACADEMY_MATERIALS),
      apiFetch<{ categories: AcademyMaterialCategoryView[] }>(API_ENDPOINTS.ACADEMY_MATERIAL_CATEGORIES),
      apiFetch<{ documentTypes: AcademyMaterialDocumentTypeView[] }>(API_ENDPOINTS.ACADEMY_MATERIAL_DOCUMENT_TYPES)
    ]);
    if (!materialResponse.ok || !materialResponse.data ||
        !categoryResponse.ok || !categoryResponse.data ||
        !typeResponse.ok || !typeResponse.data) {
      setLoadError(messageFor(materialResponse.error || categoryResponse.error || typeResponse.error));
      setLoading(false);
      return;
    }
    setMaterials(materialResponse.data.materials);
    setCategories(categoryResponse.data.categories);
    setDocumentTypes(typeResponse.data.documentTypes);
    setLoading(false);
  }, []);

  useEffect(() => { void loadCatalogsAndMaterials(); }, [loadCatalogsAndMaterials]);
  useEffect(() => {
    if (Object.keys(errors).length > 0) errorSummaryRef.current?.focus();
  }, [errors]);

  const resetEditor = () => {
    setEditingMaster(null);
    setDraft(null);
    setCurrentVersion(null);
    setVersions([]);
    versionHistoryMaterialIdRef.current = null;
    setHasMoreVersions(false); setNextVersionOffset(null); setLoadingMoreVersions(false);
    setResponsibleCourseCode('');
    setTitle('');
    setDescription('');
    setCategoryId('');
    setDocumentTypeId('');
    setRequiredRole('');
    setContentFormat('markdown');
    setContent('');
    setContentPreview(false);
    setCodeLanguage('');
    setErrors({});
    setFormDirty(false);
  };

  const startNew = () => {
    if (formDirty && !window.confirm('Ungespeicherte Änderungen verwerfen und ein neues Material beginnen?')) return;
    resetEditor();
    setIsEditorOpen(true);
  };


  const loadMoreVersions = async () => {
    if (!editingMaster || nextVersionOffset === null || loadingMoreVersions || versionHistoryMaterialIdRef.current !== editingMaster.id) return;
    const materialId = editingMaster.id;
    setLoadingMoreVersions(true);
    const response = await apiFetch<Pick<MaterialDetailResponse, 'versions' | 'hasMoreVersions' | 'nextVersionOffset'>>(API_ENDPOINTS.ACADEMY_MATERIAL(materialId) + '?offset=' + nextVersionOffset);
    if (versionHistoryMaterialIdRef.current !== materialId) return;
    setLoadingMoreVersions(false);
    if (!response.ok || !response.data) { onStatusToast(messageFor(response.error)); return; }
    setVersions(items => [...items, ...response.data!.versions.filter(version => !items.some(existing => existing.id === version.id))]);
    setHasMoreVersions(Boolean(response.data.hasMoreVersions)); setNextVersionOffset(response.data.nextVersionOffset ?? null);
  };

  const openMaterial = async (materialId: string) => {
    if (formDirty && !window.confirm('Ungespeicherte Änderungen verwerfen und ein anderes Material öffnen?')) return;
    setBusy(true);
    versionHistoryMaterialIdRef.current = null;
    const response = await apiFetch<MaterialDetailResponse>(API_ENDPOINTS.ACADEMY_MATERIAL(materialId));
    if (!response.ok || !response.data) {
      versionHistoryMaterialIdRef.current = editingMaster?.id ?? null;
      setLoadingMoreVersions(false);
      onStatusToast(messageFor(response.error));
      setBusy(false);
      return;
    }
    const { master, draft: loadedDraft, currentVersion: loadedCurrent, versions: loadedVersions } = response.data;
    versionHistoryMaterialIdRef.current = master.id;
    setEditingMaster(master);
    setIsEditorOpen(true);
    setDraft(loadedDraft);
    setCurrentVersion(loadedCurrent);
    setVersions(loadedVersions);
    setHasMoreVersions(Boolean(response.data.hasMoreVersions)); setNextVersionOffset(response.data.nextVersionOffset ?? null); setLoadingMoreVersions(false);
    setResponsibleCourseCode(master.responsibleCourseCode || '');
    setTitle(loadedDraft?.title || loadedCurrent?.title || '');
    setDescription(loadedDraft?.description || '');
    setCategoryId(loadedDraft?.categoryId || loadedCurrent?.categoryId || '');
    setDocumentTypeId(loadedDraft?.documentTypeId || loadedCurrent?.documentTypeId || '');
    setRequiredRole(loadedDraft?.requiredRole || loadedCurrent?.requiredRole || '');
    setContentFormat(loadedDraft?.contentFormat || loadedCurrent?.contentFormat || 'markdown');
    setContent(loadedDraft?.content ?? loadedCurrent?.content ?? '');
    setCodeLanguage(loadedDraft?.codeLanguage || loadedCurrent?.codeLanguage || '');
    setErrors({});
    setFormDirty(false);
    setBusy(false);
  };

  const filteredMaterials = useMemo(() => materials.filter(item => {
    const query = search.trim().toLocaleLowerCase('de-DE');
    if (!query) return true;
    const categoryId = item.draft?.categoryId || '';
    const documentTypeId = item.draft?.documentTypeId || '';
    return [
      item.master.code,
      item.master.responsibleCourseCode || '',
      item.draft?.title || '',
      item.currentVersion?.title || '',
      categories.find(category => category.id === categoryId)?.name || '',
      documentTypes.find(type => type.id === documentTypeId)?.name || '',
      statusLabel(item.master, item.draft)
    ].some(value => value.toLocaleLowerCase('de-DE').includes(query));
  }), [materials, search, categories, documentTypes]);

  const hasUnpublishedChanges = Boolean(
    editingMaster && draft && editingMaster.publicationStatus !== 'archived' &&
    draft.workingRevision > (editingMaster.lastPublishedWorkingRevision ?? 0)
  );

  const validateForm = (): FormErrors => {
    const next: FormErrors = {};
    if (!title.trim()) next.title = 'Gib einen Materialtitel ein.';
    else if (title.trim().length > 200) next.title = 'Der Titel darf höchstens 200 Zeichen enthalten.';
    if (!categoryId) next.categoryId = 'Wähle eine Kategorie aus.';
    if (!documentTypeId) next.documentTypeId = 'Wähle einen Dokumenttyp aus.';
    if (!content.trim()) next.content = 'Gib den Materialinhalt ein.';
    else if (content.length > 200000) next.content = 'Der Inhalt darf höchstens 200.000 Zeichen umfassen.';
    if (!globalManager && !responsibleCourseCode.trim()) {
      next.responsibleCourseCode = 'Wähle eine Kurszuständigkeit aus.';
    }
    if (description.length > 2000) next.description = 'Die Beschreibung darf höchstens 2.000 Zeichen enthalten.';
    if (contentFormat === 'code' && codeLanguage.trim() &&
        !/^[A-Za-z0-9_+#.-]{1,40}$/.test(codeLanguage.trim())) {
      next.general = 'Die Sprachkennung enthält nicht unterstützte Zeichen oder ist zu lang.';
    }
    return next;
  };

  const buildDraftBody = () => ({
    title,
    description: description.trim(),
    categoryId,
    documentTypeId,
    ...(requiredRole ? { requiredRole } : {}),
    contentFormat,
    content,
    ...(contentFormat === 'code' && codeLanguage.trim() ? { codeLanguage: codeLanguage.trim() } : {})
  });

  const saveDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (editingMaster && editingMaster.publicationStatus === 'archived') {
      setErrors({ general: 'Archivierte Materialien können nicht bearbeitet werden.' });
      return;
    }
    setBusy(true);
    const response = editingMaster && draft
      ? await apiFetch<{ draft: AcademyMaterialDraftDoc }>(
          API_ENDPOINTS.ACADEMY_MATERIAL_DRAFT(editingMaster.id),
          {
            method: 'PUT',
            body: JSON.stringify({
              expectedRevision: draft.workingRevision,
              draft: buildDraftBody()
            })
          }
        )
      : await apiFetch<{ master: AcademyMaterialMasterDoc; draft: AcademyMaterialDraftDoc }>(
          API_ENDPOINTS.ACADEMY_MATERIALS,
          {
            method: 'POST',
            body: JSON.stringify({
              ...buildDraftBody(),
              ...(responsibleCourseCode.trim() ? { responsibleCourseCode: responsibleCourseCode.trim() } : {})
            })
          }
        );
    if (!response.ok || !response.data) {
      setErrors({ general: messageFor(response.error) });
      setBusy(false);
      return;
    }
    if (editingMaster && draft) {
      const saved = response.data as { draft: AcademyMaterialDraftDoc };
      const savedDraft = saved.draft;
      setDraft(savedDraft);
      setEditingMaster(current => current ? { ...current, workingRevision: savedDraft.workingRevision, updatedIso: savedDraft.updatedIso } : current);
      setFormDirty(false);
    } else {
      const created = response.data as { master: AcademyMaterialMasterDoc; draft: AcademyMaterialDraftDoc };
      setEditingMaster(created.master);
      setDraft(created.draft);
      setFormDirty(false);
      setCurrentVersion(null);
      setVersions([]);
    }
    await loadCatalogsAndMaterials();
    setBusy(false);
    onStatusToast('Entwurf wurde gespeichert. Er ist noch nicht veröffentlicht.');
  };

  const publishDraft = async () => {
    if (!editingMaster || !draft || !hasUnpublishedChanges || busy) return;
    const confirmed = window.confirm(
      'Material „' + editingMaster.code + ' – ' + title.trim() + '“, Version ' +
      (editingMaster.latestVersionNumber + 1) +
      ' jetzt veröffentlichen? Die neue Fassung wird im Bibliotheksbestand verfügbar. Bereits veröffentlichte Kursversionen behalten ihre bisherigen Materialreferenzen.'
    );
    if (!confirmed) return;
    setBusy(true);
    const response = await apiFetch<{ master: AcademyMaterialMasterDoc; version: AcademyMaterialVersionDoc }>(
      API_ENDPOINTS.ACADEMY_MATERIAL_PUBLISH(editingMaster.id),
      { method: 'POST', body: JSON.stringify({ expectedRevision: draft.workingRevision }) }
    );
    if (!response.ok || !response.data) {
      onStatusToast(messageFor(response.error));
      setBusy(false);
      return;
    }
    setEditingMaster(response.data.master);
    setCurrentVersion(response.data.version);
    setDraft(current => current ? { ...current } : current);
    setFormDirty(false);
    await loadCatalogsAndMaterials();
    setBusy(false);
    onStatusToast('Materialversion ' + response.data.version.versionNumber + ' wurde veröffentlicht.');
  };

  const archiveMaterial = async () => {
    if (!editingMaster || !globalManager || editingMaster.publicationStatus === 'archived' || busy) return;
    const reason = window.prompt(
      'Warum wird „' + editingMaster.code + ' – ' + (title || editingMaster.code) + '“ archiviert? Bitte mindestens 10 Zeichen eingeben.'
    );
    if (reason === null) return;
    if (reason.trim().length < 10) {
      onStatusToast('Die Begründung muss mindestens 10 Zeichen enthalten. Das Material wurde nicht archiviert.');
      return;
    }
    const confirmed = window.confirm('Material „' + editingMaster.code + '“ endgültig archivieren? Die veröffentlichten Versionen und historischen Kursreferenzen bleiben erhalten.');
    if (!confirmed) return;
    setBusy(true);
    const response = await apiFetch<{ master: AcademyMaterialMasterDoc }>(
      API_ENDPOINTS.ACADEMY_MATERIAL_ARCHIVE(editingMaster.id),
      {
        method: 'POST',
        body: JSON.stringify({ expectedRevision: editingMaster.workingRevision, reason: reason.trim() })
      }
    );
    if (!response.ok || !response.data) {
      onStatusToast(messageFor(response.error));
      setBusy(false);
      return;
    }
    setEditingMaster(response.data.master);
    await loadCatalogsAndMaterials();
    setBusy(false);
    onStatusToast('Material wurde archiviert. Historische Versionen bleiben erhalten.');
  };

  const isScopedInstructor = !globalManager && canEditAnyAssignedCourse;
  const activeCategories = categories.filter(item =>
    item.status === 'active' || (editingMaster && item.id === categoryId)
  );
  const activeTypes = documentTypes.filter(item =>
    item.status === 'active' || (editingMaster && item.id === documentTypeId)
  );
  const courseOptions = assignedCourseCodes.filter(code => code !== '*');

  return (
    <section className="academy-material-management space-y-5" aria-labelledby="academy-material-management-heading">
      <header className="academy-material-management-heading space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="academy-material-management-heading" className="text-xl font-semibold text-slate-900 dark:text-white">Materialverwaltung</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Hier pflegst du Materialien zentral: Entwürfe vorbereiten, veröffentlichte Fassungen nachvollziehen und Änderungen bewusst freigeben. Text und Markdown sowie Quelltext werden unterstützt.
            </p>
          </div>
          {!isEditorOpen && <button type="button" className={primary} onClick={startNew} disabled={busy}>Neues Material anlegen</button>}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Kennungen und Versionsnummern werden automatisch vergeben. Kategorie und Dokumenttyp sind erforderlich. Beschreibung und erforderlicher Rang sind optional.
        </p>
      </header>

      {Object.keys(errors).length > 0 && (
        <div ref={errorSummaryRef} tabIndex={-1}
          className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <div role="alert" aria-labelledby="academy-material-error-heading">
            <h3 id="academy-material-error-heading" className="font-semibold">Bitte prüfe folgende Angaben</h3>
            <p className="mt-1">Korrigiere die aufgeführten Felder, bevor du den Entwurf speicherst.</p>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {Object.entries(errors).map(([key, message]) => (
              <li key={key}>
                <a className="underline" href={'#academy-material-' + key}>{message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <p role="alert">{loadError}</p>
          <button type="button" className={secondary + ' mt-3'} onClick={() => void loadCatalogsAndMaterials()}>Erneut versuchen</button>
        </div>
      )}

      <div className="academy-material-management-workspace grid grid-cols-1 gap-5">
        {!isEditorOpen && <aside className="academy-material-list rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-label="Materialliste">
          <div className="flex items-center justify-between gap-3">
            <h3 className="academy-material-list-title font-semibold text-slate-900 dark:text-white">Vorhandene Materialien</h3>
            <span aria-hidden="true" className="text-xs text-slate-500 dark:text-slate-400">{filteredMaterials.length}</span>
          </div>
          <p className="sr-only" role="status" aria-atomic="true">
            {loading
              ? 'Materialien werden geladen.'
              : loadError
                ? ''
                : filteredMaterials.length === 0
                  ? materials.length === 0 ? 'Noch keine Materialien angelegt.' : 'Keine Materialien entsprechen deiner Suche.'
                  : filteredMaterials.length + (filteredMaterials.length === 1 ? ' Material gefunden.' : ' Materialien gefunden.')}
          </p>
          <label htmlFor="academy-material-search" className="mt-3 block text-sm font-medium text-slate-800 dark:text-slate-200">Materialien durchsuchen</label>
          <input id="academy-material-search" type="search" className={field + ' academy-material-search-input mt-1'} value={search} onChange={event => setSearch(event.target.value)} placeholder="Titel, Kennung oder Kurs" />
          {loadError ? null : loading ? (
            <p className="py-5 text-sm text-slate-600 dark:text-slate-300">Materialien werden geladen …</p>
          ) : filteredMaterials.length === 0 ? (
            <p className="py-5 text-sm text-slate-600 dark:text-slate-300">{materials.length === 0 ? 'Noch keine Materialien angelegt.' : 'Keine Materialien entsprechen deiner Suche.'}</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
              {filteredMaterials.map(item => (
                <li key={item.master.id} className="academy-material-list-entry py-3 first:pt-0 last:pb-0">
                  <button type="button" aria-pressed={editingMaster?.id === item.master.id} className="academy-material-list-button w-full rounded-md p-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:hover:bg-slate-800"
                    onClick={() => void openMaterial(item.master.id)} disabled={busy}>
                    <span className="block break-all text-xs font-semibold text-slate-500 dark:text-slate-400">{item.master.code}</span>
                    <span className="mt-1 block text-sm font-medium text-slate-900 dark:text-white">
                      {item.draft?.title || item.currentVersion?.title || 'Ohne Titel'}
                    </span>
                    <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                      {statusLabel(item.master, item.draft)}
                      {item.currentVersion ? ' · Version ' + item.currentVersion.versionNumber : ''}
                    </span>
                    {item.master.responsibleCourseCode && (
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Zuständig: {item.master.responsibleCourseCode}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>}

        {isEditorOpen && <div className="academy-material-management-main space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Materialverwaltung</p><h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editingMaster ? title || editingMaster.code : "Neues Material"}</h3></div>
            <button type="button" className={secondary} onClick={() => { if (formDirty && !window.confirm("Ungespeicherte Änderungen verwerfen und zur Materialübersicht zurückkehren?")) return; resetEditor(); setIsEditorOpen(false); }} disabled={busy}>Zur Materialübersicht</button>
          </div>
          {editingMaster && (
            <div className="academy-material-meta rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{editingMaster.code}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {statusLabel(editingMaster, draft)} · Arbeitsrevision {draft?.workingRevision ?? editingMaster.workingRevision}
                    {editingMaster.latestVersionNumber > 0 ? ' · letzte veröffentlichte Version ' + editingMaster.latestVersionNumber : ''}
                  </p>
                </div>
                <button type="button" className={secondary} onClick={startNew} disabled={busy}>Neues Material beginnen</button>
              </div>
              {versions.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Versionshistorie</p>
                  <ul className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                    {versions.map(version => (
                      <li key={version.id} className="min-w-0 break-words">v{version.versionNumber} · {version.title} · {formatDate(version.publishedIso)}</li>
                    ))}
                  </ul>
                  {hasMoreVersions && <button type="button" className={secondary + ' mt-3'} onClick={loadMoreVersions} disabled={loadingMoreVersions}>{loadingMoreVersions ? 'Weitere Versionen werden geladen …' : 'Ältere Versionen laden'}</button>}
                </div>
              )}
            </div>
          )}

          <form className="academy-material-form rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            onSubmit={saveDraft} aria-labelledby="academy-material-form-heading">
            <div className="mb-4">
              <h3 id="academy-material-form-heading" className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingMaster ? 'Materialentwurf bearbeiten' : 'Neues Material anlegen'}
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {editingMaster ? 'Änderungen werden als Arbeitsentwurf gespeichert. Eine veröffentlichte Fassung bleibt unverändert.' : 'Das Speichern legt zunächst nur einen Entwurf an.'}
              </p>
            </div>

            <div className="academy-material-form-section"><h4>Grunddaten und Zuordnung</h4><p>Lege fest, wie das Material heißt, eingeordnet und welchem Kurs es zugeordnet wird.</p></div>
            <div className="academy-material-form-fields grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="academy-material-title" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Titel <span className="text-rose-600">*</span></label>
                <input id="academy-material-title" className={field + (errors.title ? ' ' + fieldError : '')} value={title}
                  onChange={event => { setTitle(event.target.value); setFormDirty(true); }}
                  maxLength={200} required disabled={busy || editingMaster?.publicationStatus === 'archived'}
                  aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'academy-material-title-error' : undefined} />
                {errors.title && <p id="academy-material-title-error" className="text-xs text-rose-700 dark:text-rose-300">{errors.title}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="academy-material-course" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                  Kurszuständigkeit {globalManager ? '(optional)' : <span className="text-rose-600">*</span>}
                </label>
                {isScopedInstructor && courseOptions.length > 0 ? (
                  <select id="academy-material-course" className={field + (errors.responsibleCourseCode ? ' ' + fieldError : '')}
                    value={responsibleCourseCode} onChange={event => { setResponsibleCourseCode(event.target.value); setFormDirty(true); }}
                    required disabled={busy || Boolean(editingMaster)}>
                    <option value="">Kurs auswählen</option>
                    {courseOptions.map(code => <option key={code} value={code}>{code}</option>)}
                  </select>
                ) : (
                  <input id="academy-material-course" className={field + (errors.responsibleCourseCode ? ' ' + fieldError : '')}
                    value={responsibleCourseCode} onChange={event => { setResponsibleCourseCode(event.target.value.toUpperCase()); setFormDirty(true); }}
                    placeholder="z. B. FTO-01" maxLength={40} required={!globalManager}
                    disabled={busy || Boolean(editingMaster)} />
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">Diese Zuordnung steuert delegierte Bearbeitungsrechte. Sie ist unabhängig von der automatisch vergebenen Materialkennung.</p>
                {errors.responsibleCourseCode && <p className="text-xs text-rose-700 dark:text-rose-300">{errors.responsibleCourseCode}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="academy-material-category" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Kategorie <span className="text-rose-600">*</span></label>
                <select id="academy-material-category" className={field + (errors.categoryId ? ' ' + fieldError : '')}
                  value={categoryId} onChange={event => { setCategoryId(event.target.value); setFormDirty(true); }}
                  required disabled={busy || editingMaster?.publicationStatus === 'archived'}
                  aria-invalid={Boolean(errors.categoryId)} aria-describedby={errors.categoryId ? 'academy-material-category-error' : undefined}>
                  <option value="">Kategorie auswählen</option>
                  {activeCategories.map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'archived' ? ' (archiviert – bestehende Zuordnung)' : ''}</option>)}
                </select>
                {errors.categoryId && <p id="academy-material-category-error" className="text-xs text-rose-700 dark:text-rose-300">{errors.categoryId}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="academy-material-document-type" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Dokumenttyp <span className="text-rose-600">*</span></label>
                <select id="academy-material-document-type" className={field + (errors.documentTypeId ? ' ' + fieldError : '')}
                  value={documentTypeId} onChange={event => { setDocumentTypeId(event.target.value); setFormDirty(true); }}
                  required disabled={busy || editingMaster?.publicationStatus === 'archived'}
                  aria-invalid={Boolean(errors.documentTypeId)} aria-describedby={errors.documentTypeId ? 'academy-material-document-type-error' : undefined}>
                  <option value="">Dokumenttyp auswählen</option>
                  {activeTypes.map(item => <option key={item.id} value={item.id}>{item.name}{item.status === 'archived' ? ' (archiviert – bestehende Zuordnung)' : ''}</option>)}
                </select>
                {errors.documentTypeId && <p id="academy-material-document-type-error" className="text-xs text-rose-700 dark:text-rose-300">{errors.documentTypeId}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="academy-material-role" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Erforderliche Portalrolle (optional)</label>
                <select id="academy-material-role" className={field} value={requiredRole}
                  onChange={event => { setRequiredRole(event.target.value as '' | OfficerRole); setFormDirty(true); }}
                  disabled={busy || editingMaster?.publicationStatus === 'archived'}>
                  <option value="">Keine zusätzliche Rangbeschränkung</option>
                  {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label htmlFor="academy-material-description" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Beschreibung (optional)</label>
                <textarea id="academy-material-description" className={field} value={description}
                  onChange={event => { setDescription(event.target.value); setFormDirty(true); }}
                  rows={2} maxLength={2000} disabled={busy || editingMaster?.publicationStatus === 'archived'} />
                {errors.description && <p className="text-xs text-rose-700 dark:text-rose-300">{errors.description}</p>}
              </div>
              <div className="academy-material-form-section md:col-span-2"><h4>Inhalt und Darstellung</h4><p>Wähle das Format und pflege den eigentlichen Lerninhalt. Die Vorschau dient nur der Kontrolle und führt keinen Code aus.</p></div>
              <div className="space-y-1.5">
                <label htmlFor="academy-material-format" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Inhaltsformat <span className="text-rose-600">*</span></label>
                <select id="academy-material-format" className={field} value={contentFormat}
                  onChange={event => { setContentFormat(event.target.value as 'markdown' | 'code'); setContentPreview(false); setFormDirty(true); }}
                  disabled={busy || editingMaster?.publicationStatus === 'archived'}>
                  <option value="markdown">Text / Markdown</option>
                  <option value="code">Code (Quelltext)</option>
                </select>
              </div>
              {contentFormat === 'code' && (
                <div className="space-y-1.5">
                  <label htmlFor="academy-material-code-language" className="block text-sm font-medium text-slate-800 dark:text-slate-200">Programmiersprache (optional)</label>
                  <input id="academy-material-code-language" className={field} value={codeLanguage}
                    onChange={event => { setCodeLanguage(event.target.value); setFormDirty(true); }}
                    placeholder="z. B. typescript" maxLength={40} disabled={busy || editingMaster?.publicationStatus === 'archived'} />
                </div>
              )}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="academy-material-content" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                    {contentFormat === 'code' ? 'Quelltext' : 'Inhalt (Markdown)'} <span className="text-rose-600">*</span>
                  </label>
                  <div className="academy-material-content-view" role="group" aria-label="Inhaltsansicht">
                    <button type="button" className={contentPreview ? '' : 'is-active'} aria-pressed={!contentPreview} onClick={() => setContentPreview(false)}>Bearbeiten</button>
                    <button type="button" className={contentPreview ? 'is-active' : ''} aria-pressed={contentPreview} onClick={() => setContentPreview(true)}>Vorschau</button>
                  </div>
                </div>
                <textarea id="academy-material-content"
                  className={field + ' min-h-[22rem] resize-y font-mono text-sm leading-6' + (contentPreview ? ' hidden' : '')}
                  value={content} onChange={event => { setContent(event.target.value); setFormDirty(true); }}
                  rows={18} required={!contentPreview} disabled={busy || editingMaster?.publicationStatus === 'archived'}
                  aria-invalid={Boolean(errors.content)} aria-describedby={errors.content ? 'academy-material-content-error academy-material-content-hint' : 'academy-material-content-hint'} />
                {contentPreview && (
                  <div className="academy-material-content-preview min-h-[22rem]" aria-label="Vorschau des Materialinhalts">
                    {!content.trim() ? <p className="text-sm text-slate-500">Noch kein Inhalt vorhanden.</p> : contentFormat === 'code'
                      ? <pre><code>{content}</code></pre>
                      : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>}
                  </div>
                )}
                <p id="academy-material-content-hint" className="text-xs text-slate-500 dark:text-slate-400">
                  Maximal 200.000 Zeichen. {contentFormat === 'code' ? 'Quelltext wird nur angezeigt und niemals im Portal ausgeführt.' : 'Die Vorschau verwendet eine sichere Markdown-Darstellung.'}
                </p>
                {errors.content && <p id="academy-material-content-error" className="text-xs text-rose-700 dark:text-rose-300">{errors.content}</p>}
              </div>
              {errors.general && <p id="academy-material-general" className="md:col-span-2 text-sm text-rose-700 dark:text-rose-300" role="alert">{errors.general}</p>}
            </div>

            <div className="academy-material-form-actions mt-5">
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" className={primary}
                  disabled={busy || editingMaster?.publicationStatus === 'archived' || (Boolean(editingMaster) && !formDirty)}>
                  {busy ? 'Speichert …' : 'Entwurf speichern'}
                </button>
                {editingMaster && (
                  <button type="button" className={secondary} onClick={() => void publishDraft()}
                    disabled={busy || editingMaster.publicationStatus === 'archived' || !hasUnpublishedChanges || formDirty}>
                    {busy ? 'Wird verarbeitet …' : 'Entwurf veröffentlichen'}
                  </button>
                )}
                {formDirty && <button type="button" className="academy-material-tertiary-action" onClick={() => editingMaster ? void openMaterial(editingMaster.id) : resetEditor()} disabled={busy}>Änderungen verwerfen</button>}
              </div>
              {editingMaster && globalManager && editingMaster.publicationStatus !== 'archived' && (
                <div className="academy-material-form-destructive-actions">
                  <div><strong>Material stilllegen</strong><p>Das Material wird archiviert und nicht mehr neu angeboten. Historische Kursreferenzen bleiben erhalten.</p></div>
                  <button type="button" className={danger} onClick={() => void archiveMaterial()} disabled={busy || formDirty}>Material archivieren</button>
                </div>
              )}
            </div>
            {editingMaster && !hasUnpublishedChanges && editingMaster.publicationStatus === 'published' && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Es gibt keine unveröffentlichte Änderung. Bearbeite und speichere den Entwurf, bevor du eine neue Version veröffentlichen kannst.</p>
            )}
            {editingMaster && editingMaster.publicationStatus === 'archived' && (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Dieses Material ist archiviert. Seine veröffentlichten Versionen und historischen Kursreferenzen bleiben erhalten.</p>
            )}
          </form>

          {currentVersion && (
            <section className="academy-material-current-version rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="academy-material-current-version-heading">
              <h3 id="academy-material-current-version-heading" className="font-semibold text-slate-900 dark:text-white">Aktuell veröffentlichte Fassung · Version {currentVersion.versionNumber}</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Veröffentlicht am {formatDate(currentVersion.publishedIso)} · Versionskennung {currentVersion.id}</p>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-800 dark:bg-slate-950 dark:text-slate-200">{currentVersion.content}</pre>
            </section>
          )}
        </div>}
      </div>
    </section>
  );
};
