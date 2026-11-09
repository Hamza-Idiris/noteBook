'use client';
import dynamic from 'next/dynamic';
import {useEffect} from 'react';
import NoteModal from '@/components/NoteModal';
import Tools from '@/components/Tools';
import {exportNotes} from '@/lib/io';
import {useLiveQuery} from 'dexie-react-hooks';
import {useTheme} from 'next-themes';
import {Plus,Star,Pin,Archive,Trash2,Folder,Tag,FileText,Search,Sun,Moon,Menu,RotateCcw,X,Clock,LayoutGrid,List as ListIcon,BarChart3,History} from 'lucide-react';
import {db,uid,newNote,Note} from '@/lib/db';
import {useUI,Filter} from '@/lib/store';
const Editor=dynamic(()=>import('@/components/Editor'),{ssr:false,loading:()=><div className="p-6 text-sm">Loading…</div>});
const strip=(h:string)=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const titles:Record<string,string>={all:'All Notes',favorites:'Favorites',pinned:'Pinned',archive:'Archive',trash:'Trash'};

function Side(){
  const {filter,setFilter,sidebar}=useUI();
  const folders=useLiveQuery(()=>db.folders.toArray(),[])??[];const tags=useLiveQuery(()=>db.tags.toArray(),[])??[];
  const item=(f:Filter,label:string,icon:React.ReactNode,del?:()=>void)=>{const on=filter.type===f.type&&filter.id===f.id;
    return <div key={label+f.id} className={`group flex items-center rounded-md px-2 py-1.5 text-sm cursor-pointer ${on?'bg-zinc-200 dark:bg-zinc-800':'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`} onClick={()=>setFilter(f)}>
      <span className="mr-2">{icon}</span><span className="flex-1 truncate">{label}</span>
      {del&&<button className="opacity-0 group-hover:opacity-100" onClick={e=>{e.stopPropagation();del()}}><X size={14}/></button>}</div>};
  if(!sidebar)return null;
  return <aside className="w-56 shrink-0 border-r dark:border-zinc-800 p-2 overflow-auto space-y-0.5 bg-zinc-50 dark:bg-zinc-900/40">
    {item({type:'all'},'All Notes',<FileText size={15}/>)}{item({type:'favorites'},'Favorites',<Star size={15}/>)}{item({type:'pinned'},'Pinned',<Pin size={15}/>)}{item({type:'archive'},'Archive',<Archive size={15}/>)}{item({type:'trash'},'Trash',<Trash2 size={15}/>)}
    <div className="flex items-center justify-between px-2 pt-4 text-xs uppercase text-zinc-500">Folders<button onClick={()=>{const n=prompt('Folder name');if(n?.trim())db.folders.add({id:uid(),name:n.trim()})}}><Plus size={14}/></button></div>
    {folders.map(f=>item({type:'folder',id:f.id},f.name,<Folder size={15}/>,async()=>{if(confirm(`Delete folder "${f.name}"? Its notes stay in All Notes.`)){await db.notes.where('folderId').equals(f.id).modify({folderId:null});await db.folders.delete(f.id)}}))}
    <div className="flex items-center justify-between px-2 pt-4 text-xs uppercase text-zinc-500">Tags<button onClick={()=>{const n=prompt('Tag name');if(n?.trim())db.tags.add({id:uid(),name:n.trim()})}}><Plus size={14}/></button></div>
    {tags.map(t=>item({type:'tag',id:t.id},t.name,<Tag size={15}/>,async()=>{if(confirm(`Delete tag "${t.name}"?`)){await db.notes.toCollection().modify(n=>{n.tagIds=n.tagIds.filter(x=>x!==t.id)});await db.tags.delete(t.id)}}))}
  </aside>;
}

