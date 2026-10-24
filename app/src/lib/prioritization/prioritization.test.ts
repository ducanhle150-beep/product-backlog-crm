import { describe, expect, it } from 'vitest';
import type { Settings } from '../../data/types';
import { DEFAULT_SETTINGS } from '../../data/seed';
import { computeCaf, phaseOf, saeIceCaf } from './saeIceCaf';
import { wsjf, rice } from './scoring';
import { analyzeMoscowVotes, kanoCategory, moscowTotal, riskValueQuadrant, valueEffortQuadrant } from './categorical';

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  competitors: [
    { id: 'bon', name: 'BON', type: 'direct' },
    { id: 'casa', name: 'CASA', type: 'direct' },
    { id: 'smile', name: 'Smile', type: 'indirect' },
    { id: 'appstle', name: 'Appstle', type: 'indirect' },
  ],
};
const ctx = { settings };

describe('SAE ICE × CAF (Methodology + xlsx)', () => {
  it('CAF khớp dòng "Hyperlink button - open popup" trong xlsx = 0.6375', () => {
    expect(computeCaf({ adoption: { bon: 'good', casa: 'basic', smile: 'no' } }, settings)).toBeCloseTo(0.6375, 6);
  });
  it('CAF khớp dòng "Custom CSS for Loyalty popup" = 0.175', () => {
    expect(computeCaf({ adoption: { bon: 'no', casa: 'no', appstle: 'basic' } }, settings)).toBeCloseTo(0.175, 6);
  });
  it('không có đối thủ → CAF = 0 → Final = ICE', () => {
    expect(saeIceCaf.compute({ impact: 5, confidence: 4, ease: 3 }, ctx)).toBe(60);
  });
  it('max boost +130%: ICE 1000 × 2.3 = 2300', () => {
    expect(saeIceCaf.compute({ impact: 10, confidence: 10, ease: 10, adoption: { bon: 'advanced', casa: 'advanced' } }, ctx)).toBeCloseTo(2300);
  });
  it('thiếu input → null', () => {
    expect(saeIceCaf.compute({ impact: 5, confidence: 4 }, ctx)).toBeNull();
  });
  it('ngưỡng phase: >300 P1, 200–300 P2, 100–<200 P3, <100 P4', () => {
    expect(phaseOf(300.1, settings).order).toBe(1);
    expect(phaseOf(300, settings).order).toBe(2);
    expect(phaseOf(200, settings).order).toBe(2);
    expect(phaseOf(199.9, settings).order).toBe(3);
    expect(phaseOf(100, settings).order).toBe(3);
    expect(phaseOf(99, settings).order).toBe(4);
  });
});

describe('MoSCoW (slide 4)', () => {
  const sh = ['s1', 's2', 's3', 's4', 's5'];
  const vote = (...b: ('M' | 'S' | 'C' | 'W')[]) => ({ votes: Object.fromEntries(b.map((v, i) => [sh[i], v])) });
  it('Feature 2 = 43 điểm, Feature 6 = 23', () => {
    expect(moscowTotal(vote('M', 'M', 'M', 'C', 'M'), settings)).toBe(43);
    expect(moscowTotal(vote('C', 'M', 'W', 'M', 'W'), settings)).toBe(23);
  });
  it('phát hiện hoà điểm và stakeholder vote như nhau', () => {
    const items = [
      { id: 'f3', inputs: vote('M', 'M', 'M', 'W', 'S') }, // 37
      { id: 'f7', inputs: vote('S', 'M', 'M', 'C', 'S') }, // 37
      { id: 'f6', inputs: vote('C', 'M', 'W', 'M', 'W') },
    ];
    const r = analyzeMoscowVotes(items, settings);
    expect(r.ties).toEqual([{ total: 37, ids: ['f3', 'f7'] }]);
    expect(r.flatVoters).toEqual(['s2']);
  });
});

describe('WSJF (slide 12, tính lại đúng công thức)', () => {
  it('New Quickstart: (3+1+1)/1 = 5', () => expect(wsjf.compute({ bv: 3, tc: 1, rroe: 1, jobSize: 1 }, ctx)).toBe(5));
  it('DevOps: (1+2+2)/2 = 2.5', () => expect(wsjf.compute({ bv: 1, tc: 2, rroe: 2, jobSize: 2 }, ctx)).toBe(2.5));
  it('Mobile: risk cộng vào Job Size (2+3+3)/(5+2)', () => expect(wsjf.compute({ bv: 2, tc: 3, rroe: 3, jobSize: 5, risk: 2 }, ctx)).toBeCloseTo(8 / 7));
});

describe('Khác', () => {
  it('RICE = R×I×C%/E', () => expect(rice.compute({ reach: 200, impact: 2, confidence: 80, effort: 2 }, ctx)).toBe(160));
  it('Risk/Value quadrant order', () => {
    expect(riskValueQuadrant(8, 8).order).toBe(1);
    expect(riskValueQuadrant(8, 2).order).toBe(2);
    expect(riskValueQuadrant(2, 2).order).toBe(3);
    expect(riskValueQuadrant(2, 8).order).toBe(4);
  });
  it('Value/Effort quick win', () => expect(valueEffortQuadrant(9, 2).label).toBe('Quick win'));
  it('Kano table: like/dislike = performance, expect/dislike = must, like/neutral = attractive', () => {
    expect(kanoCategory({ functional: 'like', dysfunctional: 'dislike' })).toBe('performance');
    expect(kanoCategory({ functional: 'expect', dysfunctional: 'dislike' })).toBe('must');
    expect(kanoCategory({ functional: 'like', dysfunctional: 'neutral' })).toBe('attractive');
  });
});
