import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyPrivateNoteDoc, AcademyPrivateNoteSource, AcademyPrivateNoteTextAnchor } from '../types/academy';

interface Props {
  materialId: string;
  materialVersionId: string;
  selectedAnchor?: AcademyPrivateNoteTextAnchor | null;
  onJumpToAnchor?: (anchor: AcademyPrivateNoteTextAnchor) => 'resolved' | 'missing' | 'ambiguous';
}

type NoteDraft = {
  id: string;
  title: string;
  content: string;
  tags: string[];
};

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

const panel = 'rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950';
const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const secondary = 'inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
const primary = 'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';

function serializeDraft(draft: NoteDraft): string {
  return JSON.stringify([draft.id, draft.title, draft.content, draft.tags]);
}

function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 20).map(tag => tag.slice(0, 40));
}

function noteSources(note: AcademyPrivateNoteDoc): AcademyPrivateNoteSource[] {
  return note.sources?.length
    ? note.sources
    : [{ materialId: note.materialId, materialVersionId: note.materialVersionId }];
}

function noteReferencesMaterial(note: AcademyPrivateNoteDoc, materialId: string, materialVersionId: string): boolean {
  return noteSources(note).some(source =>
    source.materialId === materialId && source.materialVersionId === materialVersionId
  );
}

const markdownComponents = {
  h1: ({ children, node: _node, ...props }: any) => <h1 {...props} className="my-4 text-xl font-bold text-slate-900 dark:text-white">{children}</h1>,
  h2: ({ children, node: _node, ...props }: any) => <h2 {...props} className="my-3 text-lg font-semibold text-slate-900 dark:text-white">{children}</h2>,
  h3: ({ children, node: _node, ...props }: any) => <h3 {...props} className="my-3 text-base font-semibold text-slate-900 dark:text-white">{children}</h3>,
  p: ({ children, node: _node, ...props }: any) => <p {...props} className="my-2 leading-6 text-slate-800 dark:text-slate-200">{children}</p>,
  ul: ({ children, node: _node, ...props }: any) => <ul {...props} className="my-2 list-disc space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ul>,
  ol: ({ children, node: _node, ...props }: any) => <ol {...props} className="my-2 list-decimal space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ol>,
  blockquote: ({ children, node: _node, ...props }: any) => <blockquote {...props} className="my-3 border-l-4 border-slate-300 pl-3 text-slate-600 dark:border-slate-700 dark:text-slate-300">{children}</blockquote>,
  a: ({ children, href, node: _node, ...props }: any) => <a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline dark:text-sky-300">{children}</a>,
  code: ({ children, node: _node, ...props }: any) => <code {...props} className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-800">{children}</code>,
  img: ({ alt }: any) => <span className="text-xs text-slate-500 dark:text-slate-400">Externe Bilder sind in privaten Notizen deaktiviert{alt ? ' (' + alt + ')' : ''}.</span>
} satisfies Components;

