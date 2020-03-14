import * as Cards from "../Cards/domain"
import { Hand, Card } from "../Cards/model"
import { Player, PlayerId, PlayerPublicState } from "./model"

export const create = (id: PlayerId, name: string, type = "", hand: Hand = []): Player => ({
  hand,
  id,
  name,
  type,
})

export const createFromPublicState = (playerPublicState: PlayerPublicState): Player => ({
  ...playerPublicState,
})

export const addCards = (player: Player, cards: Card[]) => ({
  ...player,
  hand: [...player.hand, ...cards],
})

export const removeCard = (player: Player, card: Card) => ({
  ...player,
  hand: player.hand.filter(Cards.notEqual(card))
})
