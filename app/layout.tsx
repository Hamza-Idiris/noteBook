import './globals.css';
import type {Metadata} from 'next';
import {ThemeProvider} from 'next-themes';
import SW from '@/components/SW';
export const metadata:Metadata={title:'Notes',description:'Local-first notes',manifest:'/manifest.json'};
export default function Root({children}:{children:React.ReactNode}){
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider attribute="class" defaultTheme="system" enableSystem><SW/>{children}</ThemeProvider></body></html>;
}
