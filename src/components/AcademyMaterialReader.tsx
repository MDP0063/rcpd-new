import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import type { AcademyCourseMaterialReaderItem, AcademyMaterialVersionDoc } from '../types/academy';

interface Props { participationId: string; materials: AcademyCourseMaterialReaderItem[]; }
interface HeadingItem { id: string; level: number; title: string; }
const panel='rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const muted='text-sm text-slate-600 dark:text-slate-300';
const secondary='inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600';
function slugify(value:string):string{return value.toLocaleLowerCase('de-DE').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'abschnitt';}
function extractHeadings(markdown:string):HeadingItem[]{
 const counts=new Map<string,number>();const result:HeadingItem[]=[];
 for(const line of markdown.split(/\r?\n/)){const m=line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);if(!m)continue;
 const title=m[2].replace(/\[(.*?)\]\([^)]*\)/g,'$1').replace(/[*_`~]/g,'').trim();const base=slugify(title);const count=counts.get(base)||0;counts.set(base,count+1);result.push({id:count?base+'-'+count:base,level:m[1].length,title});}
 return result;
}
export const AcademyMaterialReader:React.FC<Props>=({participationId,materials})=>{
 const [selectedKey,setSelectedKey]=useState('');const [navigationOpen,setNavigationOpen]=useState(false);
 const [currentVersion,setCurrentVersion]=useState<AcademyMaterialVersionDoc|null>(null);const [loading,setLoading]=useState(false);const [loadError,setLoadError]=useState('');
 const selected=useMemo(()=>materials.find(x=>x.chapterId+'::'+x.materialId+'::'+x.materialVersionId===selectedKey)||null,[materials,selectedKey]);
 useEffect(()=>{let active=true;setCurrentVersion(null);setLoadError('');
  if(!selected||selected.accessStatus!=='available'){setLoading(false);return()=>{active=false;};}
  setLoading(true);
  void apiFetch<{material:AcademyMaterialVersionDoc}>(API_ENDPOINTS.ACADEMY_COURSE_MATERIAL_VERSION(participationId,selected.materialId,selected.materialVersionId))
   .then(r=>{if(!active)return;if(!r.ok||!r.data)setLoadError(r.error||'Das Lernmaterial konnte nicht geladen werden.');else setCurrentVersion(r.data.material);})
   .catch(e=>{if(active)setLoadError(e instanceof Error?e.message:'Das Lernmaterial konnte nicht geladen werden.');})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[participationId,selected]);
 const headings=useMemo(()=>currentVersion?.contentFormat==='markdown'?extractHeadings(currentVersion.content):[],[currentVersion]);
 const components=useMemo(()=>{
  let index=0;const heading=(tag:'h1'|'h2'|'h3'|'h4'|'h5'|'h6')=>({children,...props}:any=>{const item=headings[index++];return React.createElement(tag,{...props,id:item?.id,className:'scroll-mt-6 mt-7 mb-3 font-semibold text-slate-900 dark:text-white'},children);});
  return {
   h1:heading('h1'),h2:heading('h2'),h3:heading('h3'),h4:heading('h4'),h5:heading('h5'),h6:heading('h6'),
   p:({children,...props}:any)=><p {...props} className="my-3 leading-7 text-slate-800 dark:text-slate-200">{children}</p>,
   ul:({children,...props}:any)=><ul {...props} className="my-3 list-disc space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ul>,
   ol:({children,...props}:any)=><ol {...props} className="my-3 list-decimal space-y-1 pl-6 text-slate-800 dark:text-slate-200">{children}</ol>,
   blockquote:({children,...props}:any)=><blockquote {...props} className="my-4 border-l-4 border-slate-300 pl-4 text-slate-600 dark:border-slate-700 dark:text-slate-300">{children}</blockquote>,
   pre:({children,...props}:any)=><pre {...props} className="my-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">{children}</pre>,
   code:({children,className,...props}:any)=><code {...props} className={className||'rounded bg-slate-100 px-1 py-0.5 text-sm dark:bg-slate-800'}>{children}</code>,
   a:({children,href,...props}:any)=><a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline underline-offset-2 dark:text-sky-300">{children}</a>,
   table:({children,...props}:any)=><div className="my-4 overflow-x-auto"><table {...props} className="min-w-full border-collapse text-sm">{children}</table></div>,
   th:({children,...props}:any)=><th {...props} className="border border-slate-300 bg-slate-100 px-3 py-2 text-left dark:border-slate-700 dark:bg-slate-800">{children}</th>,
   td:({children,...props}:any)=><td {...props} className="border border-slate-300 px-3 py-2 dark:border-slate-700">{children}</td>
  } satisfies Components;
 },[headings]);
 return <section className={panel+' space-y-4 p-4 sm:p-5'} aria-labelledby="academy-course-materials-heading">
  <header className="space-y-1"><h3 id="academy-course-materials-heading" className="text-lg font-semibold text-slate-900 dark:text-white">Lernmaterialien dieser Kursversion</h3><p className={muted}>Jede Verknüpfung öffnet genau die Materialfassung, die in deiner Kursteilnahme fest zugeordnet ist.</p></header>
  {materials.length===0?<p className={muted}>Für diese Kursversion sind keine versionierten Text- oder Code-Materialien hinterlegt.</p>:<div className="space-y-3">
   <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{materials.slice().sort((a,b)=>a.chapterOrder-b.chapterOrder||a.order-b.order).map(item=>{
    const key=item.chapterId+'::'+item.materialId+'::'+item.materialVersionId;
    return <div key={key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-xs text-slate-500 dark:text-slate-400">{item.chapterTitle} · {item.required?'Erforderlich':'Optional'}</p><p className="font-medium text-slate-900 dark:text-white">{item.title||(item.accessStatus==='restricted'?'Materialzugriff eingeschränkt':item.materialCode||'Material nicht verfügbar')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.materialCode||item.materialId} · {item.versionNumber?'Version '+item.versionNumber:item.materialVersionId}</p></div>
     {item.accessStatus==='available'?<button type="button" className={secondary} onClick={()=>{setSelectedKey(key);setNavigationOpen(false);}}>{selectedKey===key?'Geöffnet':'Material öffnen'}</button>:<span className="text-xs text-amber-700 dark:text-amber-300">{item.accessStatus==='restricted'?'Deine aktuelle Rolle reicht nicht aus.':'Diese Materialfassung ist nicht verfügbar.'}</span>}
    </div>;
   })}</div>
   {selected&&<div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-mono text-slate-500 dark:text-slate-400">{selected.materialCode} · Version {selected.versionNumber}</p><h4 className="text-xl font-semibold text-slate-900 dark:text-white">{currentVersion?.title||selected.title}</h4><p className={muted}>{currentVersion?.description}</p></div><div className="flex flex-wrap gap-2">
     {headings.length>0&&<button type="button" className={secondary} onClick={()=>setNavigationOpen(v=>!v)} aria-expanded={navigationOpen}>Inhaltsübersicht {navigationOpen?'schließen':'öffnen'}</button>}
     <button type="button" className={secondary} onClick={()=>{setSelectedKey('');setCurrentVersion(null);}}>Zur Materialliste</button></div></div>
    {navigationOpen&&headings.length>0&&<nav className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950" aria-label="Inhaltsübersicht"><p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Inhaltsübersicht</p><ol className="space-y-1">{headings.map(h=><li key={h.id} style={{paddingLeft:(h.level-1)*12}}><a href={'#'+h.id} className="text-sm text-sky-700 hover:underline dark:text-sky-300">{h.title}</a></li>)}</ol></nav>}
    {loading?<p className={muted} role="status">Material wird geladen …</p>:loadError?<div role="alert" className="rounded-md border border-rose-300 p-3 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">{loadError}</div>
     :currentVersion?.contentFormat==='markdown'?<article className="max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>{currentVersion.content}</ReactMarkdown></article>
     :currentVersion?.contentFormat==='code'?<div className="space-y-2"><p className={muted}>Gespeicherter Quelltext · wird nicht ausgeführt{currentVersion.codeLanguage?' · '+currentVersion.codeLanguage:''}</p><pre className="max-h-[70vh] overflow-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100"><code>{currentVersion.content}</code></pre></div>:null}
   </div>}
  </div>}
 </section>;
};
