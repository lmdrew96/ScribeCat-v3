import { AppLayout } from '@/components/app-layout';
import { ExamStudyView } from '@/components/exam/exam-study-view';
import { FriendsView } from '@/components/friends/friends-view';
import { HomeView } from '@/components/home-view';
import { MessagesView } from '@/components/messages/messages-view';
import { StudyRoomsView } from '@/components/rooms/study-rooms-view';
import { SharedSessionView } from '@/components/shared-session-view';
import { StudyQuestPage } from '@/components/study-quest/study-quest-page';
import { StudyView } from '@/components/study-view';
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

const rootRoute = createRootRoute({
  component: AppLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeView,
});

const studyIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/study',
  component: StudyView,
});

/** Search params for a saved session. */
export interface StudySessionSearch {
  /**
   * Start playback here, in seconds — the same unit as a Nugget note's
   * `recordingTime` and `formatRecordingTime`, not the milliseconds citations use.
   */
  t?: number;
}

const studySessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/study/$sessionId',
  component: StudyView,
  // URLs get pasted and hand-edited, so a bad `t` is dropped rather than trusted.
  // The upper bound is clamped later, once the audio's duration is known.
  validateSearch: (search: Record<string, unknown>): StudySessionSearch => {
    const raw = search.t;
    const t =
      typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')
        ? Number(raw)
        : Number.NaN;
    return Number.isFinite(t) ? { t: Math.max(0, t) } : {};
  },
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  component: FriendsView,
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages',
  component: MessagesView,
});

const conversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/messages/$conversationId',
  component: MessagesView,
});

const roomsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rooms',
  component: StudyRoomsView,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rooms/$roomId',
  component: StudyRoomsView,
});

const examRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exam',
  component: ExamStudyView,
});

const examRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exam/$examRoomId',
  component: ExamStudyView,
});

const sharedSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/shared/$sessionId',
  component: SharedSessionView,
});

const studyQuestRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/study-quest',
  component: StudyQuestPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  studyIndexRoute,
  studySessionRoute,
  friendsRoute,
  messagesRoute,
  conversationRoute,
  roomsRoute,
  roomRoute,
  examRoute,
  examRoomRoute,
  sharedSessionRoute,
  studyQuestRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
