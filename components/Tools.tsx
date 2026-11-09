'use client';
import {useEffect,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,newNote,uid} from '@/lib/db';
import {useUI} from '@/lib/store';
import {BUILTIN,exportNotes,exportBackup,importBackup,importText} from '@/lib/io';
import Modal from './Modal';
const keys=[['Ctrl/Cmd + N','New note'],['Ctrl/Cmd + S','Save now'],['Ctrl/Cmd + F','Search'],['Ctrl/Cmd + B / I / U','Bold / Italic / Underline'],['Ctrl/Cmd + Z / Shift+Z','Undo / Redo'],['Ctrl/Cmd + P','Print / save as PDF'],['Esc','Close dialogs']];
export default function Tools(){
  const {modal,setModal,select}=useUI();const [tab,setTab]=useState('stats');const [msg,setMsg]=useState('');const [usage,setUsage]=useState('');
  const notes=useLiveQuery(()=>db.notes.toArray(),[])??[];const nf=useLiveQuery(()=>db.folders.count(),[])??0;const nt=useLiveQuery(()=>db.tags.count(),[])??0;
  const tpls=useLiveQuery(()=>db.templates.toArray(),[])??[];
  useEffect(()=>{if(modal==='tools')navigator.storage?.estimate?.().then(e=>setUsage(((e.usage??0)/1048576).toFixed(1)+' MB')).catch(()=>{})},[modal]);
  if(modal!=='tools')return null;
  const now=Date.now(),live=notes.filter(n=>!n.trashed),day=864e5;
  const stat=[['Notes',live.filter(n=>!n.archived).length],['Folders',nf],['Tags',nt],['Favorites',live.filter(n=>n.favorite).length],['Pinned',live.filter(n=>n.pinned).length],['Archived',live.filter(n=>n.archived).length],['Created this week',live.filter(n=>n.createdAt>now-7*day).length],['Overdue',live.filter(n=>n.dueAt&&n.dueAt<now).length],['Upcoming reminders',live.filter(n=>n.dueAt&&n.dueAt>=now).length],['Storage used',usage||'—']];
  const act=Array.from({length:14},(_,i)=>live.filter(n=>Math.floor((now-n.updatedAt)/day)===13-i).length),max=Math.max(1,...act);
  const recent=[...live].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,5);
  const pick=async(f?:File)=>{if(!f)return;setMsg('Importing…');try{setMsg(f.name.endsWith('.json')?await importBackup(await f.text()):await importText(f.name,await f.text()))}catch(e:any){setMsg('Import failed: '+e.message)}};
  const use=async(c:string,n:string)=>{select(await newNote(null,c,n))};
  return <Modal title="Tools" onClose={()=>setModal(null)}>
    <div className="flex gap-1 mb-4 text-sm flex-wrap">{[['stats','Dashboard'],['tpl','Templates'],['bak','Backup & Export'],['keys','Shortcuts']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`btn ${tab===k?'btn-on':''}`}>{l}</button>)}</div>
    {tab==='stats'&&<><div className="grid grid-cols-2 gap-2">{stat.map(([l,v])=><div key={l} className="rounded-lg border dark:border-zinc-800 p-3"><div className="text-xl font-semibold">{v}</div><div className="text-xs text-zinc-500">{l}</div></div>)}</div>
      <h3 className="text-sm font-medium mt-4 mb-1">Activity (last 14 days)</h3><div className="flex items-end gap-1 h-16">{act.map((v,i)=><div key={i} title={String(v)} className="flex-1 bg-zinc-400 dark:bg-zinc-600 rounded-sm" style={{height:`${Math.max(4,v/max*100)}%`}}/>)}</div>
      <h3 className="text-sm font-medium mt-4 mb-1">Recently edited</h3>{recent.map(n=><div key={n.id} className="text-sm truncate cursor-pointer hover:underline" onClick={()=>select(n.id)}>{n.title||'Untitled'}</div>)}
      <p className="text-xs text-zinc-500 mt-4">Reminders: browser notifications only fire while the app is open in a tab (or installed and running). Browsers can’t reliably notify from a fully closed web app, and some don’t support notifications at all. Overdue notes are always flagged in the list.</p></>}
    {tab==='tpl'&&<div className="space-y-1">{BUILTIN.map(([n,c])=><div key={n} className="flex items-center"><span className="flex-1 text-sm">{n}</span><button className="btn" onClick={()=>use(c,n)}>Use</button></div>)}
      <h3 className="text-sm font-medium pt-3">My templates</h3>{!tpls.length&&<p className="text-xs text-zinc-500">Use “Tpl” in a note’s toolbar to save it as a template.</p>}
      {tpls.map(t=><div key={t.id} className="flex items-center"><span className="flex-1 text-sm">{t.name}</span><button className="btn" onClick={()=>use(t.content,t.name)}>Use</button><button className="btn" onClick={async()=>{const n=prompt('Rename template',t.name);if(n?.trim())await db.templates.update(t.id,{name:n.trim()})}}>Rename</button><button className="btn" onClick={()=>confirm('Delete template?')&&db.templates.delete(t.id)}>Delete</button></div>)}</div>}
    {tab==='bak'&&<div className="space-y-3 text-sm">
      <div><button className="btn border dark:border-zinc-700" onClick={exportBackup}>Download full backup (.json)</button><p className="text-xs text-zinc-500 mt-1">Includes notes, folders, tags, templates and versions. Attachments are not included.</p></div>
      <div><label className="block mb-1">Import backup, Markdown, TXT or HTML</label><input type="file" accept=".json,.md,.txt,.html" onChange={e=>{pick(e.target.files?.[0]);e.target.value=''}}/><p className="text-xs text-zinc-500 mt-1">Existing notes are never overwritten; duplicate IDs are skipped. Imported HTML is sanitized.</p></div>
      <div><span className="block mb-1">Export all notes</span>{['md','txt','html','doc','json'].map(f=><button key={f} className="btn border dark:border-zinc-700 mr-1" onClick={()=>f==='json'?exportBackup():exportNotes(notes.filter(n=>!n.trashed),f,'all-notes')}>.{f}</button>)}</div>
      {msg&&<p className="text-xs">{msg}</p>}</div>}
    {tab==='keys'&&keys.map(([k,d])=><div key={k} className="flex justify-between py-1 text-sm border-b dark:border-zinc-800"><kbd className="font-mono text-xs">{k}</kbd><span>{d}</span></div>)}
  </Modal>;
}
