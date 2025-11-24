/**
 * Utility per badge trasporto e contenuto email (spedizionieri)
 */

import { Plane, Ship, Truck, Train, Package } from 'lucide-react';

/**
 * Configurazione badge tipo trasporto
 */
export const TRANSPORT_TYPES = {
  air: {
    label: 'Via Aerea',
    icon: Plane,
    color: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    emoji: '✈️'
  },
  sea: {
    label: 'Via Mare',
    icon: Ship,
    color: 'bg-blue-600/10 text-blue-700 border-blue-600/20',
    emoji: '🚢'
  },
  express: {
    label: 'Corriere Express',
    icon: Package,
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    emoji: '📦'
  },
  road: {
    label: 'Via Strada',
    icon: Truck,
    color: 'bg-green-600/10 text-green-700 border-green-600/20',
    emoji: '🚚'
  },
  rail: {
    label: 'Via Ferrovia',
    icon: Train,
    color: 'bg-purple-600/10 text-purple-700 border-purple-600/20',
    emoji: '🚂'
  }
} as const;

/**
 * Configurazione badge tipo contenuto
 */
export const CONTENT_TYPES = {
  quotation: {
    label: 'Preventivi',
    color: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    emoji: '💰'
  },
  rate: {
    label: 'Tariffe',
    color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    emoji: '📊'
  },
  shipment: {
    label: 'Spedizioni',
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    emoji: '📦'
  },
  documentation: {
    label: 'Documentazione',
    color: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
    emoji: '📄'
  },
  invoice: {
    label: 'Fatture',
    color: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    emoji: '🧾'
  },
  tracking: {
    label: 'Tracking',
    color: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    emoji: '📍'
  }
} as const;

/**
 * Ottieni config trasporto
 */
export function getTransportConfig(type: string | null | undefined) {
  if (!type || !(type in TRANSPORT_TYPES)) return null;
  return TRANSPORT_TYPES[type as keyof typeof TRANSPORT_TYPES];
}

/**
 * Ottieni config contenuto
 */
export function getContentConfig(type: string | null | undefined) {
  if (!type || !(type in CONTENT_TYPES)) return null;
  return CONTENT_TYPES[type as keyof typeof CONTENT_TYPES];
}