export const AcademyMaterialReaderNotes: React.FC<Props> = ({ materialId, materialVersionId, selectedAnchor, onJumpToAnchor }) => {
  const [notes, setNotes] = useState<AcademyPrivateNoteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadRetryable, setLoadRetryable] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [linkNoteSearch, setLinkNoteSearch] = useState('');
  const [anchorNotice, setAnchorNotice] = useState('');
  const saveDebounceTimerRef = useRef<number | null>(null);
  const revisionByIdRef = useRef(new Map<string, number>());
  const draftsBySourceRef = useRef(new Map<string, NoteDraft>());
  const sourceKey = JSON.stringify([materialId, materialVersionId]);
  const pendingSaveRef = useRef<NoteDraft | null>(null);
  const savingRef = useRef(false);
  const savingDraftIdRef = useRef<string | null>(null);
  const saveErrorsByIdRef = useRef(new Map<string, string>());
  const lastSavedRef = useRef('');
  const currentDraftRef = useRef<NoteDraft | null>(null);
  const persistPendingRef = useRef<() => Promise<void>>(async () => {});

  const linkedNotes = useMemo(
    () => notes.filter(note => noteReferencesMaterial(note, materialId, materialVersionId)),
    [notes, materialId, materialVersionId]
  );
  const unlinkedNotes = useMemo(
    () => notes.filter(note => note.kind === 'note' && !noteReferencesMaterial(note, materialId, materialVersionId)),
    [notes, materialId, materialVersionId]
  );
  const linkableNotes = useMemo(() => {
    const query = linkNoteSearch.trim().toLocaleLowerCase('de-DE');
    const matches = query
      ? unlinkedNotes.filter(note => [note.title || '', note.content || '', ...note.tags]
          .some(value => value.toLocaleLowerCase('de-DE').includes(query)))
      : unlinkedNotes;
    return matches.slice(0, 10);
  }, [unlinkedNotes, linkNoteSearch]);
  const selectedNote = useMemo(
    () => linkedNotes.find(note => note.id === selectedNoteId && note.kind === 'note') ?? null,
    [linkedNotes, selectedNoteId]
  );
  const bookmarks = useMemo(
    () => linkedNotes.filter(note => note.kind === 'bookmark'),
    [linkedNotes]
  );

  const persistPending = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    let resumePendingAfterRequest = true;
    try {
      while (pendingSaveRef.current) {
        const draft = pendingSaveRef.current;
        pendingSaveRef.current = null;
        const expectedRevision = revisionByIdRef.current.get(draft.id) ?? 1;
        savingDraftIdRef.current = draft.id;
        if (currentDraftRef.current?.id === draft.id) setSaveStatus('saving');
        const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(
          API_ENDPOINTS.ACADEMY_NOTES + '/' + encodeURIComponent(draft.id),
          {
            method: 'PUT',
            body: JSON.stringify({
              expectedRevision,
              title: draft.title,
              content: draft.content,
              tags: draft.tags
            })
          }
        );
        savingDraftIdRef.current = null;
        if (!response.ok || !response.data) {
          const message = response.status === 409
            ? 'Diese Notiz wurde zwischenzeitlich geändert. Lade die aktuelle Fassung neu, bevor du weiterarbeitest.'
            : response.error || 'Die Notiz konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten.';
          saveErrorsByIdRef.current.set(draft.id, message);
          const pendingDraft = pendingSaveRef.current || draft;
          pendingSaveRef.current = pendingDraft;
          resumePendingAfterRequest = pendingDraft.id !== draft.id;
          if (currentDraftRef.current?.id === draft.id) {
            setSaveStatus('error');
            setSaveError(message);
          }
          return;
        }
        const saved = response.data.note;
        saveErrorsByIdRef.current.delete(saved.id);
        revisionByIdRef.current.set(saved.id, saved.revision ?? expectedRevision + 1);
        setNotes(previous => previous.map(note => note.id === saved.id ? saved : note));
        const savedSnapshot = serializeDraft(draft);
        if (currentDraftRef.current?.id === draft.id &&
            serializeDraft(currentDraftRef.current) === savedSnapshot) {
          lastSavedRef.current = savedSnapshot;
          setSaveStatus('saved');
          setSaveError('');
        } else if (currentDraftRef.current?.id === draft.id) {
          pendingSaveRef.current = currentDraftRef.current;
        }
      }
    } finally {
      savingDraftIdRef.current = null;
      savingRef.current = false;
      if (resumePendingAfterRequest && pendingSaveRef.current) void persistPendingRef.current();
    }
  }, []);

  persistPendingRef.current = persistPending;

  const queueSave = useCallback((draft: NoteDraft) => {
    pendingSaveRef.current = draft;
    void persistPending();
  }, [persistPending]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotesLoaded(false);
    setLoadError('');
    setLoadRetryable(false);
    setSaveStatus('saved');
    setSaveError('');
    setNotes([]);
    setSelectedNoteId('');
    setTitle('');
    setContent('');
    setTags('');
    currentDraftRef.current = null;
    lastSavedRef.current = '';
    void apiFetch<{ notes: AcademyPrivateNoteDoc[] }>(API_ENDPOINTS.ACADEMY_NOTES)
      .then(response => {
        if (!active) return;
        if (!response.ok || !response.data) {
          setLoadError(response.error || 'Deine privaten Notizen konnten nicht geladen werden.');
          setLoadRetryable(response.status === 0 || response.status === 429 || response.status >= 500);
          return;
        }
        const ownNotes = response.data.notes;
        for (const note of ownNotes) revisionByIdRef.current.set(note.id, note.revision ?? 1);
        setNotes(ownNotes);
        setNotesLoaded(true);
        setLoadRetryable(false);
      })
      .catch(error => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Deine privaten Notizen konnten nicht geladen werden.');
          setLoadRetryable(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      // Flush the current version's draft before the reader switches to another material.
      // The debounce timer is cleaned up separately, so relying on it here could lose edits.
      const current = draftsBySourceRef.current.get(sourceKey) || null;
      draftsBySourceRef.current.delete(sourceKey);
      if (current && serializeDraft(current) !== lastSavedRef.current) {
        pendingSaveRef.current = current;
        void persistPendingRef.current();
      }
    };
  }, [materialId, materialVersionId, loadAttempt]);

  const draft = useMemo<NoteDraft | null>(() => selectedNote ? ({
    id: selectedNote.id,
    title,
    content,
    tags: parseTags(tags)
  }) : null, [selectedNote, title, content, tags]);

  currentDraftRef.current = draft;
  if (draft) draftsBySourceRef.current.set(sourceKey, draft);
  else draftsBySourceRef.current.delete(sourceKey);
  const hasUnsavedChanges = Boolean(draft && serializeDraft(draft) !== lastSavedRef.current);

  useEffect(() => {
    if (!draft) return;
    const snapshot = serializeDraft(draft);
    if (snapshot === lastSavedRef.current) return;
    setSaveStatus('unsaved');
    const timer = window.setTimeout(() => {
      if (saveDebounceTimerRef.current === timer) saveDebounceTimerRef.current = null;
      queueSave(draft);
    }, 700);
    saveDebounceTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (saveDebounceTimerRef.current === timer) saveDebounceTimerRef.current = null;
    };
  }, [draft, queueSave]);

  const selectNote = (note: AcademyPrivateNoteDoc) => {
    if (savingDraftIdRef.current === note.id) {
      setAnchorNotice('Diese Notiz wird gerade gespeichert. Bitte warte kurz und wähle sie dann erneut aus.');
      return;
    }
    if (pendingSaveRef.current && pendingSaveRef.current.id !== note.id) {
      setAnchorNotice('Eine vorherige Notizänderung muss zuerst gespeichert werden. Öffne die betroffene Notiz erneut, um den Speicherversuch fortzusetzen.');
      return;
    }
    if (hasUnsavedChanges && draft) {
      queueSave(draft);
      return;
    }
    const serverDraft: NoteDraft = {
      id: note.id,
      title: note.title || '',
      content: note.content || '',
      tags: note.tags
    };
    const pendingDraft = pendingSaveRef.current?.id === note.id ? pendingSaveRef.current : null;
    const selectedDraft = pendingDraft || serverDraft;
    setSelectedNoteId(note.id);
    setTitle(selectedDraft.title);
    setContent(selectedDraft.content);
    setTags(selectedDraft.tags.join(', '));
    lastSavedRef.current = serializeDraft(serverDraft);
    setSaveStatus(pendingDraft ? 'error' : 'saved');
    setSaveError(pendingDraft
      ? saveErrorsByIdRef.current.get(note.id) || 'Deine letzte Änderung konnte nicht gespeichert werden. Bitte versuche es erneut.'
      : '');
    setPreview(false);
  };

  const createNote = async () => {
    if (!notesLoaded || loading || savingAction) return;
    if (pendingSaveRef.current) {
      setAnchorNotice('Speichere zuerst die vorherige Notizänderung, bevor du einen neuen Eintrag anlegst.');
      return;
    }
    if (hasUnsavedChanges && draft) {
      queueSave(draft);
      return;
    }
    setSavingAction(true);
    const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(API_ENDPOINTS.ACADEMY_NOTES, {
      method: 'POST',
      body: JSON.stringify({
        materialId,
        materialVersionId,
        kind: 'note',
        title: '',
        content: '',
        tags: [],
        ...(selectedAnchor ? { sources: [{ materialId, materialVersionId, anchor: selectedAnchor }] } : {})
      })
    });
    setSavingAction(false);
    if (!response.ok || !response.data) {
      setLoadError(response.error || 'Eine neue private Notiz konnte nicht angelegt werden.');
      return;
    }
    const note = response.data.note;
    revisionByIdRef.current.set(note.id, note.revision ?? 1);
    setNotes(previous => [...previous, note]);
    setSelectedNoteId(note.id);
    setTitle('');
    setContent('');
    setTags('');
    lastSavedRef.current = serializeDraft({ id: note.id, title: '', content: '', tags: [] });
    setSaveStatus('saved');
    setSaveError('');
    setLoadError('');
  };

  const addCurrentSourceToNote = async (note: AcademyPrivateNoteDoc) => {
    if (pendingSaveRef.current?.id === note.id || savingDraftIdRef.current === note.id) {
      setAnchorNotice('Speichere zuerst die Änderungen dieser Notiz, bevor du eine weitere Quelle hinzufügst.');
      return;
    }
    const sources = noteSources(note);
    if (sources.some(source => source.materialId === materialId && source.materialVersionId === materialVersionId)) return;
    setSavingAction(true);
    setLoadError('');
    try {
      const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(
        API_ENDPOINTS.ACADEMY_NOTES + '/' + encodeURIComponent(note.id),
        {
          method: 'PUT',
          body: JSON.stringify({
            expectedRevision: note.revision ?? 1,
            sources: [...sources, { materialId, materialVersionId, ...(selectedAnchor ? { anchor: selectedAnchor } : {}) }]
          })
        }
      );
      if (!response.ok || !response.data) {
        setLoadError(response.error || 'Die Materialquelle konnte nicht mit der Notiz verknüpft werden.');
        return;
      }
      revisionByIdRef.current.set(note.id, response.data.note.revision ?? (note.revision ?? 1) + 1);
      setNotes(previous => previous.map(item => item.id === note.id ? response.data!.note : item));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Die Materialquelle konnte nicht mit der Notiz verknüpft werden.');
    } finally {
      setSavingAction(false);
    }
  };

  const attachAnchorToNote = async (note: AcademyPrivateNoteDoc) => {
    if (!selectedAnchor || hasUnsavedChanges || saveStatus !== 'saved' || savingAction) return;
    const sources = noteSources(note).map(source =>
      source.materialId === materialId && source.materialVersionId === materialVersionId
        ? { ...source, anchor: selectedAnchor }
        : source
    );
    setSavingAction(true);
    setLoadError('');
    try {
      const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(
        API_ENDPOINTS.ACADEMY_NOTES + '/' + encodeURIComponent(note.id),
        { method: 'PUT', body: JSON.stringify({ expectedRevision: note.revision ?? 1, sources }) }
      );
      if (!response.ok || !response.data) {
        setLoadError(response.error || 'Der Textanker konnte nicht gespeichert werden.');
        return;
      }
      revisionByIdRef.current.set(note.id, response.data.note.revision ?? (note.revision ?? 1) + 1);
      setNotes(previous => previous.map(item => item.id === note.id ? response.data!.note : item));
      setAnchorNotice('Textanker wurde an dieser Materialquelle gespeichert.');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Der Textanker konnte nicht gespeichert werden.');
    } finally {
      setSavingAction(false);
    }
  };

  const removeCurrentSourceFromNote = async (note: AcademyPrivateNoteDoc) => {
    if (selectedNoteId === note.id && (hasUnsavedChanges || saveStatus !== 'saved')) {
      if (hasUnsavedChanges && draft) queueSave(draft);
      return;
    }
    const sources = noteSources(note);
    if (sources.length <= 1) return;
    setSavingAction(true);
    setLoadError('');
    try {
      const nextSources = sources.filter(source =>
        source.materialId !== materialId || source.materialVersionId !== materialVersionId
      );
      const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(
        API_ENDPOINTS.ACADEMY_NOTES + '/' + encodeURIComponent(note.id),
        {
          method: 'PUT',
          body: JSON.stringify({
            expectedRevision: note.revision ?? 1,
            sources: nextSources
          })
        }
      );
      if (!response.ok || !response.data) {
        setLoadError(response.error || 'Die Materialquelle konnte nicht von der Notiz gelöst werden.');
        return;
      }
      revisionByIdRef.current.set(note.id, response.data.note.revision ?? (note.revision ?? 1) + 1);
      setNotes(previous => previous.map(item => item.id === note.id ? response.data!.note : item));
      if (selectedNoteId === note.id) setSelectedNoteId('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Die Materialquelle konnte nicht von der Notiz gelöst werden.');
    } finally {
      setSavingAction(false);
    }
  };

  const toggleBookmark = async () => {
    if (!notesLoaded || loading || savingAction) return;
    const existing = bookmarks[0];
    setSavingAction(true);
    if (existing) {
      const response = await apiFetch(API_ENDPOINTS.ACADEMY_NOTES + '/' + encodeURIComponent(existing.id), { method: 'DELETE' });
      setSavingAction(false);
      if (!response.ok) {
        setLoadError(response.error || 'Das Lesezeichen konnte nicht entfernt werden.');
        return;
      }
      setNotes(previous => previous.filter(note => note.id !== existing.id));
      return;
    }
    const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(API_ENDPOINTS.ACADEMY_NOTES, {
      method: 'POST',
      body: JSON.stringify({
        materialId,
        materialVersionId,
        kind: 'bookmark',
        title: 'Lesezeichen',
        content: '',
        tags: [],
        ...(selectedAnchor ? { sources: [{ materialId, materialVersionId, anchor: selectedAnchor }] } : {})
      })
    });
    setSavingAction(false);
    if (!response.ok || !response.data) {
      setLoadError(response.error || 'Das Lesezeichen konnte nicht gespeichert werden.');
      return;
    }
    const note = response.data.note;
    revisionByIdRef.current.set(note.id, note.revision ?? 1);
    setNotes(previous => [...previous, note]);
    setLoadError('');
  };

  const reloadSelectedNote = async () => {
    if (!selectedNote || saveStatus !== 'error' || savingAction) return;
    if (!window.confirm('Die nicht gespeicherten Änderungen dieser Notiz verwerfen und die aktuelle Serverfassung laden?')) return;
    if (saveDebounceTimerRef.current !== null) {
      window.clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }
    pendingSaveRef.current = null;
    setSavingAction(true);
    const response = await apiFetch<{ notes: AcademyPrivateNoteDoc[] }>(API_ENDPOINTS.ACADEMY_NOTES);
    setSavingAction(false);
    if (!response.ok || !response.data) {
      setSaveError(response.error || 'Die aktuelle Notizfassung konnte nicht geladen werden.');
      return;
    }
    const latest = response.data.notes.find(note => note.id === selectedNote.id);
    if (!latest) {
      setSaveError('Diese Notiz ist nicht mehr vorhanden. Lade den Reader neu.');
      return;
    }
    revisionByIdRef.current.set(latest.id, latest.revision ?? 1);
    saveErrorsByIdRef.current.delete(latest.id);
    setNotes(previous => previous.map(note => note.id === latest.id ? latest : note));
    setTitle(latest.title || '');
    setContent(latest.content || '');
    setTags(latest.tags.join(', '));
    lastSavedRef.current = serializeDraft({
      id: latest.id,
      title: latest.title || '',
      content: latest.content || '',
      tags: latest.tags
    });
    setSaveStatus('saved');
    setSaveError('');
  };

  const deleteSelectedNote = async () => {
    if (!selectedNote || savingDraftIdRef.current === selectedNote.id || !window.confirm('Diese private Notiz endgültig löschen?')) return;
    if (draft && serializeDraft(draft) !== lastSavedRef.current) pendingSaveRef.current = null;
    setSavingAction(true);
    const response = await apiFetch(API_ENDPOINTS.ACADEMY_NOTES + '/' + encodeURIComponent(selectedNote.id), { method: 'DELETE' });
    setSavingAction(false);
    if (!response.ok) {
      setLoadError(response.error || 'Die Notiz konnte nicht gelöscht werden.');
      return;
    }
    setNotes(previous => previous.filter(note => note.id !== selectedNote.id));
    revisionByIdRef.current.delete(selectedNote.id);
    saveErrorsByIdRef.current.delete(selectedNote.id);
    if (pendingSaveRef.current?.id === selectedNote.id) pendingSaveRef.current = null;
    draftsBySourceRef.current.delete(sourceKey);
    setSelectedNoteId('');
    setTitle('');
    setContent('');
    setTags('');
    currentDraftRef.current = null;
    lastSavedRef.current = '';
    setSaveStatus('saved');
    setSaveError('');
  };

  return (
    <details className="rounded-lg border border-slate-200 dark:border-slate-800">
      <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 marker:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
        Persönliche Notizen und Lesezeichen
        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
          {linkedNotes.length} verknüpft · nur für dich sichtbar
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Notizen und Lesezeichen gehören zu genau dieser Materialfassung. Sie werden automatisch mit deinem Konto synchronisiert und sind für andere Nutzer – auch Administratoren – nicht einsehbar.
        </p>
        {selectedAnchor ? <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">Ausgewählte Textstelle wird beim nächsten neuen Eintrag als Anker gespeichert: „{selectedAnchor.quote.slice(0, 180)}“</p> : null}
        {anchorNotice ? <p className="text-xs text-amber-700 dark:text-amber-300" role="status">{anchorNotice}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primary} onClick={() => void createNote()} disabled={loading || !notesLoaded || loadRetryable || savingAction || hasUnsavedChanges || saveStatus !== 'saved'}>
            {selectedAnchor ? 'Notiz zur Textstelle hinzufügen' : 'Notiz hinzufügen'}
          </button>
          <button type="button" className={secondary} onClick={() => void toggleBookmark()} disabled={loading || !notesLoaded || loadRetryable || savingAction || hasUnsavedChanges || saveStatus !== 'saved'}>
            {bookmarks.length ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
          </button>
        </div>
        {loading ? <p className="text-sm text-slate-600 dark:text-slate-300" role="status">Persönliche Einträge werden geladen …</p> : null}
        <div className={loadError ? "flex flex-wrap items-center gap-3" : "sr-only"}>
          <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{loadError}</p>
          {loadError && loadRetryable ? (
            <button type="button" className={secondary} onClick={() => setLoadAttempt(attempt => attempt + 1)} disabled={loading || savingAction}>
              Erneut versuchen
            </button>
          ) : null}
        </div>
        {notesLoaded && !loading && linkedNotes.length === 0 && unlinkedNotes.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">Für diese Materialfassung gibt es noch keine persönlichen Einträge.</p> : null}
        {bookmarks.map(note => {
          const anchor = noteSources(note).find(source => source.materialId === materialId && source.materialVersionId === materialVersionId)?.anchor;
          return <div key={note.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span>Lesezeichen{anchor ? ' · „' + anchor.quote.slice(0, 100) + '“' : ' ohne Textanker'}</span>
            {selectedAnchor ? <button type="button" className={secondary} onClick={() => void attachAnchorToNote(note)} disabled={savingAction || hasUnsavedChanges || saveStatus !== 'saved'}>Auswahl anheften</button> : null}
            {anchor ? <button type="button" className={secondary} onClick={() => {
              const result = onJumpToAnchor?.(anchor) || 'missing';
              setAnchorNotice(result === 'resolved' ? 'Textstelle eindeutig gefunden.' : result === 'ambiguous' ? 'Textstelle ist nicht eindeutig – es wurde keine Position ausgewählt.' : 'Textstelle wurde in dieser Materialfassung nicht gefunden.');
            }}>Textstelle anzeigen</button> : null}
          </div>;
        })}
        {linkedNotes.filter(note => note.kind === 'note').length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Vorhandene Notizen">
            {linkedNotes.filter(note => note.kind === 'note').map(note => {
              const anchor = noteSources(note).find(source => source.materialId === materialId && source.materialVersionId === materialVersionId)?.anchor;
              return <div key={note.id} className="flex flex-wrap items-center gap-2">
                <button type="button" className={note.id === selectedNoteId ? primary : secondary}
                  onClick={() => selectNote(note)} disabled={hasUnsavedChanges || saveStatus !== 'saved'}>
                  {note.title || 'Notiz ohne Titel'}
                </button>
                {anchor ? <button type="button" className={secondary} onClick={() => {
                  const result = onJumpToAnchor?.(anchor) || 'missing';
                  setAnchorNotice(result === 'resolved' ? 'Textstelle eindeutig gefunden.' : result === 'ambiguous' ? 'Textstelle ist nicht eindeutig – es wurde keine Position ausgewählt.' : 'Textstelle wurde in dieser Materialfassung nicht gefunden.');
                }}>Textstelle anzeigen</button> : null}
              </div>;
            })}
          </div>
        )}
        {unlinkedNotes.length > 0 ? (
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Vorhandene Notiz mit dieser Quelle verknüpfen</span>
              <input
                className={field}
                value={linkNoteSearch}
                onChange={event => setLinkNoteSearch(event.target.value)}
                placeholder="Eigene Notizen nach Titel, Inhalt oder Schlagwort suchen"
                maxLength={120}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {linkableNotes.map(note => (
                <button
                  key={note.id}
                  type="button"
                  className={secondary}
                  onClick={() => void addCurrentSourceToNote(note)}
                  disabled={savingAction}
                >
                  {note.title || 'Notiz ohne Titel'} · Quelle hinzufügen
                </button>
              ))}
              {linkableNotes.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">Keine passende Notiz gefunden.</p> : null}
              {unlinkedNotes.length > linkableNotes.length && !linkNoteSearch.trim() ? <p className="w-full text-xs text-slate-500 dark:text-slate-400">Es werden höchstens 10 Notizen angezeigt. Nutze die Suche, um weitere zu finden.</p> : null}
            </div>
          </div>
        ) : null}
        {selectedNote && draft ? (
          <div className={panel + ' space-y-3'}>
            {selectedAnchor ? <button type="button" className={secondary} onClick={() => void attachAnchorToNote(selectedNote)} disabled={savingAction || hasUnsavedChanges || saveStatus !== 'saved'}>Ausgewählte Textstelle an diese Notiz anheften</button> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Private Notiz bearbeiten</h4>
              <span className="text-xs text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
                {saveStatus === 'saving' ? 'Speichert …' : saveStatus === 'unsaved' ? 'Ungespeicherte Änderungen' : saveStatus === 'error' ? 'Speichern fehlgeschlagen' : 'Alle Änderungen gespeichert'}
              </span>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Titel</span>
              <input className={field} value={title} maxLength={200} disabled={savingAction} onChange={event => setTitle(event.target.value)} />
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="academy-reader-note-content" className="text-sm font-medium text-slate-700 dark:text-slate-200">Inhalt (Markdown)</label>
                <button type="button" className={secondary} onClick={() => setPreview(value => !value)} aria-pressed={preview} disabled={savingAction}>
                  {preview ? 'Bearbeiten' : 'Vorschau'}
                </button>
              </div>
              {preview ? (
                <article className="max-w-none rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={markdownComponents}>{content}</ReactMarkdown>
                </article>
              ) : (
                <textarea id="academy-reader-note-content" className={field} rows={7} maxLength={20000} value={content} disabled={savingAction} onChange={event => setContent(event.target.value)} />
              )}
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Schlagwörter (Komma getrennt)</span>
              <input className={field} value={tags} disabled={savingAction} onChange={event => setTags(event.target.value)} placeholder="z. B. Funk, Verfahren" />
            </label>
            <div className={saveError ? "space-y-2" : "sr-only"}>
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{saveError}</p>
              {saveError ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} onClick={() => queueSave(draft)} disabled={savingAction || saveStatus !== 'error'}>Erneut speichern</button>
                  <button type="button" className={secondary} onClick={() => void reloadSelectedNote()} disabled={savingAction || saveStatus !== 'error'}>Aktuelle Fassung laden</button>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              {noteSources(selectedNote).length > 1 ? (
                <button type="button" className={secondary} disabled={savingAction || hasUnsavedChanges || saveStatus !== 'saved'} onClick={() => void removeCurrentSourceFromNote(selectedNote)}>
                  Diese Quelle lösen
                </button>
              ) : <span />}
              <button type="button" className={secondary} disabled={savingAction || hasUnsavedChanges || saveStatus !== 'saved'} onClick={() => void deleteSelectedNote()}>Notiz löschen</button>
            </div>
          </div>
        ) : null}
        {bookmarks.length > 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">Lesezeichen für diese Fassung ist gesetzt.</p>
        ) : null}
      </div>
    </details>
  );
};
