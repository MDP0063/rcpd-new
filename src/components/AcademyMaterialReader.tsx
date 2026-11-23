import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyCourseMaterialReaderItem, AcademyMaterialReaderContent, AcademyPrivateNoteTextAnchor } from '../types/academy';
import { createTextAnchorFromRange, resolveTextAnchorInElement } from '../lib/academyTextAnchors';
import { createAcademyReaderPositionKey, parseAcademyReaderPosition, serializeAcademyReaderPosition } from '../lib/academyReaderPosition';
import { AcademyMaterialReaderNotes } from './AcademyMaterialReaderNotes';
import { AcademyMarkdownRenderer } from './AcademyMarkdownRenderer';

interface Props { participationId: string; materials: AcademyCourseMaterialReaderItem[]; }
import { extractHeadings } from '../lib/academyMaterialOutline';
const panel='rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const muted='text-sm text-slate-600 dark:text-slate-300';
const secondary='inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
export const AcademyMaterialReader:React.FC<Props>=({participationId,materials})=>{
 const [selectedKey,setSelectedKey]=useState('');const [navigationOpen,setNavigationOpen]=useState(false);
 const [selectedAnchor,setSelectedAnchor]=useState<AcademyPrivateNoteTextAnchor|null>(null);
 const markdownContentRef=useRef<HTMLElement|null>(null);
 const codeContentRef=useRef<HTMLPreElement|null>(null);
 const readerPositionReadyRef=useRef(false);
 const materialListHeadingRef=useRef<HTMLHeadingElement|null>(null);
 const readerTitleRef=useRef<HTMLHeadingElement|null>(null);
 const readerMessageRef=useRef<HTMLParagraphElement|null>(null);
 const readerErrorRef=useRef<HTMLDivElement|null>(null);
 const materialOpenActionRefs=useRef<Record<string,HTMLButtonElement|null>>({});
 const materialOriginKeyRef=useRef('');
 const pendingReaderFocusRef=useRef(false);
 const pendingListFocusRef=useRef(false);
 const jumpToAnchor=(anchor:AcademyPrivateNoteTextAnchor):'resolved'|'missing'|'ambiguous'=>{
  const root=anchor.kind==='markdown'?markdownContentRef.current:codeContentRef.current;
  if(!root)return 'missing';
  const result=resolveTextAnchorInElement(root,anchor);
  if(result.status!=='resolved')return result.status;
  const selection=window.getSelection();
  selection?.removeAllRanges();selection?.addRange(result.range);
  const scrollBehavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  result.range.startContainer.parentElement?.scrollIntoView({behavior:scrollBehavior,block:'center'});
  return 'resolved';
 };
 const captureTextAnchor=(event:React.MouseEvent<HTMLElement>,kind:'markdown'|'code')=>{
  setSelectedAnchor(null);
  const selection=window.getSelection();
  if(!selection||selection.isCollapsed||selection.rangeCount===0)return;
  setSelectedAnchor(createTextAnchorFromRange(event.currentTarget,kind,selection.getRangeAt(0)));
 };
 const [currentVersion,setCurrentVersion]=useState<AcademyMaterialReaderContent|null>(null);const [loading,setLoading]=useState(false);const [loadError,setLoadError]=useState('');const [loadRetryable,setLoadRetryable]=useState(false);const [loadAttempt,setLoadAttempt]=useState(0);
 const selected=useMemo(()=>materials.find(x=>x.chapterId+'::'+x.materialId+'::'+x.materialVersionId===selectedKey)||null,[materials,selectedKey]);
 const returnToMaterialList=()=>{
  pendingReaderFocusRef.current=false;
  pendingListFocusRef.current=true;
  setSelectedKey('');
  setCurrentVersion(null);
  setLoadError('');
  setLoading(false);
  setNavigationOpen(false);
 };
 useEffect(()=>{
  if(pendingListFocusRef.current&&!selectedKey){
   pendingListFocusRef.current=false;
   const origin=materialOriginKeyRef.current?materialOpenActionRefs.current[materialOriginKeyRef.current]:null;
   if(origin?.isConnected)origin.focus();
   else materialListHeadingRef.current?.focus();
   return;
  }
  if(!pendingReaderFocusRef.current||!selectedKey)return;
  if(loading){
   readerMessageRef.current?.focus();
   return;
  }
  if(currentVersion){
   pendingReaderFocusRef.current=false;
   readerTitleRef.current?.focus();
  }else if(loadError){
   pendingReaderFocusRef.current=false;
   readerErrorRef.current?.focus();
  }
 },[selectedKey,loading,currentVersion,loadError]);
 useEffect(()=>{let active=true;setCurrentVersion(null);setLoadError('');setLoadRetryable(false);setSelectedAnchor(null);
  if(!selected||selected.accessStatus!=='available'){setLoading(false);setLoadRetryable(false);return()=>{active=false;};}
  setLoading(true);
  void apiFetch<{material:AcademyMaterialReaderContent}>(API_ENDPOINTS.ACADEMY_COURSE_MATERIAL_VERSION(participationId,selected.materialId,selected.materialVersionId))
   .then(r=>{if(!active)return;if(!r.ok||!r.data){setLoadError(r.error||'Das Lernmaterial konnte nicht geladen werden.');setLoadRetryable(r.status===0||r.status===429||r.status>=500);}else{setCurrentVersion(r.data.material);setLoadRetryable(false);}})
   .catch(e=>{if(active){setLoadError(e instanceof Error?e.message:'Das Lernmaterial konnte nicht geladen werden.');setLoadRetryable(true);}})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[participationId,selected,loadAttempt]);
 const readerPositionKey=useMemo(()=>selected?createAcademyReaderPositionKey(participationId,selected.materialId,selected.materialVersionId):null,[participationId,selected?.materialId,selected?.materialVersionId]);
 useEffect(()=>{
  if(loading||!currentVersion||!readerPositionKey){readerPositionReadyRef.current=false;return;}
  readerPositionReadyRef.current=false;
  let restoreFrame:number|null=null;
  let saveTimer:number|null=null;
  const readPosition=()=>{
   try{return parseAcademyReaderPosition(window.localStorage.getItem(readerPositionKey));}
   catch{return null;}
  };
  const capturePosition=()=>{
   if(!readerPositionReadyRef.current)return;
   let position:{kind:'markdown'|'code';offset:number}|null=null;
   if(currentVersion.contentFormat==='markdown'){
    const article=markdownContentRef.current;
    if(article){
     const articleTop=article.getBoundingClientRect().top+window.scrollY;
     position={kind:'markdown',offset:Math.max(0,Math.min(article.scrollHeight,window.scrollY-articleTop))};
    }
   }else if(currentVersion.contentFormat==='code'){
    const code=codeContentRef.current;
    if(code)position={kind:'code',offset:Math.max(0,Math.min(code.scrollHeight,code.scrollTop))};
   }
   if(position){
    try{window.localStorage.setItem(readerPositionKey,serializeAcademyReaderPosition(position));}
    catch{/* Local position storage is optional when browser storage is unavailable. */}
   }
  };
  const scheduleSave=()=>{
   if(!readerPositionReadyRef.current)return;
   if(saveTimer!==null)window.clearTimeout(saveTimer);
   saveTimer=window.setTimeout(()=>{saveTimer=null;capturePosition();},250);
  };
  const flushSave=()=>{
   if(saveTimer!==null){window.clearTimeout(saveTimer);saveTimer=null;}
   capturePosition();
  };
  const saved=readPosition();
  restoreFrame=window.requestAnimationFrame(()=>{
   if(currentVersion.contentFormat==='markdown'&&saved?.kind==='markdown'&&markdownContentRef.current){
    const articleTop=markdownContentRef.current.getBoundingClientRect().top+window.scrollY;
    window.scrollTo({top:articleTop+saved.offset,behavior:'auto'});
   }else if(currentVersion.contentFormat==='code'&&saved?.kind==='code'&&codeContentRef.current){
    codeContentRef.current.scrollTop=saved.offset;
   }
   readerPositionReadyRef.current=true;
  });
  if(currentVersion.contentFormat==='markdown')window.addEventListener('scroll',scheduleSave,{passive:true});
  else codeContentRef.current?.addEventListener('scroll',scheduleSave,{passive:true});
  window.addEventListener('pagehide',flushSave);
  return()=>{
   if(restoreFrame!==null)window.cancelAnimationFrame(restoreFrame);
   if(currentVersion.contentFormat==='markdown')window.removeEventListener('scroll',scheduleSave);
   else codeContentRef.current?.removeEventListener('scroll',scheduleSave);
   window.removeEventListener('pagehide',flushSave);
   flushSave();
   readerPositionReadyRef.current=false;
  };
 },[readerPositionKey,currentVersion,loading]);
 const headings=useMemo(()=>currentVersion?.contentFormat==='markdown'?extractHeadings(currentVersion.content):[],[currentVersion]);
 const components=useMemo(()=>{
   const heading=(tag:'h1'|'h2'|'h3'|'h4'|'h5'|'h6') => {
    return ({ children, node, ...props }: any) => {
     const line=node?.position?.start?.line;
     const item=headings.find(h=>h.line===line);
     const headingStyles:Record<typeof tag,string>={h1:'scroll-mt-6 mt-8 mb-4 text-3xl font-bold text-slate-900 dark:text-white',h2:'scroll-mt-6 mt-7 mb-3 text-2xl font-semibold text-slate-900 dark:text-white',h3:'scroll-mt-6 mt-6 mb-3 text-xl font-semibold text-slate-900 dark:text-white',h4:'scroll-mt-6 mt-5 mb-2 text-lg font-semibold text-slate-900 dark:text-white',h5:'scroll-mt-6 mt-4 mb-2 text-base font-semibold text-slate-900 dark:text-white',h6:'scroll-mt-6 mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300'};
     return React.createElement(tag,{...props,id:item?.id,className:headingStyles[tag]},children);
    };
   };
  return {
   h1:heading('h1'),h2:heading('h2'),h3:heading('h3'),h4:heading('h4'),h5:heading('h5'),h6:heading('h6')

  } satisfies Components;
 },[headings]);
 return <section className={panel+' space-y-4 p-4 sm:p-5'} aria-labelledby="academy-course-materials-heading">
  <header className="space-y-1"><h3 ref={materialListHeadingRef} id="academy-course-materials-heading" tabIndex={-1} className="text-lg font-semibold text-slate-900 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">Lernmaterialien dieser Kursversion</h3><p className={muted}>Jede Verknüpfung öffnet genau die Materialfassung, die in deiner Kursteilnahme fest zugeordnet ist.</p></header>
  {materials.length===0?<p className={muted}>Für diese Kursversion sind keine versionierten Text- oder Code-Materialien hinterlegt.</p>:<div className="space-y-3">
   <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{materials.slice().sort((a,b)=>a.chapterOrder-b.chapterOrder||a.order-b.order).map(item=>{
    const key=item.chapterId+'::'+item.materialId+'::'+item.materialVersionId;
    return <div key={key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs text-slate-500 dark:text-slate-400">{item.chapterTitle} · {item.required?'Erforderlich':'Optional'}</p><p className="font-medium text-slate-900 dark:text-white">{item.title||(item.accessStatus==='restricted'?'Materialzugriff eingeschränkt':item.materialCode||'Material nicht verfügbar')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.materialCode||item.materialId} · {item.versionNumber?'Version '+item.versionNumber:item.materialVersionId}</p></div>
     {item.accessStatus==='available'?selectedKey===key?<span className="inline-flex items-center rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-current="true">Geöffnet</span>:<button ref={element=>{materialOpenActionRefs.current[key]=element;}} type="button" className={secondary} onClick={()=>{materialOriginKeyRef.current=key;pendingReaderFocusRef.current=true;setSelectedKey(key);setCurrentVersion(null);setLoadError('');setLoading(true);setNavigationOpen(false);}}>Material öffnen</button>:<span className="text-xs text-amber-700 dark:text-amber-300">{item.accessStatus==='restricted'?'Deine aktuelle Rolle reicht nicht aus.':'Diese Materialfassung ist nicht verfügbar.'}</span>}
    </div>;
   })}</div>
   {selected&&<div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selected.materialCode} · Version {selected.versionNumber}</p><h4 ref={readerTitleRef} tabIndex={-1} className="break-words text-xl font-semibold text-slate-900 dark:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">{currentVersion?.title||selected.title}</h4><p className={muted}>{currentVersion?.description}</p></div><div className="flex flex-wrap gap-2">
     {headings.length>0&&<button type="button" className={secondary} onClick={()=>setNavigationOpen(v=>!v)} aria-expanded={navigationOpen} aria-controls="academy-material-outline">Inhaltsübersicht {navigationOpen?'schließen':'öffnen'}</button>}
     <button type="button" className={secondary} onClick={returnToMaterialList}>Zur Materialliste</button></div></div>
     <div className="flex flex-col gap-4 lg:flex-row">
      {headings.length>0&&<nav id="academy-material-outline" hidden={!navigationOpen} className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 lg:w-64 lg:shrink-0" aria-label="Inhaltsübersicht"><p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Inhaltsübersicht</p><ol className="space-y-1">{headings.map(h=><li key={h.id} style={{paddingLeft:(h.level-1)*12}}><a href={'#'+h.id} className="block break-words text-sm text-sky-700 hover:underline dark:text-sky-300">{h.title}</a></li>)}</ol></nav>}
      <div className="min-w-0 flex-1">
       {loading?<p ref={readerMessageRef} tabIndex={-1} className={muted+" focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"} role="status">Material wird geladen …</p>
        :currentVersion?.contentFormat==='markdown'?<article ref={markdownContentRef} className="mx-auto w-full max-w-[68ch] text-base leading-relaxed" onMouseUp={event=>captureTextAnchor(event,'markdown')}><AcademyMarkdownRenderer content={currentVersion.content} components={components} /></article>
        :currentVersion?.contentFormat==='code'?<div className="space-y-2"><p className={muted}>Gespeicherter Quelltext · wird nicht ausgeführt{currentVersion.codeLanguage?' · '+currentVersion.codeLanguage:''}</p><pre ref={codeContentRef} onMouseUp={event=>captureTextAnchor(event,'code')} className="max-h-[70vh] overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{currentVersion.content}</code></pre></div>:null}
       <div ref={readerErrorRef} tabIndex={loadError?-1:undefined} role={loadError?'group':undefined} aria-label={loadError?'Material konnte nicht geladen werden':undefined} className={loadError?'space-y-3 rounded-md border border-rose-300 p-3 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600':'sr-only'}>
        <p role="alert">{loadError}</p>
        {loadError&&loadRetryable?<button type="button" className={secondary} onClick={()=>setLoadAttempt(value=>value+1)}>Erneut versuchen</button>:null}
       </div>
      </div>
     </div>
   </div>}
  </div>}
  {selected && currentVersion && <AcademyMaterialReaderNotes materialId={selected.materialId} materialVersionId={selected.materialVersionId} selectedAnchor={selectedAnchor} onJumpToAnchor={jumpToAnchor} />}
 </section>;
};
