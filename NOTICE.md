# Attribution

Ce logiciel est un fork partiel de **[ao-loot-logger](https://github.com/matheussampaio/ao-loot-logger)**
par Matheus Sampaio, sous licence **GPL-3.0**. Conformément à cette licence, ce fork est
lui-même distribué sous GPL-3.0 (voir `LICENSE`), et son code source reste public.

## Ce qui vient d'ao-loot-logger (repris tel quel ou légèrement adapté)

- `src/network/albion-network.js`, `src/network/photon/`, `src/network/protocol16/crc-calculator.js`
  (capture réseau via `cap`, parsing Photon bas niveau) — repris tel quel.
- `src/network/protocol18/` (décodeur Protocol 18, requis depuis la mise à jour Albion
  "Dragonfire" début septembre 2026) — repris de la PR non mergée
  [matheussampaio/ao-loot-logger#89](https://github.com/matheussampaio/ao-loot-logger/pull/89)
  (branche `proton-v18` de [@madvac](https://github.com/madvac)), elle-même sous GPL-3.0
  en tant que contribution au projet original.
- `src/storage/players-storage.js`, `src/utils/*` — repris tel quel.
- `src/items.js`, `src/items-fallback.js` (résolution des noms d'items Albion) — repris tel quel.
- `src/keyboard-input.js` — repris tel quel.
- `src/data-handler/data-handler.js`, `event-data/ev-other-grabbed-loot.js`,
  `response-data/op-join.js` — adaptés : au lieu d'écrire dans un fichier local, les
  events sont envoyés à un backend web (voir `src/reporter.js`, entièrement nouveau).

## Ce qui a été retiré par rapport à l'original

Tous les events liés à l'équipement, aux stats de combat, aux conteneurs de loot et au
suivi de guilde/alliance ont été retirés — ce fork ne garde que ce qui est nécessaire à
`/loottrack` : le loot ramassé par soi-même ou par un joueur visible, et la détection de
changement de zone (voir README.md pour le détail des limites connues).

## Ce qui est nouveau dans ce fork

- `src/reporter.js` — envoie les events au backend au lieu de les écrire sur disque.
- `src/config.js`, `src/index.js` — adaptés au nouveau flux (code de session au lieu
  d'un fichier de log local).
- `src/storage/item-entities-storage.js`, `src/data-handler/event-data/ev-new-item.js`,
  `ev-inventory-put-item.js` — le ramassage de son propre loot n'est plus un event unique
  (`EvOtherGrabbedLoot`, qui ne concerne que le loot des AUTRES joueurs visibles) mais
  deux events à corréler : un "New*Item" qui donne le type+quantité d'un item apparu
  quelque part, puis "InventoryPutItem" qui dit juste qu'un ObjectId a rejoint son
  inventaire. La correspondance objectId → item est mémorisée dans item-entities-storage.js.

## Codes d'event

Les codes d'event/opération Photon actuels (`src/config.js`) ont été validés par
recoupement avec l'énumération à jour de
[Triky313/AlbionOnline-StatisticsAnalysis](https://github.com/Triky313/AlbionOnline-StatisticsAnalysis)
(GPL-3.0, outil communautaire indépendant) — seuls les entiers et la correspondance des
paramètres ont été repris (pas de code source de ce projet).

Merci à Matheus Sampaio et aux contributeurs d'ao-loot-logger, ainsi qu'à Triky313 et aux
contributeurs de StatisticsAnalysis, pour le travail de rétro-ingénierie du protocole
réseau d'Albion Online, sans qui ce projet aurait été bien plus long à démarrer.
