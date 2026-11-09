'use client';
import {useEffect,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db,uid,snap,Note,Attachment} from '@/lib/db';
import {useUI} from '@/lib/store';
import {sanitize,toText} from '@/lib/io';
import Modal from './Modal';
const kb=(n:number)=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.ceil(n/1024)+' KB';
function Thumb({a}:{a:Attachment}){const [u,setU]=useState('');useEffect(()=>{const x=URL.createObjectURL(a.blob);setU(x);return()=>URL.revokeObjectURL(x)},[a.id]);
  return <>{a.type.startsWith('image/')&&u&&<img src={u} alt={a.name} className="h-12 w-12 object-cover rounded"/>}<a className="underline text-sm" href={u} download={a.name}>{a.name}</a></>}
export default function NoteModal({note}:{note?:Note}){
  const {modal,setModal,bump}=useUI();const [tab,setTab]=useState<'h'|'f'>('h');const [open,setOpen]=useState<string|null>(null);const [cmp,setCmp]=useState<string|null>(null);
  const snaps=useLiveQuery(async()=>note?(await db.snapshots.where('noteId').equals(note.id).sortBy('createdAt')).reverse():[],[note?.id])??[];
  const files=useLiveQuery(async()=>note?db.attachments.where('noteId').equals(note.id).toArray():[],[note?.id])??[];
  if(modal!=='note'||!note)return null;
  const restore=async(s:typeof snaps[0])=>{if(!confirm('Restore this version? Your current version will be saved as a snapshot first.'))return;
    await snap(note,true);await db.notes.update(note.id,{title:s.title,content:s.content,updatedAt:Date.now()});bump();setModal(null)};
  const lines=(h:string)=>toText(h).split('\n').map(x=>x.trim()).filter(Boolean);
  const diff=(s:string)=>{const a=lines(s),b=lines(note.content);return [...a.filter(x=>!b.includes(x)).map(x=>['-',x]),...b.filter(x=>!a.includes(x)).map(x=>['+',x])]};
  const addFile=async(f?:File)=>{if(!f)return;if(f.size>25*1048576)return alert('File is too large (max 25 MB).');
    try{await db.attachments.add({id:uid(),noteId:note.id,name:f.name,type:f.type,size:f.size,blob:f})}catch{alert('Could not store the file (storage may be full).')}};
  return <Modal title={note.title||'Untitled'} onClose={()=>setModal(null)}>
    <div className="flex gap-2 mb-3 text-sm">{(['h','f'] as const).map(t=><button key={t} onClick={()=>setTab(t)} className={`btn ${tab===t?'btn-on':''}`}>{t==='h'?`History (${snaps.length})`:`Files (${files.length})`}</button>)}</div>
    {tab==='h'?<>
      <button className="btn border dark:border-zinc-700 mb-3" onClick={()=>snap(note,true)}>Create snapshot now</button>
      {!snaps.length&&<p className="text-sm text-zinc-500">No versions yet. Snapshots are created automatically as you edit.</p>}
      {snaps.map(s=><div key={s.id} className="border-b dark:border-zinc-800 py-2 text-sm">
        <div className="flex items-center gap-2"><span className="flex-1">{new Date(s.createdAt).toLocaleString()} {s.manual&&<em className="text-xs text-zinc-500">(manual)</em>}</span>
          <button className="btn" onClick={()=>{setOpen(open===s.id?null:s.id);setCmp(null)}}>Preview</button>
          <button className="btn" onClick={()=>{setCmp(cmp===s.id?null:s.id);setOpen(null)}}>Compare</button>
          <button className="btn" onClick={()=>restore(s)}>Restore</button></div>
        {open===s.id&&<div className="mt-2 rounded border dark:border-zinc-700 p-2 max-h-56 overflow-auto" dangerouslySetInnerHTML={{__html:sanitize(s.content)}}/>}
        {cmp===s.id&&<div className="mt-2 text-xs font-mono">{diff(s.content).map(([k,x],i)=><div key={i} className={k==='-'?'text-red-500':'text-green-600'}>{k} {x}</div>)}{!diff(s.content).length&&<span>Identical to the current version.</span>}</div>}
      </div>)}</>
    :<>
      <input type="file" onChange={e=>{addFile(e.target.files?.[0]);e.target.value=''}} className="text-sm mb-3"/>
      {!files.length&&<p className="text-sm text-zinc-500">No attachments.</p>}
      {files.map(a=><div key={a.id} className="flex items-center gap-2 py-1.5 border-b dark:border-zinc-800"><Thumb a={a}/><span className="text-xs text-zinc-500 flex-1">{kb(a.size)}</span><button className="btn" onClick={()=>confirm('Remove attachment?')&&db.attachments.delete(a.id)}>Remove</button></div>)}</>}
  </Modal>;
}
