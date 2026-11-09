'use client';
import {useEffect} from 'react';
export default function SW(){useEffect(()=>{if('serviceWorker' in navigator&&process.env.NODE_ENV==='production')navigator.serviceWorker.register('/sw.js').catch(()=>{});navigator.storage?.persist?.().catch(()=>{})},[]);return null}
