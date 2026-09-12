const PlayersStorage = require('./players-storage')

// Version allégée du memory-storage d'ao-loot-logger : on ne trace ni les containers
// (corps/coffres) ni les loots posés au sol — EvOtherGrabbedLoot donne déjà les noms de
// looteur/victime en clair dans le packet, donc aucun lookup de container n'est requis
// pour ce que /loottrack a besoin de capturer.
class MemoryStorage {
  constructor() {
    this.players = new PlayersStorage()
  }
}

module.exports = new MemoryStorage()
