import QRCode from 'qrcode';
import { FactoryState, CanvasNode, EquipmentNode, ContainerNode } from '../types';

export type LinkParamType = 'element' | 'tag' | 'barcode' | 'stockCode';

export interface ParsedElementQuery {
  param: LinkParamType;
  value: string;
}

/**
 * Returns full absolute URL for an element.
 */
export function generateElementUrl(
  node: CanvasNode,
  paramType: LinkParamType = 'element'
): string {
  const origin = window.location.origin || '';
  const pathname = window.location.pathname || '';

  let paramKey = 'element';
  let paramVal = node.id;

  if (paramType === 'tag' && node.tag) {
    paramKey = 'tag';
    paramVal = node.tag;
  } else if (paramType === 'barcode') {
    const eq = node as EquipmentNode;
    const barcode = eq.barcode || eq.barkod;
    if (barcode) {
      paramKey = 'barcode';
      paramVal = barcode;
    }
  } else if (paramType === 'stockCode') {
    const eq = node as EquipmentNode;
    const stockCode = eq.stockCode || eq.stokKod;
    if (stockCode) {
      paramKey = 'stockCode';
      paramVal = stockCode;
    }
  }

  const url = new URL(`${origin}${pathname}`);
  url.searchParams.set(paramKey, paramVal);
  return url.toString();
}

/**
 * Safe clipboard write with legacy textarea fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}

/**
 * Parses query params or hash for element deep link identifiers.
 */
export function parseElementFromLocation(search = window.location.search, hash = window.location.hash): ParsedElementQuery | null {
  try {
    const params = new URLSearchParams(search);

    // Check direct element ID
    const elementId = params.get('element') || params.get('eq') || params.get('node') || params.get('id');
    if (elementId) {
      return { param: 'element', value: elementId };
    }

    // Check tag
    const tag = params.get('tag');
    if (tag) {
      return { param: 'tag', value: tag };
    }

    // Check barcode
    const barcode = params.get('barcode') || params.get('barkod');
    if (barcode) {
      return { param: 'barcode', value: barcode };
    }

    // Check stockCode
    const stockCode = params.get('stockCode') || params.get('stokKod') || params.get('stock_code') || params.get('stok_kod');
    if (stockCode) {
      return { param: 'stockCode', value: stockCode };
    }

    // Check hash (e.g. #element=eq-1 or #tag=CNC-01 or #eq-1)
    if (hash && hash.length > 1) {
      const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
      if (cleanHash.includes('=')) {
        const hashParams = new URLSearchParams(cleanHash);
        const hElement = hashParams.get('element') || hashParams.get('eq') || hashParams.get('id');
        if (hElement) return { param: 'element', value: hElement };
        const hTag = hashParams.get('tag');
        if (hTag) return { param: 'tag', value: hTag };
        const hBarcode = hashParams.get('barcode') || hashParams.get('barkod');
        if (hBarcode) return { param: 'barcode', value: hBarcode };
        const hStockCode = hashParams.get('stockCode') || hashParams.get('stokKod');
        if (hStockCode) return { param: 'stockCode', value: hStockCode };
      } else {
        // Direct hash ID like #eq-cnc-01 or #cont-line-a
        return { param: 'element', value: cleanHash };
      }
    }
  } catch (err) {
    console.warn('Error parsing element from URL', err);
  }

  return null;
}

/**
 * Finds a node in the state by parsed query or loose search query.
 */
export function findElementInState(
  state: FactoryState,
  query: ParsedElementQuery | string
): CanvasNode | null {
  const { equipment, containers } = state;

  if (typeof query === 'string') {
    const raw = query.trim();
    if (!raw) return null;

    // Check exact id match
    const byId = equipment.find(e => e.id === raw) || containers.find(c => c.id === raw);
    if (byId) return byId;

    // Check tag
    const byTag = equipment.find(e => e.tag.toLowerCase() === raw.toLowerCase()) || 
                  containers.find(c => c.tag.toLowerCase() === raw.toLowerCase());
    if (byTag) return byTag;

    // Check barcode
    const byBarcode = equipment.find(e => (e.barcode && e.barcode.toLowerCase() === raw.toLowerCase()) || (e.barkod && e.barkod.toLowerCase() === raw.toLowerCase()));
    if (byBarcode) return byBarcode;

    // Check stock code
    const byStockCode = equipment.find(e => (e.stockCode && e.stockCode.toLowerCase() === raw.toLowerCase()) || (e.stokKod && e.stokKod.toLowerCase() === raw.toLowerCase()));
    if (byStockCode) return byStockCode;

    return null;
  }

  const { param, value } = query;
  const val = value.trim();

  if (param === 'element') {
    return equipment.find(e => e.id === val) || containers.find(c => c.id === val) || null;
  }

  if (param === 'tag') {
    return equipment.find(e => e.tag.toLowerCase() === val.toLowerCase()) || 
           containers.find(c => c.tag.toLowerCase() === val.toLowerCase()) || null;
  }

  if (param === 'barcode') {
    return equipment.find(e => (e.barcode && e.barcode.toLowerCase() === val.toLowerCase()) || (e.barkod && e.barkod.toLowerCase() === val.toLowerCase())) || null;
  }

  if (param === 'stockCode') {
    return equipment.find(e => (e.stockCode && e.stockCode.toLowerCase() === val.toLowerCase()) || (e.stokKod && e.stokKod.toLowerCase() === val.toLowerCase())) || null;
  }

  return null;
}

/**
 * Generates a QR Code as data URL.
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}
