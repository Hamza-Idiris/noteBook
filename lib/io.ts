import {z} from 'zod';
import {db,uid,newNote,Note} from './db';
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export const sanitize=(h:string)=>{const d=new DOMParser().parseFromString(h,'text/html');
  d.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach(e=>e.remove());
  d.body.querySelectorAll('*').forEach(e=>[...e.attributes].forEach(a=>{if(/^on/i.test(a.name)||(/^(href|src)$/i.test(a.name)&&!/^\s*(https?:|mailto:|#)/i.test(a.value)))e.removeAttribute(a.name)}));
  return d.body.innerHTML};
export const toText=(h:string)=>new DOMParser().parseFromString(h.replace(/<\/(p|li|h[1-6]|blockquote)>|<br\s*\/?>/g,'$&\n'),'text/html').body.textContent?.trim()??'';
export const toMd=(h:string)=>h.replace(/<h([1-3])[^>]*>(.*?)<\/h\1>/g,(_,l,t)=>'#'.repeat(+l)+' '+t+'\n\n').replace(/<\/?(strong|b)>/g,'**').replace(/<\/?(em|i)>/g,'*').replace(/<\/?code>/g,'`')
  .replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g,'[$2]($1)').replace(/<li[^>]*>/g,'- ').replace(/<\/(li|p|blockquote)>/g,'\n').replace(/<br\s*\/?>/g,'\n').replace(/<hr\s*\/?>/g,'\n---\n').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const inl=(s:string)=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>').replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g,'<a href="$2">$1</a>');
export const mdToHtml=(m:string)=>{let o='',list=false;
  for(const l of m.split(/\r?\n/)){const h=/^(#{1,3})\s+(.*)/.exec(l),li=/^\s*[-*]\s+(.*)/.exec(l);
    if(li){if(!list){o+='<ul>';list=true}o+='<li><p>'+inl(li[1])+'</p></li>';continue}
    if(list){o+='</ul>';list=false}
    if(h)o+=`<h${h[1].length}>${inl(h[2])}</h${h[1].length}>`;else if(l.trim())o+='<p>'+inl(l)+'</p>'}
  return o+(list?'</ul>':'')};
export const download=(name:string,data:BlobPart,type:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)};
export function exportNotes(ns:Note[],fmt:string,name='notes'){
  const t=(n:Note)=>n.title||'Untitled';name=name.replace(/[^\w\- ]+/g,'').trim()||'notes';
  if(fmt==='md')return download(name+'.md',ns.map(n=>`# ${t(n)}\n\n${toMd(n.content)}`).join('\n\n---\n\n'),'text/markdown');
  if(fmt==='txt')return download(name+'.txt',ns.map(n=>`${t(n)}\n\n${toText(n.content)}`).join('\n\n----------\n\n'),'text/plain');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title></head><body>`+ns.map(n=>`<h1>${esc(t(n))}</h1>${n.content}`).join('<hr>')+'</body></html>';
  if(fmt==='html')return download(name+'.html',html,'text/html');
  if(fmt==='doc')return download(name+'.doc',html,'application/msword'); // Word opens HTML-based .doc
  if(fmt==='pdf')window.print();
}
const S=z.string(),N=z.number();
const Backup=z.object({app:z.literal('notes-app'),notes:z.array(z.object({id:S,title:S,content:S,folderId:S.nullable(),tagIds:z.array(S),pinned:z.boolean(),favorite:z.boolean(),archived:z.boolean(),trashed:z.boolean(),createdAt:N,updatedAt:N,dueAt:N.nullable().optional(),notified:z.boolean().optional()})),
  folders:z.array(z.object({id:S,name:S})),tags:z.array(z.object({id:S,name:S})),templates:z.array(z.object({id:S,name:S,content:S})),
  snapshots:z.array(z.object({id:S,noteId:S,title:S,content:S,createdAt:N,manual:z.boolean()}))});
export async function exportBackup(){
  const [notes,folders,tags,templates,snapshots]=await Promise.all([db.notes.toArray(),db.folders.toArray(),db.tags.toArray(),db.templates.toArray(),db.snapshots.toArray()]);
  download(`notes-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({app:'notes-app',version:1,notes,folders,tags,templates,snapshots}),'application/json');
}
export async function importBackup(text:string){
  const r=Backup.safeParse(JSON.parse(text));if(!r.success)throw new Error('not a valid backup file');const b=r.data;
  const add=async(t:any,rows:any[])=>{const have=new Set(await t.toCollection().primaryKeys());const fresh=rows.filter(x=>!have.has(x.id));await t.bulkAdd(fresh);return fresh.length};
  const tot=b.notes.length;
  const n=await add(db.notes,b.notes.map(x=>({...x,content:sanitize(x.content)})));
  await add(db.folders,b.folders);await add(db.tags,b.tags);await add(db.templates,b.templates.map(x=>({...x,content:sanitize(x.content)})));await add(db.snapshots,b.snapshots.map(x=>({...x,content:sanitize(x.content)})));
  return `Imported ${n} new notes; ${tot-n} duplicates skipped (existing data was not overwritten).`;
}
export async function importText(file:string,text:string){
  const ext=file.split('.').pop()?.toLowerCase();if(!['md','txt','html'].includes(ext??''))throw new Error('unsupported file type');
  const html=ext==='html'?sanitize(text):ext==='md'?mdToHtml(text):text.split(/\r?\n/).map(l=>l.trim()?'<p>'+esc(l)+'</p>':'').join('');
  await newNote(null,html,file.replace(/\.[^.]+$/,''));return `Imported "${file}".`;
}
export const BUILTIN=[
 ['Meeting Notes','<h1>Meeting Notes</h1><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li><p></p></li></ul><h2>Decisions</h2><ul><li><p></p></li></ul><h2>Action items</h2><ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>'],
 ['Daily Journal','<h1>Daily Journal</h1><h2>Today I feel</h2><p></p><h2>Highlights</h2><p></p><h2>Grateful for</h2><ul><li><p></p></li></ul>'],
 ['Study Notes','<h1>Study Notes</h1><p><strong>Subject:</strong> </p><h2>Key concepts</h2><ul><li><p></p></li></ul><h2>Questions</h2><p></p><h2>Summary</h2><p></p>'],
 ['Project Planning','<h1>Project Plan</h1><h2>Goal</h2><p></p><h2>Milestones</h2><ol><li><p></p></li></ol><h2>Risks</h2><ul><li><p></p></li></ul>'],
 ['Task List','<h1>Tasks</h1><ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>'],
 ['Weekly Planner','<h1>Weekly Planner</h1><h2>Monday</h2><p></p><h2>Tuesday</h2><p></p><h2>Wednesday</h2><p></p><h2>Thursday</h2><p></p><h2>Friday</h2><p></p><h2>Weekend</h2><p></p>'],
 ['Personal Notes','<h1>Personal Notes</h1><p></p>'],
];
