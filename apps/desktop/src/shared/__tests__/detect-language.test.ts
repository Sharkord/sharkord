import { describe, expect, test } from 'bun:test';
import { detectLanguage } from '../detect-language';

describe('detectLanguage', () => {
  test('picks a supported language as is', () => {
    expect(detectLanguage(['fr'])).toBe('fr');
  });

  test('drops the region of a language that has no regional variant', () => {
    expect(detectLanguage(['en-US'])).toBe('en');
    expect(detectLanguage(['zh-CN'])).toBe('zh');
    expect(detectLanguage(['es-MX'])).toBe('es');
  });

  test('keeps a supported region', () => {
    expect(detectLanguage(['pt-BR'])).toBe('pt-BR');
  });

  test('gives a bare or other regional portuguese the brazilian translation', () => {
    expect(detectLanguage(['pt'])).toBe('pt-BR');
    expect(detectLanguage(['pt-PT'])).toBe('pt-BR');
  });

  test('ignores letter case', () => {
    expect(detectLanguage(['PT-br'])).toBe('pt-BR');
    expect(detectLanguage(['DE', 'IT'])).toBe('it');
  });

  test('prefers the first supported candidate in order', () => {
    expect(detectLanguage(['de', 'ru', 'fr'])).toBe('ru');
  });

  test('falls back to english when nothing is supported', () => {
    expect(detectLanguage(['de', 'ja'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
