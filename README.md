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

1. **Node.js** v18 ou plus récent.
2. **Npcap** — [télécharger ici](https://npcap.com/#download), cocher **"Install Npcap in
   WinPcap API-compatible Mode"** pendant l'installation.
3. **Windows uniquement pour l'instant** (Linux possible avec `libpcap-dev`, non testé).
4. **Visual Studio Build Tools** (workload "Développement Desktop en C++") — nécessaire
   une seule fois pour compiler le module de capture réseau lors du premier `npm install` :
   ```
   winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```

## Installation

**Pour un membre de la guilde** : télécharge le dernier zip depuis
[Releases](https://github.com/Basiledev/albion-loot-logger-desktop/releases/latest),
extrais-le où tu veux, pas besoin de Node.js ni des Build Tools (déjà inclus dans le zip).

**Pour développer/tester en local** :
```
npm install
```

## Mise à jour automatique

Au démarrage, le logiciel vérifie s'il existe une version plus récente sur
[Releases](https://github.com/Basiledev/albion-loot-logger-desktop/releases). Si oui, il la
télécharge, l'installe dans un dossier voisin et se relance automatiquement dessus — rien à
faire manuellement. Cette vérification est silencieuse en cas d'échec (pas de connexion,
GitHub indisponible...) : le logiciel continue avec la version actuelle.

## Utilisation

1. Dans Discord, dans le fil de l'activité : `/loottrack start` → récupère le code affiché.
2. Lance le logiciel (**en Administrateur**, requis pour la capture réseau) :
   ```
   npm start
   ```
   Pour tester contre un site lancé en local (`cd web && npm run dev`), copie `.env.example`
   en `.env` (garde `BACKEND_URL=http://localhost:3000`) et lance plutôt :
   ```
   npm run dev
   ```
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
2. `npm run package-release` → génère `albion-loot-logger-desktop-vX.Y.Z.zip` à la racine.
3. `git push`, puis :
   ```
   gh release create vX.Y.Z albion-loot-logger-desktop-vX.Y.Z.zip --title "vX.Y.Z" --notes "..."
   ```
   Le tag (`vX.Y.Z`) doit correspondre exactement à la version du zip — c'est ce que
   l'auto-update compare (`src/updater.js`).

## Licence

GPL-3.0 — voir `LICENSE` et `NOTICE.md` (attribution à ao-loot-logger).
