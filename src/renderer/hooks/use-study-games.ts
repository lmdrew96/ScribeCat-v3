import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

export function useActiveGame(roomId: Id<'studyRooms'> | null) {
  const game = useQuery(api.studyGames.getActiveGame, roomId ? { roomId } : 'skip');
  return {
    game: game ?? null,
    isLoading: game === undefined,
  };
}

export function useGameResults(gameId: Id<'studyGames'> | null) {
  const results = useQuery(api.studyGames.getGameResults, gameId ? { gameId } : 'skip');
  return {
    results: results ?? null,
    isLoading: results === undefined,
  };
}

export function useGameActions() {
  const createGame = useMutation(api.studyGames.createGame);
  const toggleReady = useMutation(api.studyGames.toggleReady);
  const startGame = useMutation(api.studyGames.startGame);
  const submitAnswer = useMutation(api.studyGames.submitAnswer);
  const advanceRound = useMutation(api.studyGames.advanceRound);
  const selectJeopardyCell = useMutation(api.studyGames.selectJeopardyCell);
  const skipRound = useMutation(api.studyGames.skipRound);
  const cancelGame = useMutation(api.studyGames.cancelGame);

  return {
    createGame,
    toggleReady,
    startGame,
    submitAnswer,
    advanceRound,
    selectJeopardyCell,
    skipRound,
    cancelGame,
  };
}
