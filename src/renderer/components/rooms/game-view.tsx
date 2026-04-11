import type { Id } from '../../../../convex/_generated/dataModel';
import { GameLobby } from './game-lobby';
import { GameResults } from './game-results';
import { JeopardyGame } from './jeopardy-game';
import { QuizBattle } from './quiz-battle';

interface GamePlayer {
  _id: Id<'studyGamePlayers'>;
  gameId: Id<'studyGames'>;
  userId: string;
  displayName: string;
  catVariant?: string;
  score: number;
  isReady: boolean;
  hasAnsweredCurrentRound: boolean;
  lastAnswerCorrect?: boolean;
  lastAnswerIndex?: number;
  createdAt: number;
}

interface GameQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface ActiveGame {
  _id: Id<'studyGames'>;
  roomId?: Id<'studyRooms'>;
  gameType: string;
  status: string;
  hostUserId: string;
  currentRound: number;
  roundPhase: string;
  roundStartedAt?: number;
  settings: string;
  revealedCells?: string;
  currentTurnUserId?: string;
  createdAt: number;
  finishedAt?: number;
  players: GamePlayer[];
  currentQuestion: GameQuestion | null;
  categoryNames: string[] | null;
}

interface GameViewProps {
  game: ActiveGame;
  currentUserId: string;
}

export function GameView({ game, currentUserId }: GameViewProps) {
  const isHost = game.hostUserId === currentUserId;

  if (game.status === 'waiting' || game.status === 'generating') {
    return <GameLobby game={game} currentUserId={currentUserId} isHost={isHost} />;
  }

  if (game.status === 'finished') {
    return <GameResults game={game} currentUserId={currentUserId} isHost={isHost} />;
  }

  // Active game
  if (game.gameType === 'quiz_battle') {
    return <QuizBattle game={game} currentUserId={currentUserId} isHost={isHost} />;
  }

  if (game.gameType === 'jeopardy') {
    return <JeopardyGame game={game} currentUserId={currentUserId} isHost={isHost} />;
  }

  return null;
}
