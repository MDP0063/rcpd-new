import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Clock3, Eye, FilePlus2,
  Loader2, Plus, Save, Send, Trash2, X
} from 'lucide-react';
import { apiFetch } from '../lib/api';

type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'matching' | 'free_text';
type Option = { id: string; text: string };
type Question = {
  id: string;
  type: QuestionType;
  question: string;
  pointsMilli: number;
  explanation?: string;
  imageUrl?: string;
  options?: Option[];
  correctOptionId?: string;
  correctOptionIds?: string[];
  correctBoolean?: boolean;
  matchingPairs?: { id: string; prompt: string; targetId: string; targetText: string }[];
  gradingRubric?: string;
  maxAnswerLength?: number;
};
type ExamMaster = {
  id: string; title: string; moduleCode: string; assignedCourseCodes?: string[];
  assessmentStage: 'test' | 'final_exam'; status: string; minClearance: number;
  passingScoreBasisPoints: number; timeLimitMinutes: number; maxAttempts: number | null;
  prerequisites?: { examId: string; mode: 'completed' | 'passed'; minScoreBasisPoints?: number }[];
  questions: Question[]; updatedIso?: string; latestVersionNumber?: number;
  currentPublishedVersionId?: string; isLegacyFormat?: boolean; examFormat?: string;
};
type Definition = Omit<ExamMaster, 'id' | 'status' | 'updatedIso' | 'latestVersionNumber' | 'currentPublishedVersionId' | 'isLegacyFormat' | 'examFormat'>;

const makeId = () => crypto.randomUUID();
const emptyDefinition = (): Definition => ({
  title: '', moduleCode: '', assignedCourseCodes: [], assessmentStage: 'test',
  minClearance: 1, passingScoreBasisPoints: 7500, timeLimitMinutes: 0,
  maxAttempts: null, prerequisites: [], questions: []
});
const defaultQuestion = (type: QuestionType): Question => {
  const id = makeId();
  if (type === 'single_choice') {
    const options = [{ id: makeId(), text: '' }, { id: makeId(), text: '' }];
    return { id, type, question: '', pointsMilli: 1000, options, correctOptionId: options[0].id };
  }
  if (type === 'multiple_choice') {
    const options = [{ id: makeId(), text: '' }, { id: makeId(), text: '' }];
    return { id, type, question: '', pointsMilli: 1000, options, correctOptionIds: [options[0].id] };
  }
  if (type === 'true_false') return { id, type, question: '', pointsMilli: 1000, correctBoolean: true };
  if (type === 'matching') return { id, type, question: '', pointsMilli: 1000, matchingPairs: [
    { id: makeId(), prompt: '', targetId: makeId(), targetText: '' },
    { id: makeId(), prompt: '', targetId: makeId(), targetText: '' }
  ] };
  return { id, type, question: '', pointsMilli: 1000, gradingRubric: '', maxAnswerLength: 4000 };
};

const inputClass = 'w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500';
const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5';

