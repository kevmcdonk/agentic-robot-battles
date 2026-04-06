import { detectLines, checkHouse, checkBingo, generateCard, WINNING_LINES } from '../lib/bingo';
import { Phrase } from '../lib/types';

function makePhrase(id: string, text: string, isActive = true): Phrase {
  return { id, text, isActive, category: null };
}

describe('WINNING_LINES', () => {
  it('should have 12 winning lines', () => {
    expect(WINNING_LINES).toHaveLength(12);
  });
});

describe('detectLines', () => {
  it('detects horizontal line 1', () => {
    const lines = detectLines([0, 1, 2, 3, 4]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([0, 1, 2, 3, 4]);
  });

  it('detects horizontal line 3', () => {
    const lines = detectLines([10, 11, 12, 13, 14]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([10, 11, 12, 13, 14]);
  });

  it('detects horizontal line 5', () => {
    const lines = detectLines([20, 21, 22, 23, 24]);
    expect(lines).toHaveLength(1);
  });

  it('detects vertical line 1', () => {
    const lines = detectLines([0, 5, 10, 15, 20]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([0, 5, 10, 15, 20]);
  });

  it('detects vertical line 5', () => {
    const lines = detectLines([4, 9, 14, 19, 24]);
    expect(lines).toHaveLength(1);
  });

  it('detects main diagonal', () => {
    const lines = detectLines([0, 6, 12, 18, 24]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([0, 6, 12, 18, 24]);
  });

  it('detects anti-diagonal', () => {
    const lines = detectLines([4, 8, 12, 16, 20]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([4, 8, 12, 16, 20]);
  });

  it('detects multiple lines', () => {
    const lines = detectLines([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty when no lines complete', () => {
    const lines = detectLines([0, 1, 2, 3]);
    expect(lines).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    expect(detectLines([])).toHaveLength(0);
  });
});

describe('checkHouse', () => {
  it('returns true when a line is complete', () => {
    expect(checkHouse([0, 1, 2, 3, 4])).toBe(true);
  });

  it('returns false when no line is complete', () => {
    expect(checkHouse([0, 1, 2, 3])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(checkHouse([])).toBe(false);
  });

  it('returns true for diagonal', () => {
    expect(checkHouse([0, 6, 12, 18, 24])).toBe(true);
  });
});

describe('checkBingo', () => {
  it('returns true when all 25 squares marked', () => {
    const all = Array.from({ length: 25 }, (_, i) => i);
    expect(checkBingo(all)).toBe(true);
  });

  it('returns false when only 24 marked', () => {
    const almost = Array.from({ length: 24 }, (_, i) => i);
    expect(checkBingo(almost)).toBe(false);
  });

  it('returns false for empty', () => {
    expect(checkBingo([])).toBe(false);
  });
});

describe('generateCard', () => {
  it('generates exactly 25 phrase ids', () => {
    const phrases = Array.from({ length: 30 }, (_, i) => makePhrase(`id-${i}`, `Phrase ${i}`));
    const card = generateCard(phrases);
    expect(card).toHaveLength(25);
  });

  it('generates unique ids', () => {
    const phrases = Array.from({ length: 30 }, (_, i) => makePhrase(`id-${i}`, `Phrase ${i}`));
    const card = generateCard(phrases);
    const unique = new Set(card);
    expect(unique.size).toBe(25);
  });

  it('throws when fewer than 25 active phrases', () => {
    const phrases = Array.from({ length: 10 }, (_, i) => makePhrase(`id-${i}`, `Phrase ${i}`));
    expect(() => generateCard(phrases)).toThrow();
  });

  it('throws when no phrases', () => {
    expect(() => generateCard([])).toThrow();
  });

  it('ignores inactive phrases', () => {
    const active = Array.from({ length: 25 }, (_, i) => makePhrase(`active-${i}`, `Active ${i}`, true));
    const inactive = Array.from({ length: 10 }, (_, i) => makePhrase(`inactive-${i}`, `Inactive ${i}`, false));
    const card = generateCard([...active, ...inactive]);
    const inactiveIds = new Set(inactive.map((p) => p.id));
    expect(card.some((id) => inactiveIds.has(id))).toBe(false);
  });

  it('throws when all phrases inactive', () => {
    const phrases = Array.from({ length: 30 }, (_, i) => makePhrase(`id-${i}`, `Phrase ${i}`, false));
    expect(() => generateCard(phrases)).toThrow();
  });
});
