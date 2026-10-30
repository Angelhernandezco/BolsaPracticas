import { notFound } from './errors.js';
export function parseId(value) {if(!/^[1-9]\d*$/.test(String(value))||!Number.isSafeInteger(Number(value)))throw notFound();return Number(value);}
