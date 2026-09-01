import { describe, expect, test } from 'bun:test';
import { parsePluginTabs } from '../components';

const Component = () => null;

// memo, forwardRef and lazy all return objects rather than functions, and this
// codebase writes every component as memo(...), so they have to be accepted
const MEMO_LIKE = { $$typeof: Symbol.for('react.memo'), type: Component };

describe('parsePluginTabs', () => {
  test('should keep well formed tabs in the order given', () => {
    const tabs = parsePluginTabs([
      { id: 'dashboard', label: 'Dashboard', component: Component },
      { id: 'feeds', label: 'Feeds', component: Component }
    ]);

    expect(tabs.map((tab) => tab.id)).toEqual(['dashboard', 'feeds']);
  });

  // the tabs come from a plugin's own bundle, so anything malformed is dropped
  // rather than allowed to break the whole view
  test('should drop entries that are not a usable tab', () => {
    expect(
      parsePluginTabs([
        { id: 'ok', label: 'Ok', component: Component },
        { id: 'no-component', label: 'Nope' },
        { id: '', label: 'Empty id', component: Component },
        { id: 'no-label', label: '', component: Component },
        { id: 'not-a-function', label: 'Nope', component: 'oops' },
        null,
        'nonsense'
      ])
    ).toHaveLength(1);
  });

  test('should accept a component that is not a plain function', () => {
    const tabs = parsePluginTabs([
      { id: 'memoed', label: 'Memoed', component: MEMO_LIKE }
    ]);

    expect(tabs).toHaveLength(1);
  });

  test('should still refuse an object that is not a component', () => {
    expect(
      parsePluginTabs([
        { id: 'nope', label: 'Nope', component: { not: 'a component' } }
      ])
    ).toEqual([]);
  });

  test('should refuse a tab that would shadow a built in one', () => {
    const tabs = parsePluginTabs([
      { id: 'settings', label: 'My Settings', component: Component },
      { id: 'logs', label: 'My Logs', component: Component },
      { id: 'commands', label: 'My Commands', component: Component },
      { id: 'mine', label: 'Mine', component: Component }
    ]);

    expect(tabs.map((tab) => tab.id)).toEqual(['mine']);
  });

  test('should keep only the first tab claiming an id', () => {
    const tabs = parsePluginTabs([
      { id: 'dup', label: 'First', component: Component },
      { id: 'dup', label: 'Second', component: Component }
    ]);

    expect(tabs).toHaveLength(1);
    expect(tabs[0]!.label).toBe('First');
  });

  test('should return nothing when the export is missing or wrong', () => {
    expect(parsePluginTabs(undefined)).toEqual([]);
    expect(parsePluginTabs({ id: 'not-an-array' })).toEqual([]);
  });
});
