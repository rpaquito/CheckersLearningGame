import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import manifest from '@/public/manifest.json';

describe('manifest.json', () => {
  it('has the expected app identity fields', () => {
    expect(manifest.name).toBe('Checkers Sensei');
    expect(manifest.short_name).toBe('Checkers Sensei');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('declares an "any" 512x512 icon and a "maskable" 512x512 icon', () => {
    const anyIcon = manifest.icons.find((icon) => icon.purpose === 'any' && icon.sizes === '512x512');
    const maskableIcon = manifest.icons.find((icon) => icon.purpose === 'maskable');
    expect(anyIcon).toBeDefined();
    expect(maskableIcon).toBeDefined();
    expect(maskableIcon?.sizes).toBe('512x512');
  });

  it('every icon path in the manifest resolves to a real file on disk', () => {
    for (const icon of manifest.icons) {
      const path = join(process.cwd(), 'public', icon.src);
      expect(existsSync(path), `${icon.src} does not exist on disk`).toBe(true);
    }
  });

  it('the apple-touch-icon referenced from app/layout.tsx exists on disk', () => {
    const path = join(process.cwd(), 'public', 'icons', 'apple-touch-icon.png');
    expect(existsSync(path)).toBe(true);
  });
});
