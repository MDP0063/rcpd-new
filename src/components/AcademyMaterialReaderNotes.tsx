import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyPrivateNoteDoc } from '../types/academy';

interface Props {
  materialId: string;
  materialVersionId: string;
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

export const AcademyMaterialReaderNotes: React.FC<Props> = ({ materialId, materialVersionId }) => {
  const [notes, setNotes] = useState<AcademyPrivateNoteDoc[]>([]);
  const notesRef = useRef<AcademyPrivateNoteDoc[]>([]);
  notesRef.current = notes;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const revisionByIdRef = useRef(new Map<string, number>());
  const pendingSaveRef = useRef<NoteDraft | null>(null);
  const savingRef = useRef(false);
  const lastSavedRef = useRef('');
  const currentDraftRef = useRef<NoteDraft | null>(null);
  const persistPendingRef = useRef<() => Promise<void>>(async () => {});

  const selectedNote = useMemo(
    () => notes.find(note => note.id === selectedNoteId && note.kind === 'note') ?? null,
    [notes, selectedNoteId]
  );
  const bookmarks = useMemo(
    () => notes.filter(note => note.kind === 'bookmark'),
    [notes]
  );

  const persistPending = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus('saving');
    try {
      while (pendingSaveRef.current) {
        const draft = pendingSaveRef.current;
        pendingSaveRef.current = null;
        const expectedRevision = revisionByIdRef.current.get(draft.id) ?? 1;
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
        if (!response.ok || !response.data) {
          pendingSaveRef.current = null;
          setSaveStatus('error');
          setSaveError(response.error || 'Die Notiz konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten.');
          return;
        }
        const saved = response.data.note;
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
      savingRef.current = false;
      if (pendingSaveRef.current) void persistPendingRef.current();
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
    setLoadError('');
    setNotes([]);
    setSelectedNoteId('');
    setTitle('');
    setContent('');
    setTags('');
    currentDraftRef.current = null;
    lastSavedRef.current = '';
    revisionByIdRef.current.clear();
    void apiFetch<{ notes: AcademyPrivateNoteDoc[] }>(API_ENDPOINTS.ACADEMY_NOTES)
      .then(response => {
        if (!active) return;
        if (!response.ok || !response.data) {
          setLoadError(response.error || 'Deine privaten Notizen konnten nicht geladen werden.');
          return;
        }
        const matching = response.data.notes.filter(note =>
          note.materialId === materialId && note.materialVersionId === materialVersionId
        );
        for (const note of matching) revisionByIdRef.current.set(note.id, note.revision ?? 1);
        setNotes(matching);
      })
      .catch(error => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Deine privaten Notizen konnten nicht geladen werden.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [materialId, materialVersionId]);

  const draft = useMemo<NoteDraft | null>(() => selectedNote ? ({
    id: selectedNote.id,
    title,
    content,
    tags: parseTags(tags)
  }) : null, [selectedNote, title, content, tags]);

  currentDraftRef.current = draft;

  useEffect(() => {
    return () => {
      const current = currentDraftRef.current;
      if (current && serializeDraft(current) !== lastSavedRef.current) {
        pendingSaveRef.current = current;
        void persistPendingRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!draft) return;
    const snapshot = serializeDraft(draft);
    if (snapshot === lastSavedRef.current) return;
    setSaveStatus('unsaved');
    const timer = window.setTimeout(() => queueSave(draft), 700);
    return () => window.clearTimeout(timer);
  }, [draft, queueSave]);

  const selectNote = (note: AcademyPrivateNoteDoc) => {
    if (draft && serializeDraft(draft) !== lastSavedRef.current) queueSave(draft);
    setSelectedNoteId(note.id);
    setTitle(note.title || '');
    setContent(note.content || '');
    setTags(note.tags.join(', '));
    lastSavedRef.current = serializeDraft({
      id: note.id,
      title: note.title || '',
      content: note.content || '',
      tags: note.tags
    });
    setSaveStatus('saved');
    setSaveError('');
    setPreview(false);
  };

  const createNote = async () => {
    if (draft && serializeDraft(draft) !== lastSavedRef.current) queueSave(draft);
    setSavingAction(true);
    const response = await apiFetch<{ note: AcademyPrivateNoteDoc }>(API_ENDPOINTS.ACADEMY_NOTES, {
      method: 'POST',
      body: JSON.stringify({
        materialId,
        materialVersionId,
        kind: 'note',
        title: '',
        content: '',
        tags: []
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

  const toggleBookmark = async () => {
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
        tags: []
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

  const deleteSelectedNote = async () => {
    if (!selectedNote || !window.confirm('Diese private Notiz endgültig löschen?')) return;
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
      <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
        Persönliche Notizen und Lesezeichen
        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
          {notes.length} gespeichert · nur für dich sichtbar
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Notizen und Lesezeichen gehören zu genau dieser Materialfassung. Sie werden automatisch mit deinem Konto synchronisiert und sind für andere Nutzer – auch Administratoren – nicht einsehbar.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primary} onClick={() => void createNote()} disabled={loading || savingAction}>
            Notiz hinzufügen
          </button>
          <button type="button" className={secondary} onClick={() => void toggleBookmark()} disabled={loading || savingAction}>
            {bookmarks.length ? 'Lesezeichen entfernen' : 'Lesezeichen setzen'}
          </button>
        </div>
        {loading ? <p className="text-sm text-slate-600 dark:text-slate-300" role="status">Persönliche Einträge werden geladen …</p> : null}
        {loadError ? <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">{loadError}</p> : null}
        {!loading && notes.length === 0 ? <p className="text-sm text-slate-600 dark:text-slate-300">Für diese Materialfassung gibt es noch keine persönlichen Einträge.</p> : null}
        {notes.filter(note => note.kind === 'note').length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Vorhandene Notizen">
            {notes.filter(note => note.kind === 'note').map(note => (
              <button
                key={note.id}
                type="button"
                className={note.id === selectedNoteId ? primary : secondary}
                onClick={() => selectNote(note)}
              >
                {note.title || 'Notiz ohne Titel'}
              </button>
            ))}
          </div>
        )}
        {selectedNote && draft ? (
          <div className={panel + ' space-y-3'}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Private Notiz bearbeiten</h4>
              <span className="text-xs text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
                {saveStatus === 'saving' ? 'Speichert …' : saveStatus === 'unsaved' ? 'Ungespeicherte Änderungen' : saveStatus === 'error' ? 'Speichern fehlgeschlagen' : 'Alle Änderungen gespeichert'}
              </span>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Titel</span>
              <input className={field} value={title} maxLength={200} onChange={event => setTitle(event.target.value)} />
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="academy-reader-note-content" className="text-sm font-medium text-slate-700 dark:text-slate-200">Inhalt (Markdown)</label>
                <button type="button" className={secondary} onClick={() => setPreview(value => !value)} aria-pressed={preview}>
                  {preview ? 'Bearbeiten' : 'Vorschau'}
                </button>
              </div>
              {preview ? (
                <article className="prose prose-sm max-w-none rounded-md border border-slate-200 bg-white p-3 dark:prose-invert dark:border-slate-700 dark:bg-slate-900">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
                </article>
              ) : (
                <textarea id="academy-reader-note-content" className={field} rows={7} maxLength={20000} value={content} onChange={event => setContent(event.target.value)} />
              )}
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Schlagwörter (Komma getrennt)</span>
              <input className={field} value={tags} onChange={event => setTags(event.target.value)} placeholder="z. B. Funk, Verfahren" />
            </label>
            {saveError ? (
              <div className="space-y-2" role="alert">
                <p className="text-sm text-rose-700 dark:text-rose-300">{saveError}</p>
                <button type="button" className={secondary} onClick={() => queueSave(draft)}>Erneut speichern</button>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={secondary} disabled={savingAction || saveStatus === 'saving'} onClick={() => void deleteSelectedNote()}>Notiz löschen</button>
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
