import { Game } from "../Game/model"
import { Player, PlayerId } from "../Players/model"
import { PlayerEvent, PlayerEventType, PlayerEventTarget } from "./model"

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

export const createPlayerEvent = (type: PlayerEventType, player: Player, game: Game): PlayerEvent => ({
  ...createPlayerEventBase(player.id, player, game),
  type,
})
