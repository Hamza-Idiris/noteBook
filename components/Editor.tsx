'use client';
import {useEditor,EditorContent} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import {useEffect,useRef,useState} from 'react';
import {Bold,Italic,Underline as U,Strikethrough,Heading1,Heading2,Heading3,List,ListOrdered,ListChecks,Quote,Code,Link as L,Minus,Highlighter,Undo,Redo} from 'lucide-react';
import {db,autoSnap,Note} from '@/lib/db';
type St='saved'|'saving'|'unsaved'|'failed';
export default function Editor({note}:{note:Note}){
  const [title,setTitle]=useState(note.title);const [st,setSt]=useState<St>('saved');
  const timer=useRef<any>(null);const pending=useRef<Partial<Note>|null>(null);
  const flush=async()=>{clearTimeout(timer.current);const p=pending.current;if(!p)return;pending.current=null;setSt('saving');
    try{if(p.content!==undefined){const prev=await db.notes.get(note.id);if(prev)await autoSnap(prev)}await db.notes.update(note.id,{...p,updatedAt:Date.now()});setSt('saved')}catch{pending.current=p;setSt('failed')}};
  const queue=(p:Partial<Note>)=>{pending.current={...pending.current,...p};setSt('unsaved');clearTimeout(timer.current);timer.current=setTimeout(flush,600)};
  const ed=useEditor({immediatelyRender:false,content:note.content,
    extensions:[StarterKit,Underline,Link.configure({openOnClick:false,protocols:['http','https','mailto']}),TaskList,TaskItem.configure({nested:true}),Highlight,Placeholder.configure({placeholder:'Start writing…'})],
    editorProps:{attributes:{class:'prose-ed'}},onUpdate:({editor})=>queue({content:editor.getHTML()})});
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();flush()}};const b=()=>{flush()};
    window.addEventListener('keydown',h);window.addEventListener('beforeunload',b);return()=>{window.removeEventListener('keydown',h);window.removeEventListener('beforeunload',b);flush()}},[]);
  if(!ed)return null;
  const B=({on,act,children,t}:any)=><button title={t} onClick={act} className={`btn ${on?'btn-on':''}`}>{children}</button>;
  const c=()=>ed.chain().focus();
  const link=()=>{const u=prompt('URL');if(u===null)return;if(u==='')c().unsetLink().run();else if(/^(https?:|mailto:)/i.test(u))c().setLink({href:u}).run();else alert('Only http, https or mailto links are allowed.')};
  return <div className="flex flex-col h-full">
    <div className="flex flex-wrap items-center gap-0.5 border-b px-3 py-1 dark:border-zinc-800 print:hidden">
      <B t="Bold" on={ed.isActive('bold')} act={()=>c().toggleBold().run()}><Bold size={16}/></B>
      <B t="Italic" on={ed.isActive('italic')} act={()=>c().toggleItalic().run()}><Italic size={16}/></B>
      <B t="Underline" on={ed.isActive('underline')} act={()=>c().toggleUnderline().run()}><U size={16}/></B>
      <B t="Strike" on={ed.isActive('strike')} act={()=>c().toggleStrike().run()}><Strikethrough size={16}/></B>
      <B t="Highlight" on={ed.isActive('highlight')} act={()=>c().toggleHighlight().run()}><Highlighter size={16}/></B>
      <B t="H1" on={ed.isActive('heading',{level:1})} act={()=>c().toggleHeading({level:1}).run()}><Heading1 size={16}/></B>
      <B t="H2" on={ed.isActive('heading',{level:2})} act={()=>c().toggleHeading({level:2}).run()}><Heading2 size={16}/></B>
      <B t="H3" on={ed.isActive('heading',{level:3})} act={()=>c().toggleHeading({level:3}).run()}><Heading3 size={16}/></B>
      <B t="Bullets" on={ed.isActive('bulletList')} act={()=>c().toggleBulletList().run()}><List size={16}/></B>
      <B t="Numbers" on={ed.isActive('orderedList')} act={()=>c().toggleOrderedList().run()}><ListOrdered size={16}/></B>
      <B t="Checklist" on={ed.isActive('taskList')} act={()=>c().toggleTaskList().run()}><ListChecks size={16}/></B>
      <B t="Quote" on={ed.isActive('blockquote')} act={()=>c().toggleBlockquote().run()}><Quote size={16}/></B>
      <B t="Code" on={ed.isActive('codeBlock')} act={()=>c().toggleCodeBlock().run()}><Code size={16}/></B>
      <B t="Link" on={ed.isActive('link')} act={link}><L size={16}/></B>
      <B t="Divider" act={()=>c().setHorizontalRule().run()}><Minus size={16}/></B>
      <B t="Undo" act={()=>c().undo().run()}><Undo size={16}/></B>
      <B t="Redo" act={()=>c().redo().run()}><Redo size={16}/></B>
      <span className={`ml-auto text-xs ${st==='failed'?'text-red-500':'text-zinc-500'}`}>{{saved:'Saved',saving:'Saving...',unsaved:'Unsaved changes',failed:'Save failed'}[st]}</span>
    </div>
    <div className="flex-1 overflow-auto px-6 py-4 max-w-3xl w-full mx-auto">
      <input value={title} onChange={e=>{setTitle(e.target.value);queue({title:e.target.value})}} placeholder="Untitled" className="w-full text-3xl font-bold bg-transparent outline-none mb-3"/>
      <EditorContent editor={ed}/>
    </div>
  </div>;
}
