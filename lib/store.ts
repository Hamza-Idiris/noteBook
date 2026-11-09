import {create} from 'zustand';
export type Filter={type:'all'|'favorites'|'pinned'|'archive'|'trash'|'folder'|'tag';id?:string};
type Modal=null|'tools'|'note';
interface S{filter:Filter;setFilter:(f:Filter)=>void;selectedId:string|null;select:(id:string|null)=>void;query:string;setQuery:(q:string)=>void;sidebar:boolean;toggleSidebar:()=>void;
view:'list'|'grid';setView:(v:'list'|'grid')=>void;modal:Modal;setModal:(m:Modal)=>void;rev:number;bump:()=>void}
export const useUI=create<S>(s=>({filter:{type:'all'},setFilter:f=>s({filter:f,selectedId:null}),selectedId:null,select:id=>s({selectedId:id,modal:null}),query:'',setQuery:q=>s({query:q}),sidebar:true,toggleSidebar:()=>s(x=>({sidebar:!x.sidebar})),
view:'list',setView:v=>{try{localStorage.setItem('view',v)}catch{}s({view:v})},modal:null,setModal:m=>s({modal:m}),rev:0,bump:()=>s(x=>({rev:x.rev+1}))}));
