import { Game } from "../Game/model"
import { Move } from "../Moves/model"
import { Player, PlayerId } from "../Players/model"
import { PlayerEvent, PlayerEventType, PlayerEventTarget, AllPlayers } from "./model"

const createPlayerEventBase = (
  target: PlayerEventTarget,
  { hand, id, name, type }: Player,
  {
    currentPlayerIndex,
    discardPile,
    moveCounter,
    playersCount,
    stage,
  }: Game,
) => ({
  gameState: {
    currentPlayerIndex,
    discardPile,
    moveCounter,
    playersCount,
    stage,
  },
  playerState: {
    hand,
    id,
    name,
    type,
  },
  target  ,
})

export const createPlayerEventGameStarted = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(AllPlayers, player, game),
  type: PlayerEventType.GameStarted,
})

export const createPlayerEventGameEnded = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(AllPlayers, player, game),
  type: PlayerEventType.GameEnded,
})

export const createPlayerEventPlay = (player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(player.id, player, game),
  type: PlayerEventType.Play,
})