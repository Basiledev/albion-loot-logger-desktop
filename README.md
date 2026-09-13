# Albion Loot Logger (guilde)

Logiciel de tracking de loot pour `/loottrack` (bot Discord de la guilde). Capture le
trafic réseau d'Albion Online (comme [ao-loot-logger](https://github.com/matheussampaio/ao-loot-logger),
dont ce projet est un fork partiel — voir `NOTICE.md`), détecte ton propre loot ramassé et
les changements de zone, et les envoie au site web pour comparaison avec le contenu du
coffre de guilde.

**Aucune lecture mémoire ni injection dans le jeu — uniquement de la capture réseau
passive**, comme les outils déjà utilisés par la communauté Albion (Albion Online Data
Project, radars, etc.).

## Prérequis

1. **Npcap** — [télécharger ici](https://npcap.com/#download), cocher **"Install Npcap in
   WinPcap API-compatible Mode"** pendant l'installation. C'est le seul logiciel à installer
   (pilote de capture réseau, utilisé par plein d'autres outils Albion comme les radars).
2. **Windows uniquement pour l'instant** (Linux possible avec `libpcap-dev`, non testé).

Rien d'autre : pas de Node.js, pas de Build Tools, pas d'`npm install` à faire.

## Installation

**Pour un membre de la guilde** : télécharge `AlbionLootLogger.exe`
depuis [Releases](https://github.com/Basiledev/albion-loot-logger-desktop/releases/latest)
(section "Assets" en bas de la page) et lance-le directement — aucune installation.
Garde ce fichier où tu veux (Bureau, Téléchargements...) : les mises à jour automatiques
le remplacent sur place, à ce même emplacement, à chaque lancement — pas besoin de le
re-télécharger manuellement, et le nom du fichier ne change jamais.

**Pour développer/tester en local** (uniquement si tu modifies le code) :
```
npm install
npm start
```

## Mise à jour automatique

Au démarrage, le logiciel vérifie s'il existe une version plus récente sur
[Releases](https://github.com/Basiledev/albion-loot-logger-desktop/releases). Si oui, il la
télécharge et se relance automatiquement avec la nouvelle version — rien à faire
manuellement (double-cliquer le `.exe` une seule fois suffit, il se met à jour tout seul par
la suite). Cette vérification est silencieuse en cas d'échec (pas de connexion, GitHub
indisponible...) : le logiciel continue avec la version actuelle.

## Utilisation

1. Dans Discord, dans le fil de l'activité : `/loottrack start` → récupère le code affiché.
2. Lance `AlbionLootLogger.exe` (**clic droit → "Exécuter en tant qu'administrateur"**,
   requis pour la capture réseau).
   Pour tester contre un site lancé en local (`cd web && npm run dev`) en mode dev, copie
   `.env.example` en `.env` (garde `BACKEND_URL=http://localhost:3000`) et lance plutôt
   `npm run dev`.
3. Colle le code de session quand demandé.
4. Lance Albion Online si ce n'est pas déjà fait — le logiciel détecte ton personnage
   automatiquement (pas besoin de retaper ton pseudo).
5. Joue normalement. Ton propre loot, ainsi que celui de tout joueur visible autour de toi
   (dans le même combat/groupe), est envoyé au site.
6. **Une fois de retour en ville et ton loot déposé en coffre, appuie sur "B"** pour
   marquer le checkpoint (voir "Limites connues" ci-dessous — ce checkpoint ne concerne
   que ton propre personnage).
7. `Ctrl+C` pour quitter.

## Un seul logiciel suffit pour tout le groupe

Une seule instance (ex: le caller ou n'importe quel participant) peut rapporter le loot de
tout le monde autour d'elle — pas besoin que chaque joueur installe le logiciel. Le code de
session est la seule barrière côté site : quiconque le connaît peut poster des events pour
l'activité. Plusieurs instances peuvent aussi tourner en même temps sur le même code (plus
de couverture si le groupe est dispersé), le site fusionne tout.

## Limites connues (v1)

- Le jeu ne donne pas facilement le nom de la zone dans laquelle on entre — seulement
  qu'un changement de zone a eu lieu. Marquer "loot déposé en coffre" est donc **manuel**
  (touche "B") plutôt qu'automatique pour l'instant.
- La qualité de l'item (normal/bon/exceptionnel/excellent/chef-d'œuvre) n'est pas encore
  remontée, seulement le type et la quantité.

## Publier une mise à jour (maintainer)

1. Bump la version dans `package.json`.
2. `npm run package-release` → génère dans `dist/` :
   - `AlbionLootLogger.exe` (exécutable standalone, via [pkg](https://github.com/yao-pkg/pkg)) — nom stable (jamais versionné), c'est celui que les membres de la guilde téléchargent et que l'auto-update remplace en place à chaque nouvelle version.
   - `albion-loot-logger-desktop-vX.Y.Z.zip` (source, pour mon usage dev).
3. `git push`, puis :
   ```
   gh release create vX.Y.Z dist/AlbionLootLogger.exe dist/albion-loot-logger-desktop-vX.Y.Z.zip --title "vX.Y.Z" --notes "..."
   ```
   Le tag (`vX.Y.Z`) doit correspondre exactement à la version buildée — c'est ce que
   l'auto-update compare (`src/updater.js`). L'auto-update télécharge l'asset se terminant
   par `.exe` (utilisateurs finaux) ou `.zip` (dev), selon comment le logiciel tourne.

   **Important** : le `.exe` doit être buildé avec la même version majeure de Node.js que
   celle utilisée pour `npm install` (le module natif `cap` doit matcher l'ABI cible dans
   `package.json` → `pkg.targets`, sinon erreur `NODE_MODULE_VERSION` au lancement).

   L'icône (`build-assets/icon-source.png`) est appliquée par `scripts/build-exe.js` —
   pkg n'a pas d'option native pour ça, et les outils habituels (rcedit, Resource
   Hacker...) corrompent le payload que pkg ajoute à la fin du binaire. Le script
   utilise `pe-library`/`resedit` (qui préserve le fichier octet pour octet) pour poser
   l'icône sur le binaire de base *avant* que pkg n'y injecte l'appli. Pour changer
   l'icône : remplace `build-assets/icon-source.png` (PNG carré, 512×512 recommandé) et
   supprime `build-assets/icon.ico` s'il existe (régénéré automatiquement).

## Licence

GPL-3.0 — voir `LICENSE` et `NOTICE.md` (attribution à ao-loot-logger).
