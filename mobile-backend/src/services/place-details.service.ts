import { HttpError } from '../lib/http';

/**
 * Details + a GENUINE photo for one OSM place.
 *
 * Image chain (only explicit links from the OSM object itself; nothing guessed by name):
 *   1. OSM `wikidata` tag  → Wikidata P18 (image) → Wikimedia Commons file
 *   2. OSM `wikimedia_commons` = "File:…"   → that Commons file
 *   3. OSM `wikimedia_commons` = "Category:…" → first file in that category (the category is
 *      about this place)
 * Every image comes with author, licence and the Commons page (attribution). No stock photos,
 * no category illustrations, no generated images: if the chain finds nothing → image: null.
 */

export interface PlaceImage {
  url: string;
  pageUrl: string;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  source: 'Wikimedia Commons';
}

export interface PlaceDetails {
  id: string;
  name: string | null;
  nameEn: string | null;
  tags: {
    website: string | null;
    openingHours: string | null;
    surface: string | null;
    lit: boolean | null;
    access: string | null;
    description: string | null;
  };
  address: string | null;
  image: PlaceImage | null;
  osmUrl: string;
  attribution: string;
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;
const UA = { 'User-Agent': 'OpenStrava/1.1 (fitness app; place details)' };
const TTL_MS = 7 * 24 * 3600_000;
const memory = new Map<string, { at: number; body: PlaceDetails }>();

const stripHtml = (s: unknown) =>
  typeof s === 'string' ? s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null : null;

export class PlaceDetailsService {
  constructor(private fetcher: Fetcher = (u, i) => fetch(u, i), private now: () => number = Date.now) {}

  private async json(url: string) {
    const res = await this.fetcher(url, { headers: UA });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json() as Promise<any>;
  }

  private async commonsImage(fileTitle: string): Promise<PlaceImage | null> {
    const title = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
    const qs = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: '800', titles: title });
    const d = await this.json(`https://commons.wikimedia.org/w/api.php?${qs}`);
    const page: any = Object.values(d?.query?.pages ?? {})[0];
    const ii = page?.imageinfo?.[0];
    if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime ?? 'image/jpeg')) return null;
    const m = ii.extmetadata ?? {};
    return {
      url: ii.thumburl || ii.url,
      pageUrl: ii.descriptionurl,
      author: stripHtml(m.Artist?.value),
      license: stripHtml(m.LicenseShortName?.value),
      licenseUrl: stripHtml(m.LicenseUrl?.value),
      source: 'Wikimedia Commons',
    };
  }

  private async firstFileInCategory(category: string): Promise<string | null> {
    const qs = new URLSearchParams({ action: 'query', format: 'json', list: 'categorymembers', cmtype: 'file', cmlimit: '5', cmtitle: category });
    const d = await this.json(`https://commons.wikimedia.org/w/api.php?${qs}`);
    const f = (d?.query?.categorymembers ?? []).find((m: any) => /\.(jpe?g|png|webp)$/i.test(m.title));
    return f?.title ?? null;
  }

  private async findImage(tags: Record<string, string>): Promise<PlaceImage | null> {
    try {
      if (/^Q\d+$/.test(tags.wikidata ?? '')) {
        const d = await this.json(`https://www.wikidata.org/wiki/Special:EntityData/${tags.wikidata}.json`);
        const p18 = d?.entities?.[tags.wikidata]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (typeof p18 === 'string') {
          const img = await this.commonsImage(p18);
          if (img) return img;
        }
      }
      const commons = tags.wikimedia_commons ?? '';
      if (commons.startsWith('File:')) return await this.commonsImage(commons);
      if (commons.startsWith('Category:')) {
        const file = await this.firstFileInCategory(commons);
        if (file) return await this.commonsImage(file);
      }
    } catch (e) {
      console.warn('place image lookup failed', (e as Error).message);
    }
    return null;
  }

  async details(type: string, id: string): Promise<PlaceDetails> {
    if (!/^(node|way|relation)$/.test(type) || !/^\d{1,15}$/.test(id)) throw new HttpError(400, 'invalid_place', 'Invalid place id');
    const key = `${type}/${id}`;
    const hit = memory.get(key);
    if (hit && this.now() - hit.at < TTL_MS) return hit.body;

    let el: any;
    try {
      const d = await this.json(`https://api.openstreetmap.org/api/0.6/${type}/${id}.json`);
      el = d?.elements?.[0];
    } catch (e) {
      if (/^404 /.test((e as Error).message)) throw new HttpError(404, 'not_found', 'Place not found');
      throw new HttpError(503, 'places_unavailable', 'Place details are temporarily unavailable.');
    }
    if (!el) throw new HttpError(404, 'not_found', 'Place not found');
    const tags: Record<string, string> = el.tags ?? {};
    const address = [tags['addr:street'] && `${tags['addr:housenumber'] ?? ''} ${tags['addr:street']}`.trim(), tags['addr:suburb'], tags['addr:city']]
      .filter(Boolean)
      .join(', ');
    const body: PlaceDetails = {
      id: key,
      name: tags.name ?? null,
      nameEn: tags['name:en'] ?? null,
      tags: {
        website: tags.website ?? tags['contact:website'] ?? null,
        openingHours: tags.opening_hours ?? null,
        surface: tags.surface ?? null,
        lit: tags.lit === 'yes' ? true : tags.lit === 'no' ? false : null,
        access: tags.access ?? null,
        description: tags.description ?? null,
      },
      address: address || null,
      image: await this.findImage(tags),
      osmUrl: `https://www.openstreetmap.org/${key}`,
      attribution: '© OpenStreetMap contributors',
    };
    memory.set(key, { at: this.now(), body });
    return body;
  }
}

export const _clearPlaceDetailsCache = () => memory.clear();
