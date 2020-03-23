import { Game } from "../Game/model"
import { Player } from "../Players/model"
import { PlayerEvent, PlayerEventType } from "./model"
import { defaultDeck } from "../Deck/domain"

export const createPlayerEvent = (type: PlayerEventType, player: Player, game: Game) => ({
  game: {
    ...game,
    deck: defaultDeck,
    players: game.players.map(p => ({
      ...p,
      hand: [],
    })),
    events: [] as PlayerEvent[],
  },
  player,
  target: player.id,
  type,
}) as PlayerEvent
