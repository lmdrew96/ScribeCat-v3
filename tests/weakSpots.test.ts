import { describe, expect, it } from 'vitest';
import { type TopicStat, updateTopicStats } from '../convex/weakSpots';

describe('updateTopicStats', () => {
  it('adds a new topic with accuracy 1 on a first correct answer', () => {
    const result = updateTopicStats([], 'Photosynthesis', true, 1000);
    expect(result).toEqual([
      { topic: 'Photosynthesis', correctCount: 1, totalCount: 1, accuracy: 1, lastTestedAt: 1000 },
    ]);
  });

  it('adds a new topic with accuracy 0 on a first incorrect answer', () => {
    const result = updateTopicStats([], 'Mitosis', false, 1000);
    expect(result[0].accuracy).toBe(0);
    expect(result[0].correctCount).toBe(0);
    expect(result[0].totalCount).toBe(1);
  });

  it('updates accuracy for an existing topic, matched case-insensitively', () => {
    const existing: TopicStat[] = [
      { topic: 'Mitosis', correctCount: 1, totalCount: 2, accuracy: 0.5, lastTestedAt: 1000 },
    ];
    const result = updateTopicStats(existing, 'mitosis', true, 2000);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      topic: 'Mitosis',
      correctCount: 2,
      totalCount: 3,
      accuracy: 2 / 3,
      lastTestedAt: 2000,
    });
  });

  it('does not mutate the input array', () => {
    const existing: TopicStat[] = [
      { topic: 'Mitosis', correctCount: 1, totalCount: 1, accuracy: 1, lastTestedAt: 1000 },
    ];
    const result = updateTopicStats(existing, 'Mitosis', false, 2000);
    expect(existing[0].totalCount).toBe(1);
    expect(result[0].totalCount).toBe(2);
    expect(result).not.toBe(existing);
  });

  it('tracks multiple distinct topics independently', () => {
    let topics: TopicStat[] = [];
    topics = updateTopicStats(topics, 'Mitosis', true, 1000);
    topics = updateTopicStats(topics, 'Photosynthesis', false, 1001);
    topics = updateTopicStats(topics, 'Mitosis', false, 1002);

    expect(topics).toHaveLength(2);
    const mitosis = topics.find((t) => t.topic === 'Mitosis');
    expect(mitosis).toEqual({
      topic: 'Mitosis',
      correctCount: 1,
      totalCount: 2,
      accuracy: 0.5,
      lastTestedAt: 1002,
    });
  });
});
