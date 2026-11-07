import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyCourseMaterialReaderItem, AcademyMaterialReaderContent } from '../types/academy';

interface Props { participationId: string; materials: AcademyCourseMaterialReaderItem[]; }
import { extractHeadings } from '../lib/academyMaterialOutline';
const panel='rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const muted='text-sm text-slate-600 dark:text-slate-300';
const secondary='inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
export const AcademyMaterialReader:React.FC<Props>=({participationId,materials})=>{
 const [selectedKey,setSelectedKey]=useState('');const [navigationOpen,setNavigationOpen]=useState(false);
 const [currentVersion,setCurrentVersion]=useState<AcademyMaterialReaderContent|null>(null);const [loading,setLoading]=useState(false);const [loadError,setLoadError]=useState('');
 const selected=useMemo(()=>materials.find(x=>x.chapterId+'::'+x.materialId+'::'+x.materialVersionId===selectedKey)||null,[materials,selectedKey]);
 useEffect(()=>{let active=true;setCurrentVersion(null);setLoadError('');
  if(!selected||selected.accessStatus!=='available'){setLoading(false);return()=>{active=false;};}
  setLoading(true);
  void apiFetch<{material:AcademyMaterialReaderContent}>(API_ENDPOINTS.ACADEMY_COURSE_MATERIAL_VERSION(participationId,selected.materialId,selected.materialVersionId))
   .then(r=>{if(!active)return;if(!r.ok||!r.data)setLoadError(r.error||'Das Lernmaterial konnte nicht geladen werden.');else setCurrentVersion(r.data.material);})
   .catch(e=>{if(active)setLoadError(e instanceof Error?e.message:'Das Lernmaterial konnte nicht geladen werden.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[participationId,selected]);
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
   h1:heading('h1'),h2:heading('h2'),h3:heading('h3'),h4:heading('h4'),h5:heading('h5'),h6:heading('h6'),
   p:({children,node:_node,...props}:any)=><p {...props} className="my-3 leading-7 text-slate-800 dark:text-slate-200">{children}</p>,
   ul:({children,node:_node,...props}:any)=><ul {...props} className="my-3 list-disc space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ul>,
   ol:({children,node:_node,...props}:any)=><ol {...props} className="my-3 list-decimal space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ol>,
   blockquote:({children,node:_node,...props}:any)=><blockquote {...props} className="my-4 border-l-4 border-slate-300 pl-4 text-slate-600 dark:border-slate-700 dark:text-slate-300">{children}</blockquote>,
   pre:({children,node:_node,...props}:any)=><pre {...props} className="my-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">{children}</pre>,
   code:({children,className,node:_node,...props}:any)=><code {...props} className={className||'rounded bg-slate-100 px-1 py-0.5 text-sm dark:bg-slate-800'}>{children}</code>,
   a:({children,href,node:_node,...props}:any)=><a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2 dark:text-sky-300">{children}</a>,
   table:({children,node:_node,...props}:any)=><div className="my-4 overflow-x-auto"><table {...props} className="min-w-full border-collapse text-sm">{children}</table></div>,
   th:({children,node:_node,...props}:any)=><th {...props} className="border border-slate-300 bg-slate-100 px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-800">{children}</th>,
   td:({children,node:_node,...props}:any)=><td {...props} className="border border-slate-300 px-3 py-2 dark:border-slate-700">{children}</td>,
   img:({alt}:any)=><span role="note" className="inline-block rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">Bild nicht geladen: externe Bildquellen sind in Lernmaterialien deaktiviert{alt ? ' ('+alt+')' : ''}.</span>
  } satisfies Components;
 },[headings]);
 return <section className={panel+' space-y-4 p-4 sm:p-5'} aria-labelledby="academy-course-materials-heading">
  <header className="space-y-1"><h3 id="academy-course-materials-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Lernmaterialien dieser Kursversion</h3><p className={muted}>Jede Verknüpfung öffnet genau die Materialfassung, die in deiner Kursteilnahme fest zugeordnet ist.</p></header>
  {materials.length===0?<p className={muted}>Für diese Kursversion sind keine versionierten Text- oder Code-Materialien hinterlegt.</p>:<div className="space-y-3">
   <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{materials.slice().sort((a,b)=>a.chapterOrder-b.chapterOrder||a.order-b.order).map(item=>{
    const key=item.chapterId+'::'+item.materialId+'::'+item.materialVersionId;
    return <div key={key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs text-slate-500 dark:text-slate-400">{item.chapterTitle} · {item.required?'Erforderlich':'Optional'}</p><p className="font-medium text-slate-900 dark:text-white">{item.title||(item.accessStatus==='restricted'?'Materialzugriff eingeschränkt':item.materialCode||'Material nicht verfügbar')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.materialCode||item.materialId} · {item.versionNumber?'Version '+item.versionNumber:item.materialVersionId}</p></div>
     {item.accessStatus==='available'?<button type="button" className={secondary} onClick={()=>{setSelectedKey(key);setCurrentVersion(null);setLoadError('');setLoading(true);setNavigationOpen(false);}} disabled={selectedKey===key}>{selectedKey===key?'Geöffnet':'Material öffnen'}</button>:<span className="text-xs text-amber-700 dark:text-amber-300">{item.accessStatus==='restricted'?'Deine aktuelle Rolle reicht nicht aus.':'Diese Materialfassung ist nicht verfügbar.'}</span>}
    </div>;
   })}</div>
   {selected&&<div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selected.materialCode} · Version {selected.versionNumber}</p><h4 className="break-words text-xl font-semibold text-slate-900 dark:text-white">{currentVersion?.title||selected.title}</h4><p className={muted}>{currentVersion?.description}</p></div><div className="flex flex-wrap gap-2">
     {headings.length>0&&<button type="button" className={secondary} onClick={()=>setNavigationOpen(v=>!v)} aria-expanded={navigationOpen} aria-controls="academy-material-outline">Inhaltsübersicht {navigationOpen?'schließen':'öffnen'}</button>}
     <button type="button" className={secondary} onClick={()=>{setSelectedKey('');setCurrentVersion(null);setLoadError('');setLoading(false);setNavigationOpen(false);}}>Zur Materialliste</button></div></div>
     <div className="flex flex-col gap-4 lg:flex-row">
      {headings.length>0&&<nav id="academy-material-outline" hidden={!navigationOpen} className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950 lg:w-64 lg:shrink-0" aria-label="Inhaltsübersicht"><p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Inhaltsübersicht</p><ol className="space-y-1">{headings.map(h=><li key={h.id} style={{paddingLeft:(h.level-1)*12}}><a href={'#'+h.id} className="block break-words text-sm text-sky-700 hover:underline dark:text-sky-300">{h.title}</a></li>)}</ol></nav>}
      <div className="min-w-0 flex-1">
       {loading?<p className={muted} role="status">Material wird geladen …</p>:loadError?<div role="alert" className="rounded-md border border-rose-300 p-3 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">{loadError}</div>
        :currentVersion?.contentFormat==='markdown'?<article className="max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>{currentVersion.content}</ReactMarkdown></article>
        :currentVersion?.contentFormat==='code'?<div className="space-y-2"><p className={muted}>Gespeicherter Quelltext · wird nicht ausgeführt{currentVersion.codeLanguage?' · '+currentVersion.codeLanguage:''}</p><pre className="max-h-[70vh] overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{currentVersion.content}</code></pre></div>:null}
      </div>
     </div>
   </div>}
  </div>}
 </section>;
};
