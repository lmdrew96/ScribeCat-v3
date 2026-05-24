import type { SessionSummary } from '@/components/study-view';
import { useMemo, useState } from 'react';

export type SortOrder = 'newest' | 'oldest' | 'az' | 'za';

export interface SessionGroup {
  course: string; // "Uncategorized" for sessions without a course
  sessions: SessionSummary[];
}

export function useSessionList(recordings: SessionSummary[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [collapsedCourses, setCollapsedCourses] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    return [...recordings].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'az':
          return a.title.localeCompare(b.title);
        case 'za':
          return b.title.localeCompare(a.title);
      }
    });
  }, [recordings, sortOrder]);

  const isSearching = searchQuery.trim().length > 0;

  const flatResults = useMemo(() => {
    if (!isSearching) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((r) => r.title.toLowerCase().includes(q));
  }, [sorted, searchQuery, isSearching]);

  const groups = useMemo((): SessionGroup[] => {
    const map = new Map<string, SessionSummary[]>();
    for (const session of sorted) {
      const key = session.course ?? 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(session);
    }
    // Named courses first (sorted), then Uncategorized at end
    const named = Array.from(map.entries())
      .filter(([k]) => k !== 'Uncategorized')
      .sort(([a], [b]) => a.localeCompare(b));
    const uncategorized = map.get('Uncategorized');
    const result: SessionGroup[] = named.map(([course, sessions]) => ({ course, sessions }));
    if (uncategorized) result.push({ course: 'Uncategorized', sessions: uncategorized });
    return result;
  }, [sorted]);

  const toggleCourse = (course: string) => {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(course)) {
        next.delete(course);
      } else {
        next.add(course);
      }
      return next;
    });
  };

  const isCourseCollapsed = (course: string) => collapsedCourses.has(course);

  return {
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    isSearching,
    flatResults,
    groups,
    toggleCourse,
    isCourseCollapsed,
  };
}
