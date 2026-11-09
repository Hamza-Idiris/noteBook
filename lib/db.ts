import Dexie, {Table} from 'dexie';
export interface Note{id:string;title:string;content:string;folderId:string|null;tagIds:string[];pinned:boolean;favorite:boolean;archived:boolean;trashed:boolean;createdAt:number;updatedAt:number;dueAt?:number|null;notified?:boolean}
export interface Folder{id:string;name:string}
export interface Tag{id:string;name:string}
export interface Snapshot{id:string;noteId:string;title:string;content:string;createdAt:number;manual:boolean}
export interface Template{id:string;name:string;content:string}
export interface Attachment{id:string;noteId:string;name:string;type:string;size:number;blob:Blob}
class NotesDB extends Dexie{
  notes!:Table<Note,string>;folders!:Table<Folder,string>;tags!:Table<Tag,string>;snapshots!:Table<Snapshot,string>;templates!:Table<Template,string>;attachments!:Table<Attachment,string>;
  constructor(){super('notes-app');
    this.version(1).stores({notes:'id,folderId,updatedAt',folders:'id',tags:'id'});
    this.version(2).stores({notes:'id,folderId,updatedAt',folders:'id',tags:'id',snapshots:'id,noteId,createdAt',templates:'id',attachments:'id,noteId'});}
}
export const db=new NotesDB();
export const uid=()=>crypto.randomUUID();
export async function newNote(folderId:string|null=null,content='',title=''){
  const now=Date.now();const n:Note={id:uid(),title,content,folderId,tagIds:[],pinned:false,favorite:false,archived:false,trashed:false,createdAt:now,updatedAt:now};
  await db.notes.add(n);return n.id;
}
export const snap=(n:Note,manual=false)=>db.snapshots.add({id:uid(),noteId:n.id,title:n.title,content:n.content,createdAt:Date.now(),manual});
export async function autoSnap(n:Note){ // snapshot at most every 5 min, only if content differs
  if(!n.content)return;const l=(await db.snapshots.where('noteId').equals(n.id).sortBy('createdAt')).pop();
  if(!l||(Date.now()-l.createdAt>300000&&l.content!==n.content))await snap(n);
}
