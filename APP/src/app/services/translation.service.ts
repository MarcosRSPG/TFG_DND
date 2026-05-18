import { Injectable, signal } from '@angular/core';

export interface SupportedLanguage {
  code: string;
  name: string;
}

const SOURCE = 'en';
const SKIP = new Set(['Grimledger', 'GRIMLEDGER']);

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly supportedLanguages: SupportedLanguage[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
    { code: 'it', name: 'Italiano' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
  ];

  readonly selectedLanguage = signal<string>(localStorage.getItem('lang') ?? SOURCE);
  readonly isSupported = signal<boolean>('Translator' in self);
  readonly downloadProgress = signal<number | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private translator: any = null;
  private readonly cache = new Map<string, Map<string, string>>();

  async setLanguage(lang: string): Promise<void> {
    if (lang === this.selectedLanguage()) return;
    localStorage.setItem('lang', lang);
    this.selectedLanguage.set(lang);
    this.translator = null;
  }

  async translate(text: string): Promise<string> {
    if (!text || SKIP.has(text)) return text;
    const target = this.selectedLanguage();
    if (target === SOURCE) return text;
    if (!('Translator' in self)) return text;

    const langCache = this.getCache(target);
    const cached = langCache.get(text);
    if (cached !== undefined) return cached;

    if (!this.translator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.translator = await (self as any).Translator.create({
        sourceLanguage: SOURCE,
        targetLanguage: target,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        monitor: (m: any) => {
          m.addEventListener('downloadprogress', (e: any) => {
            this.downloadProgress.set(Math.round(e.loaded * 100));
          });
        },
      });
      this.downloadProgress.set(null);
    }

    try {
      const result = await this.translator.translate(text);
      langCache.set(text, result);
      return result;
    } catch {
      return text;
    }
  }

  async translateAll(texts: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const text of texts) {
      results.push(await this.translate(text));
    }
    return results;
  }

  private getCache(lang: string): Map<string, string> {
    if (!this.cache.has(lang)) this.cache.set(lang, new Map());
    return this.cache.get(lang)!;
  }
}