export const ExamWorkshop: React.FC = () => {
  const [exams, setExams] = useState<ExamMaster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [definition, setDefinition] = useState<Definition>(emptyDefinition());
  const [mode, setMode] = useState<'list' | 'edit' | 'preview'>('list');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string | string[] | boolean>>({});

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await apiFetch<{ exams: ExamMaster[] }>('/api/admin/exams', { cache: 'no-store' });
    if (!response.ok || !response.data) {
      setError(response.error || 'Die Prüfungsübersicht konnte nicht geladen werden.');
    } else {
      setExams(Array.isArray(response.data.exams) ? response.data.exams : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadExams(); }, [loadExams]);

  const filteredExams = useMemo(() => exams.filter(exam =>
    exam.title.toLocaleLowerCase('de-DE').includes(search.toLocaleLowerCase('de-DE')) ||
    (exam.assignedCourseCodes || []).join(' ').toLowerCase().includes(search.toLowerCase())
  ), [exams, search]);

  const update = <K extends keyof Definition>(key: K, value: Definition[K]) =>
    setDefinition(current => ({ ...current, [key]: value }));

  const openNew = () => {
    setSelectedId(null);
    setDefinition(emptyDefinition());
    setError(null);
    setNotice(null);
    setMode('edit');
  };

  const openExam = async (id: string) => {
    setLoading(true);
    setError(null);
    const response = await apiFetch<{ exam: ExamMaster }>(`/api/admin/exams/${encodeURIComponent(id)}`, { cache: 'no-store' });
    setLoading(false);
    if (!response.ok || !response.data?.exam) {
      setError(response.error || 'Die Prüfung konnte nicht geladen werden.');
      return;
    }
    const exam = response.data.exam;
    if (exam.isLegacyFormat || exam.examFormat === 'interactive_code') {
      setError('Diese historische interaktive Prüfung ist in der neuen Werkstatt nur lesbar und kann hier nicht bearbeitet werden.');
      return;
    }
    setSelectedId(id);
    setDefinition({
      title: exam.title || '', moduleCode: exam.moduleCode || '',
      assignedCourseCodes: exam.assignedCourseCodes || (exam.moduleCode ? [exam.moduleCode] : []),
      assessmentStage: exam.assessmentStage, minClearance: exam.minClearance ?? 1,
      passingScoreBasisPoints: exam.passingScoreBasisPoints ?? 7500,
      timeLimitMinutes: exam.timeLimitMinutes ?? 0, maxAttempts: exam.maxAttempts ?? null,
      prerequisites: exam.prerequisites || [], questions: exam.questions || []
    });
    setNotice(null);
    setMode('edit');
  };

  const save = async () => {
    setSaving(true); setError(null); setNotice(null);
    const payload = { definition };
    const response = selectedId
      ? await apiFetch<{ exam: ExamMaster }>(`/api/academy/exams/${encodeURIComponent(selectedId)}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await apiFetch<{ exam: ExamMaster }>('/api/admin/exams', { method: 'POST', body: JSON.stringify(payload) });
    setSaving(false);
    if (!response.ok || !response.data?.exam) {
      setError(response.error || 'Der Entwurf konnte nicht gespeichert werden.');
      return;
    }
    setSelectedId(response.data.exam.id);
    setNotice('Entwurf erfolgreich gespeichert.');
    await loadExams();
  };

  const publish = async () => {
    if (!selectedId) { setError('Speichere den Entwurf zuerst.'); return; }
    if (!window.confirm('Prüfung jetzt veröffentlichen? Dadurch wird eine unveränderliche Version erstellt.')) return;
    setPublishing(true); setError(null); setNotice(null);
    const response = await apiFetch<{ version?: { versionNumber?: number }; validation?: { issues?: { path?: string; message?: string }[] } }>(
      `/api/admin/exams/${encodeURIComponent(selectedId)}/publish`, { method: 'POST', body: JSON.stringify({}) }
    );
    setPublishing(false);
    if (!response.ok) {
      const issues = response.data?.validation?.issues || [];
      setError(issues.length
        ? `Noch nicht veröffentlichungsfähig: ${issues.map(issue => [issue.path, issue.message].filter(Boolean).join(': ')).join(' · ')}`
        : response.error || 'Die Veröffentlichung ist fehlgeschlagen.');
      return;
    }
    setNotice('Prüfung wurde als unveränderliche Version veröffentlicht.');
    await openExam(selectedId);
    await loadExams();
  };

  const patchQuestion = (index: number, patch: Partial<Question>) => {
    setDefinition(current => ({ ...current, questions: current.questions.map((question, i) => i === index ? { ...question, ...patch } : question) }));
  };

  const addQuestion = (type: QuestionType) => update('questions', [...definition.questions, defaultQuestion(type)]);
  const removeQuestion = (index: number) => update('questions', definition.questions.filter((_, i) => i !== index));

  if (mode === 'list') return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><div className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">Administration · Prüfungsverwaltung</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Prüfungswerkstatt</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Prüfungen erstellen, bearbeiten, prüfen und veröffentlichen.</p></div>
        <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"><FilePlus2 size={16}/> Neue Prüfung</button>
      </div>
      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm flex gap-2"><AlertCircle size={17}/>{error}</div>}
      <div className="flex gap-3"><input className={inputClass} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Prüfung oder Lehrgang suchen…"/></div>
      {loading ? <div className="py-16 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2"/>Prüfungen werden geladen…</div> :
        filteredExams.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center"><BookOpen className="mx-auto text-slate-400 mb-3"/><p className="font-semibold text-slate-800 dark:text-slate-100">Noch keine Prüfungen gefunden</p><p className="text-sm text-slate-500 mt-1">Lege eine neue Prüfung an oder passe den Suchbegriff an.</p></div> :
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Prüfung</th><th className="px-4 py-3">Art</th><th className="px-4 py-3">Lehrgänge</th><th className="px-4 py-3">Fragen</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Aktion</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filteredExams.map(exam=><tr key={exam.id}><td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{exam.title || 'Unbenannter Entwurf'}<div className="text-xs font-normal text-slate-500 mt-1">{exam.updatedIso ? new Date(exam.updatedIso).toLocaleString('de-DE') : 'Noch nicht gespeichert'}</div></td><td className="px-4 py-3">{exam.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'}</td><td className="px-4 py-3">{(exam.assignedCourseCodes || []).join(', ') || '—'}</td><td className="px-4 py-3">{exam.questions?.length || 0}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${exam.status === 'published' ? 'bg-emerald-100 text-emerald-800' : exam.status === 'archived' ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'}`}>{exam.status === 'published' ? 'Veröffentlicht' : exam.status === 'archived' ? 'Archiviert' : 'Entwurf'}</span></td><td className="px-4 py-3"><button onClick={()=>void openExam(exam.id)} disabled={exam.status==='archived' || exam.isLegacyFormat} className="text-sky-700 dark:text-sky-400 font-semibold disabled:opacity-40">Öffnen</button></td></tr>)}</tbody></table></div>}
    </div>
  );

  const totalPoints = definition.questions.reduce((sum, question) => sum + question.pointsMilli, 0) / 1000;

  if (mode === 'preview') return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><button onClick={()=>setMode('edit')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><ArrowLeft size={16}/> Zurück zum Editor</button><span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold">Nur Vorschau · kein echter Versuch</span></div>
      <div className="rounded-lg bg-slate-900 text-white p-6"><div className="text-xs uppercase tracking-wider text-sky-300">{definition.assessmentStage === 'final_exam' ? 'Abschlussprüfung' : 'Übungstest'}</div><h1 className="text-2xl font-bold mt-2">{definition.title || 'Unbenannte Prüfung'}</h1><p className="text-sm text-slate-300 mt-2">{definition.timeLimitMinutes ? `${definition.timeLimitMinutes} Minuten` : 'Ohne Zeitlimit'} · Bestehensgrenze {definition.passingScoreBasisPoints / 100}% · {definition.questions.length} Fragen</p></div>
      {definition.questions.map((question,index)=><section key={question.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"><div className="text-xs font-semibold text-slate-500">FRAGE {index+1} · {question.pointsMilli/1000} PUNKTE</div><h2 className="font-semibold text-slate-900 dark:text-white">{question.question || 'Frage ohne Text'}</h2>{question.imageUrl && <img src={question.imageUrl} alt="Abbildung zur Frage" className="max-h-64 rounded-md object-contain"/>}
        {(question.type==='single_choice' || question.type==='multiple_choice') && <div className="space-y-2">{(question.options||[]).map(option=><label key={option.id} className="flex gap-2 items-center rounded-md border border-slate-200 dark:border-slate-700 p-3 text-sm"><input type={question.type==='single_choice'?'radio':'checkbox'} name={`preview-${question.id}`} checked={question.type==='single_choice'?previewAnswers[question.id]===option.id:Array.isArray(previewAnswers[question.id])&&(previewAnswers[question.id] as string[]).includes(option.id)} onChange={e=>setPreviewAnswers(current=>({...current,[question.id]:question.type==='single_choice'?option.id:e.target.checked?[...((current[question.id] as string[])||[]),option.id]:((current[question.id] as string[])||[]).filter(id=>id!==option.id)}))}/>{option.text || 'Leere Antwortmöglichkeit'}</label>)}</div>}
        {question.type==='true_false' && <div className="flex gap-4">{[true,false].map(value=><label key={String(value)} className="flex gap-2 items-center"><input type="radio" name={`preview-${question.id}`} checked={previewAnswers[question.id]===value} onChange={()=>setPreviewAnswers(current=>({...current,[question.id]:value}))}/>{value?'Richtig':'Falsch'}</label>)}</div>}
        {question.type==='matching' && <div className="space-y-2">{(question.matchingPairs||[]).map(pair=><label key={pair.id} className="grid md:grid-cols-2 gap-2 items-center text-sm"><span>{pair.prompt}</span><select className={inputClass} value={String(previewAnswers[pair.id]||'')} onChange={e=>setPreviewAnswers(current=>({...current,[pair.id]:e.target.value}))}><option value="">Bitte zuordnen…</option>{(question.matchingPairs||[]).map(target=><option key={target.targetId} value={target.targetId}>{target.targetText}</option>)}</select></label>)}</div>}
        {question.type==='free_text' && <textarea className={inputClass} rows={4} maxLength={question.maxAnswerLength||4000} placeholder="Deine Antwort…" value={String(previewAnswers[question.id]||'')} onChange={e=>setPreviewAnswers(current=>({...current,[question.id]:e.target.value}))}/>}
      </section>)}
      <div className="flex justify-end"><button onClick={()=>setPreviewAnswers({})} className="rounded-md border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm">Vorschau zurücksetzen</button></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={()=>setMode('list')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><ArrowLeft size={16}/> Zur Prüfungsübersicht</button>
        <div className="flex gap-2"><button onClick={()=>setMode('preview')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"><Eye size={16}/> Vorschau</button>
          <button onClick={()=>void save()} disabled={saving || publishing} className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>} Entwurf speichern</button>
          <button onClick={()=>void publish()} disabled={!selectedId || saving || publishing} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">{publishing?<Loader2 className="animate-spin" size={16}/>:<Send size={16}/>} Veröffentlichen</button></div>
      </div>
      <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedId ? 'Prüfung bearbeiten' : 'Neue Prüfung erstellen'}</h1><p className="text-sm text-slate-500 mt-1">Arbeitsstand und veröffentlichte Version bleiben getrennt.</p></div>
      {error && <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm">{error}</div>}
      {notice && <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-sm">{notice}</div>}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white">Prüfungsparameter</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label><span className={labelClass}>Titel</span><input className={inputClass} maxLength={200} value={definition.title} onChange={e=>update('title',e.target.value)}/></label>
          <label><span className={labelClass}>Prüfungsart</span><select className={inputClass} value={definition.assessmentStage} onChange={e=>update('assessmentStage',e.target.value as Definition['assessmentStage'])}><option value="test">Übungstest</option><option value="final_exam">Abschlussprüfung</option></select></label>
          <label><span className={labelClass}>Lehrgangscodes (kommagetrennt)</span><input className={inputClass} value={(definition.assignedCourseCodes || []).join(', ')} onChange={e=>update('assignedCourseCodes',e.target.value.split(',').map(v=>v.trim().toUpperCase()).filter(Boolean))} placeholder="z. B. SOP-01, LAW-02"/></label>
          <label><span className={labelClass}>Mindest-Dienstgradstufe (0–10)</span><input className={inputClass} type="number" min={0} max={10} value={definition.minClearance} onChange={e=>update('minClearance',Number(e.target.value))}/></label>
          <label><span className={labelClass}>Bestehensgrenze (%)</span><input className={inputClass} type="number" min={0} max={100} value={definition.passingScoreBasisPoints/100} onChange={e=>update('passingScoreBasisPoints',Math.round(Number(e.target.value)*100))}/></label>
          <label><span className={labelClass}>Zeitlimit in Minuten (0 = unbegrenzt)</span><input className={inputClass} type="number" min={0} max={1440} value={definition.timeLimitMinutes} onChange={e=>update('timeLimitMinutes',Number(e.target.value))}/></label>
          <label><span className={labelClass}>Maximale Versuche (leer = unbegrenzt)</span><input className={inputClass} type="number" min={0} value={definition.maxAttempts ?? ''} onChange={e=>update('maxAttempts',e.target.value===''?null:Number(e.target.value))}/></label>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-2"><div><h2 className="font-bold text-slate-900 dark:text-white">Fragen ({definition.questions.length})</h2><p className="text-xs text-slate-500">Gesamtpunktzahl: {totalPoints.toLocaleString('de-DE')} Punkte</p></div>
          <select className={inputClass+' max-w-xs'} value="" onChange={e=>{if(e.target.value)addQuestion(e.target.value as QuestionType);}}><option value="">Fragetyp hinzufügen…</option><option value="single_choice">Single Choice</option><option value="multiple_choice">Multiple Choice</option><option value="true_false">Richtig / Falsch</option><option value="matching">Zuordnung</option><option value="free_text">Freitext</option></select></div>
        {definition.questions.map((question,index)=><article key={question.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between"><div className="font-semibold text-sm text-slate-800 dark:text-white">Frage {index+1} · {({single_choice:'Single Choice',multiple_choice:'Multiple Choice',true_false:'Richtig / Falsch',matching:'Zuordnung',free_text:'Freitext'} as Record<QuestionType,string>)[question.type]}</div><button onClick={()=>removeQuestion(index)} aria-label={`Frage ${index+1} entfernen`} className="text-rose-600 p-1"><Trash2 size={16}/></button></div>
          <label><span className={labelClass}>Fragetext</span><textarea className={inputClass} rows={3} maxLength={2000} value={question.question} onChange={e=>patchQuestion(index,{question:e.target.value})}/></label>
          <div className="grid md:grid-cols-2 gap-3"><label><span className={labelClass}>Punkte</span><input className={inputClass} type="number" min="0.001" step="0.001" value={question.pointsMilli/1000} onChange={e=>patchQuestion(index,{pointsMilli:Math.round(Number(e.target.value)*1000)})}/></label><label><span className={labelClass}>Bild-URL (HTTPS, optional)</span><input className={inputClass} type="url" value={question.imageUrl || ''} onChange={e=>patchQuestion(index,{imageUrl:e.target.value || undefined})} placeholder="https://…"/></label></div>
          {(question.type==='single_choice' || question.type==='multiple_choice') && <div className="space-y-2"><div className={labelClass}>Antwortmöglichkeiten · {question.type==='single_choice'?'eine richtige Antwort':'alle richtigen Antworten markieren'}</div>{(question.options || []).map((option,oi)=><div key={option.id} className="flex gap-2 items-center"><input className={inputClass} value={option.text} onChange={e=>patchQuestion(index,{options:question.options?.map((o,j)=>j===oi?{...o,text:e.target.value}:o)})}/><label className="flex items-center gap-1 text-xs whitespace-nowrap"><input type={question.type==='single_choice'?'radio':'checkbox'} name={`correct-${question.id}`} checked={question.type==='single_choice'?question.correctOptionId===option.id:(question.correctOptionIds||[]).includes(option.id)} onChange={e=>patchQuestion(index,question.type==='single_choice'?{correctOptionId:option.id}:{correctOptionIds:e.target.checked?[...(question.correctOptionIds||[]),option.id]:(question.correctOptionIds||[]).filter(id=>id!==option.id)})}/>{question.type==='single_choice'?'Richtig':'Korrekt'}</label><button type="button" onClick={()=>{const opts=(question.options||[]).filter((_,j)=>j!==oi);patchQuestion(index,{options:opts,correctOptionId:question.correctOptionId===option.id?opts[0]?.id:question.correctOptionId,correctOptionIds:(question.correctOptionIds||[]).filter(id=>id!==option.id)});}} className="text-rose-500"><X size={15}/></button></div>)}<button type="button" onClick={()=>patchQuestion(index,{options:[...(question.options||[]),{id:makeId(),text:''}]})} className="text-xs font-semibold text-sky-700 dark:text-sky-400 inline-flex gap-1 items-center"><Plus size={14}/> Antwort hinzufügen</button></div>}
          {question.type==='true_false' && <label className="flex gap-3 items-center text-sm"><span className={labelClass+' mb-0'}>Richtige Antwort</span><select className={inputClass+' max-w-xs'} value={String(question.correctBoolean)} onChange={e=>patchQuestion(index,{correctBoolean:e.target.value==='true'})}><option value="true">Richtig</option><option value="false">Falsch</option></select></label>}
          {question.type==='matching' && <div className="space-y-2"><div className={labelClass}>Zuordnungspaare</div>{(question.matchingPairs||[]).map((pair,pi)=><div key={pair.id} className="grid md:grid-cols-[1fr_1fr_auto] gap-2"><input className={inputClass} aria-label="Ausgangstext" placeholder="Begriff / Frage" value={pair.prompt} onChange={e=>patchQuestion(index,{matchingPairs:question.matchingPairs?.map((p,j)=>j===pi?{...p,prompt:e.target.value}:p)})}/><input className={inputClass} aria-label="Zieltext" placeholder="Zugehörige Antwort" value={pair.targetText} onChange={e=>patchQuestion(index,{matchingPairs:question.matchingPairs?.map((p,j)=>j===pi?{...p,targetText:e.target.value}:p)})}/><button onClick={()=>patchQuestion(index,{matchingPairs:question.matchingPairs?.filter((_,j)=>j!==pi)})} className="text-rose-500"><Trash2 size={16}/></button></div>)}<button onClick={()=>patchQuestion(index,{matchingPairs:[...(question.matchingPairs||[]),{id:makeId(),prompt:'',targetId:makeId(),targetText:''}]})} className="text-xs font-semibold text-sky-700">+ Paar hinzufügen</button></div>}
          {question.type==='free_text' && <label><span className={labelClass}>Bewertungsrubrik für Ausbilder</span><textarea className={inputClass} rows={3} maxLength={4000} value={question.gradingRubric||''} onChange={e=>patchQuestion(index,{gradingRubric:e.target.value})}/></label>}
          <label><span className={labelClass}>Erklärung (optional)</span><textarea className={inputClass} rows={2} maxLength={4000} value={question.explanation||''} onChange={e=>patchQuestion(index,{explanation:e.target.value})}/></label>
        </article>)}
        {definition.questions.length===0 && <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500">Noch keine Fragen hinzugefügt.</div>}
      </section>
    </div>
  );
};
