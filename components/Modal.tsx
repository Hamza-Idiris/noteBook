'use client';
import {X} from 'lucide-react';
export default function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 print:hidden" onClick={onClose}>
    <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-xl max-h-[85vh] overflow-auto p-5 shadow-xl" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3"><h2 className="font-semibold">{title}</h2><button onClick={onClose}><X size={18}/></button></div>{children}</div></div>;
}