function Bar({note}:{note:Note}){
  const folders=useLiveQuery(()=>db.folders.toArray(),[])??[];const tags=useLiveQuery(()=>db.tags.toArray(),[])??[];const {select,setModal}=useUI();const loc=(ms:number)=>new Date(ms-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
  const up=(p:Partial<Note>)=>db.notes.update(note.id,{...p,updatedAt:Date.now()});
  const T=({on,f,t,children}:any)=><button title={t} onClick={f} className={`btn ${on?'btn-on':''}`}>{children}</button>;
  return <div className="flex flex-wrap items-center gap-1 border-b dark:border-zinc-800 px-3 py-1.5 print:hidden">
    {note.trashed?<>
      <T t="Restore" f={()=>up({trashed:false})}><RotateCcw size={15}/> Restore</T>
      <T t="Delete forever" f={async()=>{if(confirm('Permanently delete this note? This cannot be undone.')){await db.notes.delete(note.id);select(null)}}}><Trash2 size={15}/> Delete forever</T></>:<>
      <T t="Pin" on={note.pinned} f={()=>up({pinned:!note.pinned})}><Pin size={15}/></T>
      <T t="Favorite" on={note.favorite} f={()=>up({favorite:!note.favorite})}><Star size={15}/></T>
      <T t="Archive" on={note.archived} f={()=>up({archived:!note.archived})}><Archive size={15}/></T>
      <T t="Duplicate" f={async()=>{const id=uid();await db.notes.add({...note,id,title:note.title+' (copy)',createdAt:Date.now(),updatedAt:Date.now()});select(id)}}>Copy</T>
      <T t="Trash" f={()=>up({trashed:true})}><Trash2 size={15}/></T>
      <T t="Version history & files" f={()=>setModal('note')}><History size={15}/></T>
      <T t="Save as template" f={async()=>{const n=prompt('Template name',note.title);if(n?.trim())await db.templates.add({id:uid(),name:n.trim(),content:note.content})}}>Tpl</T>
      <select value="" onChange={e=>{if(e.target.value)exportNotes([note],e.target.value,note.title||'note')}} className="btn bg-transparent border dark:border-zinc-700"><option value="">Export…</option><option value="md">Markdown</option><option value="txt">TXT</option><option value="html">HTML</option><option value="doc">Word</option><option value="pdf">PDF (print)</option></select>
      <input type="datetime-local" title="Due date / reminder" value={note.dueAt?loc(note.dueAt):''} onChange={e=>{up({dueAt:e.target.value?new Date(e.target.value).getTime():null,notified:false});if(e.target.value&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission()}} className="btn bg-transparent border dark:border-zinc-700 text-xs"/>
      <select value={note.folderId??''} onChange={e=>up({folderId:e.target.value||null})} className="btn bg-transparent border dark:border-zinc-700"><option value="">No folder</option>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select>
      {tags.map(t=>{const on=note.tagIds.includes(t.id);return <button key={t.id} onClick={()=>up({tagIds:on?note.tagIds.filter(x=>x!==t.id):[...note.tagIds,t.id]})} className={`text-xs rounded-full border px-2 py-0.5 dark:border-zinc-700 ${on?'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900':''}`}>{t.name}</button>})}</>}
  </div>;
}

export default function Page(){
  const {filter,query,setQuery,selectedId,select,toggleSidebar,view,setView,setModal,rev}=useUI();const {resolvedTheme,setTheme}=useTheme();
  const notes=useLiveQuery(()=>db.notes.toArray(),[]);const folders=useLiveQuery(()=>db.folders.toArray(),[])??[];const tags=useLiveQuery(()=>db.tags.toArray(),[])??[];
  useEffect(()=>{if(localStorage.getItem('view')==='grid')setView('grid')},[]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{const m=e.ctrlKey||e.metaKey;
    if(m&&e.key.toLowerCase()==='n'){e.preventDefault();create()}
    else if(m&&e.key.toLowerCase()==='f'){e.preventDefault();document.getElementById('search')?.focus()}
    else if(e.key==='Escape')setModal(null)};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)});
  useEffect(()=>{const t=setInterval(async()=>{const now=Date.now();const due=await db.notes.filter(n=>!!n.dueAt&&n.dueAt<=now&&!n.notified&&!n.trashed).toArray();
    for(const n of due){if('Notification' in window&&Notification.permission==='granted')new Notification(n.title||'Untitled',{body:'Reminder: this note is due'});await db.notes.update(n.id,{notified:true})}},30000);return()=>clearInterval(t)},[]);
  const q=query.trim().toLowerCase();
  const visible=(notes??[]).filter(n=>{const f=filter.type;
    if(f==='trash')return n.trashed;if(n.trashed)return false;if(f==='archive')return n.archived;if(n.archived)return false;
    if(f==='favorites')return n.favorite;if(f==='pinned')return n.pinned;if(f==='folder')return n.folderId===filter.id;if(f==='tag')return n.tagIds.includes(filter.id!);return true})
    .filter(n=>!q||n.title.toLowerCase().includes(q)||strip(n.content).toLowerCase().includes(q)||!!folders.find(f=>f.id===n.folderId)?.name.toLowerCase().includes(q)||tags.some(t=>n.tagIds.includes(t.id)&&t.name.toLowerCase().includes(q)))
    .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt);
  const sel=notes?.find(n=>n.id===selectedId);const grid=view==='grid'&&!sel;
  const title=filter.type==='folder'?folders.find(f=>f.id===filter.id)?.name:filter.type==='tag'?tags.find(t=>t.id===filter.id)?.name:titles[filter.type];
  const create=async()=>select(await newNote(filter.type==='folder'?filter.id!:null));
  return <div className="h-screen flex flex-col">
    <header className="print:hidden flex items-center gap-2 border-b dark:border-zinc-800 px-3 py-2">
      <button className="btn" onClick={toggleSidebar}><Menu size={18}/></button>
      <div className="relative flex-1 max-w-md"><Search size={15} className="absolute left-2.5 top-2.5 text-zinc-400"/><input id="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notes, folders, tags…" className="w-full rounded-md border dark:border-zinc-700 bg-transparent pl-8 pr-2 py-1.5 text-sm outline-none"/></div>
      <button className="btn" title="List / grid" onClick={()=>setView(view==='grid'?'list':'grid')}>{view==='grid'?<ListIcon size={18}/>:<LayoutGrid size={18}/>}</button>
      <button className="btn" title="Dashboard, templates, backup" onClick={()=>setModal('tools')}><BarChart3 size={18}/></button>
      <button className="btn" onClick={()=>setTheme(resolvedTheme==='dark'?'light':'dark')}>{resolvedTheme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button>
      <button onClick={create} className="rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 text-sm inline-flex items-center gap-1"><Plus size={15}/>New</button>
    </header>
    <div className="flex flex-1 min-h-0">
      <Side/>
      <section className={`${sel?'hidden md:flex w-full md:w-80 shrink-0':'flex flex-1'} flex-col border-r dark:border-zinc-800 print:hidden`}>
        <div className="px-4 py-3"><h1 className="font-semibold">{title}</h1><p className="text-xs text-zinc-500">{visible.length} notes</p></div>
        <div className={grid?'grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 content-start flex-1 overflow-auto':'flex-1 overflow-auto'}>
          {notes&&!visible.length&&<p className="p-6 text-sm text-zinc-500 text-center col-span-full">{q?'No notes match your search.':'Nothing here yet.'}</p>}
          {visible.map(n=><div key={n.id} onClick={()=>select(n.id)} className={`px-4 py-2.5 ${grid?'rounded-lg border dark:border-zinc-800':'border-b dark:border-zinc-900'} cursor-pointer ${n.id===selectedId?'bg-zinc-100 dark:bg-zinc-800':'hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}>
            <div className="flex items-center gap-1 font-medium text-sm truncate">{n.pinned&&<Pin size={12}/>}{n.favorite&&<Star size={12}/>}{n.title||'Untitled'}{!!n.dueAt&&n.dueAt<Date.now()&&<span className="ml-auto text-[10px] text-red-500">overdue</span>}</div>
            <div className="text-xs text-zinc-500 truncate">{strip(n.content)||'No content'}</div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5"><Clock size={10}/>{new Date(n.updatedAt).toLocaleString()}</div></div>)}
        </div>
      </section>
      <main className={`${sel?'flex':'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {sel?<><div className="md:hidden px-3 pt-2"><button className="btn" onClick={()=>select(null)}>← Back</button></div><Bar note={sel}/><div className="flex-1 min-h-0"><Editor key={sel.id+'-'+rev} note={sel}/></div></>
        :<div className="m-auto text-center text-zinc-500"><FileText className="mx-auto mb-2" size={36}/><p className="text-sm">Select a note or create a new one.</p></div>}
      </main>
    </div>
    <Tools/><NoteModal note={sel}/>
  </div>;
}
