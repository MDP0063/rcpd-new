import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import './AcademyActionDialog.css';
export interface AcademyDialogInputOptions { label: string; placeholder?: string; helperText?: string; minLength?: number; maxLength?: number; exactValue?: string; exactMatchMessage?: string; type?: 'text' | 'textarea'; }
export interface AcademyDialogOptions { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; }
interface DialogRequest { id: number; kind: 'confirm' | 'prompt'; title: string; message: string; confirmLabel: string; cancelLabel: string; danger: boolean; input?: AcademyDialogInputOptions; }
interface DialogResult { confirmed: boolean; value?: string; }
function AcademyActionDialog({ request, onResolve }: { request: DialogRequest | null; onResolve: (result: DialogResult) => void }) {
 const dialogRef=useRef<HTMLDialogElement|null>(null), inputRef=useRef<HTMLInputElement|HTMLTextAreaElement|null>(null), cancelRef=useRef<HTMLButtonElement|null>(null);
 const [value,setValue]=useState(''),[validationError,setValidationError]=useState('');
 const id=useId(),titleId=`academy-action-dialog-title-${id}`,messageId=`academy-action-dialog-message-${id}`,inputId=`academy-action-dialog-input-${id}`,helperId=`academy-action-dialog-helper-${id}`,errorId=`academy-action-dialog-error-${id}`;
 useEffect(()=>{setValue('');setValidationError('');},[request?.id]);
 useEffect(()=>{const dialog=dialogRef.current;if(!dialog)return;if(request&&!dialog.open){dialog.showModal();if(request.kind==='prompt')inputRef.current?.focus();else cancelRef.current?.focus();}else if(!request&&dialog.open)dialog.close();},[request]);
 const submit=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!request)return;if(request.kind==='confirm'){onResolve({confirmed:true});return;}const normalized=value.trim(),input=request.input;if(!input)return;if(input.minLength!==undefined&&normalized.length<input.minLength){setValidationError(`Bitte gib mindestens ${input.minLength} Zeichen ein.`);inputRef.current?.focus();return;}if(input.exactValue!==undefined&&normalized!==input.exactValue){setValidationError(input.exactMatchMessage||'Der eingegebene Text stimmt nicht überein.');inputRef.current?.focus();return;}onResolve({confirmed:true,value:normalized});};
 const describedBy=[messageId,request?.input?.helperText?helperId:'',validationError?errorId:''].filter(Boolean).join(' ');
 return <dialog ref={dialogRef} className="academy-action-dialog" aria-labelledby={titleId} aria-describedby={describedBy} onCancel={event=>{event.preventDefault();onResolve({confirmed:false});}}>
  {request&&<form className="academy-action-dialog__surface" onSubmit={submit}>
   <div className="space-y-2"><h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">{request.title}</h2><p id={messageId} className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">{request.message}</p></div>
   {request.input&&<div className="space-y-1.5"><label htmlFor={inputId} className="block text-sm font-medium text-slate-800 dark:text-slate-200">{request.input.label}</label>
    {request.input.type==='textarea'?<textarea ref={element=>{inputRef.current=element;}} id={inputId} className="academy-action-dialog__input" value={value} onChange={event=>{setValue(event.target.value);setValidationError('');}} placeholder={request.input.placeholder} maxLength={request.input.maxLength} rows={3} aria-invalid={Boolean(validationError)} aria-describedby={[request.input.helperText?helperId:'',validationError?errorId:''].filter(Boolean).join(' ')||undefined} autoComplete="off"/>:
    <input ref={element=>{inputRef.current=element;}} id={inputId} type="text" className="academy-action-dialog__input" value={value} onChange={event=>{setValue(event.target.value);setValidationError('');}} placeholder={request.input.placeholder} maxLength={request.input.maxLength} aria-invalid={Boolean(validationError)} aria-describedby={[request.input.helperText?helperId:'',validationError?errorId:''].filter(Boolean).join(' ')||undefined} autoComplete="off"/>}
    {request.input.helperText&&<p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">{request.input.helperText}</p>}
    {validationError&&<p id={errorId} role="alert" className="text-sm text-rose-700 dark:text-rose-300">{validationError}</p>}</div>}
   <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancelRef} type="button" className="academy-action-secondary" onClick={()=>onResolve({confirmed:false})}>{request.cancelLabel}</button><button type="submit" className={request.danger?'academy-action-danger':'academy-action-primary'}>{request.confirmLabel}</button></div>
  </form>}
 </dialog>;
}
export function useAcademyActionDialog(){
 const [request,setRequest]=useState<DialogRequest|null>(null),resolverRef=useRef<((result:DialogResult)=>void)|null>(null),requestIdRef=useRef(0);
 const open=useCallback((next:Omit<DialogRequest,'id'>)=>new Promise<DialogResult>(resolve=>{resolverRef.current?.({confirmed:false});resolverRef.current=resolve;requestIdRef.current+=1;setRequest({...next,id:requestIdRef.current});}),[]);
 const resolve=useCallback((result:DialogResult)=>{const pending=resolverRef.current;resolverRef.current=null;setRequest(null);pending?.(result);},[]);
 useEffect(()=>()=>{resolverRef.current?.({confirmed:false});resolverRef.current=null;},[]);
 const confirm=useCallback(async(message:string,options:AcademyDialogOptions={})=>{const result=await open({kind:'confirm',title:options.title||'Aktion bestätigen',message,confirmLabel:options.confirmLabel||'Bestätigen',cancelLabel:options.cancelLabel||'Abbrechen',danger:options.danger===true});return result.confirmed;},[open]);
 const prompt=useCallback(async(message:string,input:AcademyDialogInputOptions,options:AcademyDialogOptions={})=>{const result=await open({kind:'prompt',title:options.title||'Angabe erforderlich',message,confirmLabel:options.confirmLabel||'Weiter',cancelLabel:options.cancelLabel||'Abbrechen',danger:options.danger===true,input});return result.confirmed?result.value??'':null;},[open]);
 return {confirm,prompt,dialog:<AcademyActionDialog request={request} onResolve={resolve}/>};
}
