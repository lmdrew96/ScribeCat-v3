import { AppLayout } from '@/components/app-layout';
import { FriendsView } from '@/components/friends/friends-view';
import { HomeView } from '@/components/home-view';
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

const studySessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/study/$sessionId',
  component: StudyView,
});

const friendsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/friends',
  component: FriendsView,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  studyIndexRoute,
  studySessionRoute,
  friendsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
