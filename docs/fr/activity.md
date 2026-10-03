# Suivi d’activité

[English](../en/activity.md) · [Français](activity.md)

Widget Lattice de suivi du temps passé sur le PC, avec **contexte logiciel** (domaine navigateur, fichier/projet IDE).

## Fonctionnalités

- Poll **focus uniquement** (~2 s) : seule la fenêtre au premier plan compte (une app ouverte en fond n’est pas chronométrée)
- Processus + titre + contexte structuré
- **Navigateur** : domaine (ou URL) via UI Automation (`active-url.exe`)
- **IDE** : parse Cursor / VS Code → fichier + projet
- Classification : domaine → règles titre → app → Autre
- Correction manuelle → `feedback.jsonl` + règles (apps, titres, **domaines**)
- Widget : résumé, top apps / **sites** / **projets** / **tâches Notion**, maintenant, **historique jour par jour**
- Options : pause, toggle **AFK manuel**, Web, titres, parse IDE, seuil AFK auto (défaut **60 s**), délai interruption focus
- Catégories : travail, **études**, divertissement, communication, système, autre, afk — plus **catégories personnalisées** (ex. Finance) depuis Options
- Correction manuelle → `feedback.jsonl` + règles (apps, titres, **domaines**) ; les segments du jour sont reclassifiés pour que l’UI se mette à jour tout de suite
- Widget : résumé avec **anneau de catégories**, top apps / **sites** / **projets** / **tâches Notion**, maintenant, **historique jour par jour**
- **Sessions focus Notion** : imputer le temps à une tâche + garde-fou allowlist (voir ci-dessous)
- **Extension navigateur** (optionnelle) : lecture média → pas d’AFK auto + **temps de visionnage** par site (`extensions/lattice-media`)
- Export CSV / JSON enrichi (segments + journal focus)
- Bouton **Effacer…** : supprime l’historique (`days/`), le feedback et le journal focus ; conserve `rules.json` / settings

## AFK

| Mode | Comportement |
| --- | --- |
| **Auto** | Idle OS ≥ `idleThresholdSec` (défaut 60 s), sauf si l’extension média signale une lecture |
| **Manuel** | Options → bouton **AFK** (`manualAfk`) — force AFK jusqu’au prochain clic, ignore souris/clavier et keep-awake média |

Badge **AFK manuel** dans l’en-tête du widget quand forcé.

## Catégories personnalisées

Les catégories intégrées ne peuvent pas être renommées ni supprimées. Depuis **Options → Catégories** vous pouvez :

1. **Ajouter** une catégorie (label + couleur) — l’id est un slug du label (`Finance` → `finance`), uniquifié si besoin
2. **Renommer / recolore** une catégorie custom (l’id reste stable pour les règles existantes)
3. **Supprimer** une catégorie custom — toute règle qui la pointe est remappée vers `other`, et les segments du jour sont reclassifiés

Stockage dans `rules.json` : `customCategories: [{ id, label, color }]`. Les ids custom sont valides partout où une `ActivityCategory` est attendue (corrections, overrides, motifs titre).

## Ce qui n’est pas compté

- **Apps en arrière-plan** — le collecteur lit `GetForegroundWindow` uniquement
- **Widgets Lattice** — focus sur Lattice → segment `ignored` (hors temps actif, hors tops) ; hint « Widgets Lattice — non comptés »
- **Focus < 3 s** — un changement d’app n’est validé qu’après **3 s** de focus stable (ignore Alt-Tab / flash systray) ; l’AFK reste immédiat
- Liste extensible `ignoredApps` dans `rules.json` (défaut : `lattice`, `lattice-desk`)

### Deux horloges de dwell

Les deux utilisent le même réglage Options **Stabilité focus** (`focusOffProjectDwellSec`, défaut **8 s**, presets 3 / 5 / 8 / 12 / 20) :

| Horloge | Rôle |
| --- | --- |
| **Dwell segment** | Debounce des changements d’app avant d’écrire un segment / mettre à jour « Maintenant » |
| **Dwell hors-projet** | Pendant une session focus Notion : durée hors allowlist avant la fenêtre d’interruption |

L’AFK bascule toujours immédiatement. Plancher : 3 s (`FOCUS_OFF_PROJECT_DWELL_MIN_SEC`).

## Vie privée

- **100 % local** dans `%APPDATA%\lattice-desk\activity\`
- `browserDetail` : `domain` (défaut) | `url` | `off` — bouton **Web:** dans le widget
- `parseIdeTitles` : parser les titres IDE (défaut on)
- **Titres off** : pas de texte de titre ; `titleHash` conservé
- Pas de sync cloud, pas de frappe, pas de captures

## Sessions focus (Notion)

But : travailler **uniquement** sur une tâche Notion, chronométrer ce temps, et s’interrompre si l’activité sort de l’allowlist.

1. Widget **Activité** activé (service `activity-tracker`)
2. Depuis **Tâches** / **Calendrier** : menu contextuel ou détail → **Travailler dessus**
3. Le bandeau **Session focus** dans Activité montre la tâche, l’état (active / pause / interrompue) et l’allowlist (apps, domaines, projets IDE)
4. Hors allowlist pendant le délai configuré (défaut **8 s**, option `Focus: Ns`) → fenêtre d’interruption : expliquer ce que vous faites, puis reprendre / autoriser pour la session / **toujours pour cette tâche** / pause / terminer
5. Les notes vont dans `focus-journal.jsonl` ; le temps imputé apparaît dans **Temps par tâche** et l’export

Allowlist initiale : apps travail courantes (`cursor`, `code`, `notion`…) + contexte focus courant (projet IDE / domaine) + **autorisations mémorisées pour cette tâche**. Les widgets Lattice et l’AFK ne déclenchent pas d’interruption.

**Toujours pour cette tâche** enregistre l’app / domaine / vidéo / projet localement pour cette tâche Notion et le recharge aux prochaines sessions. **Autoriser pour cette session** ne dure que jusqu’à la fin de la session. L’édition manuelle de l’allowlist dans Activité est aussi mémorisée pour la tâche.

L’imputation est **locale** (id de page Notion sur les segments). La fin d’une session focus incrémente aussi la propriété Number **Temps de travail** quand elle est mappée.

## Limites

- Focus uniquement (pas les apps en fond)
- URL UIA : peut échouer en plein écran / si la barre d’adresse change
- Formats de titre IDE variables
- Pas d’URL sans le helper `active-url` (build .NET)

## Fichiers

| Chemin | Rôle |
| --- | --- |
| `activity/settings.json` | Pause, titres, AFK, `browserDetail`, `parseIdeTitles`, `focusOffProjectDwellSec` |
| `activity/rules.json` | Apps, motifs titre, overrides app/domaine, `ignoredApps`, **`customCategories`** |
| `activity/feedback.jsonl` | Corrections |
| `activity/focus-session.json` | Session focus en cours (reprise au redémarrage) |
| `activity/focus-journal.jsonl` | Notes d’interruption (explications hors projet) |
| `activity/days/YYYY-MM-DD.jsonl` | Segments |
| `activity/days/YYYY-MM-DD.watch.json` | Temps de visionnage (extension) par domaine |
| `activity/media-bridge.json` | Token + endpoint pour l’extension média (généré au démarrage) |

### Extension média (AFK + Visionnage)

Pour ne pas basculer en AFK pendant une vidéo **et** compter le temps de lecture par site (YouTube, Netflix…) :

1. Activer le widget Activité (pont `127.0.0.1:17384`)
2. Charger `extensions/lattice-media` en extension non empaquetée (Chrome / Edge / Brave)
3. Coller le `token` de `media-bridge.json` dans les options de l’extension

Le widget affiche une section **Visionnage** (source extension, lecture réelle), distincte des **Top sites** (focus fenêtre).

Détails : [`extensions/lattice-media/README.md`](../../extensions/lattice-media/README.md).

Si `playing` est signalé (heartbeat &lt; 20 s), l’idle clavier/souris **ne déclenche pas** l’AFK. Badge **Média** dans le widget. Un onglet/frame qui arrête de battre (onglet fermé, page tuée) est traité comme non-lecture après 20 s même sans message « stoppé » explicite — borne la durée pendant laquelle une vidéo obsolète peut sembler « actuelle ».

### Segment (champs utiles)

Base : `start`, `end`, `app`, `title`, `category`, source/confiance, idle, session, `ignored?`…

Contexte :

| Champ | Exemple |
| --- | --- |
| `domain` | `github.com` |
| `urlPath` | `/org/repo` (si `browserDetail=url`) |
| `contextKind` | `browser` / `ide` / `chat` |
| `fileName` | `activity.ts` |
| `projectName` | `windows-widgets` |
| `focusSessionId` | UUID de session focus |
| `notionTaskId` | Id de page Notion |
| `notionTaskTitle` | Titre snapshot de la tâche |

### Classification

1. idle → AFK  
2. **navigateur + domaine** → règles domaine (`userDomainOverrides` puis table : `youtube.com` → divertissement, `github.com` → travail, `khanacademy.org` → études, `*.edu` → études, …) — prioritaire sur un override d’app Brave/Chrome. **YouTube** : motifs titre d’abord (un cours peut être « études ») ; sans motif → divertissement (plus le seau opaque « Autre »).
3. `userAppOverrides` (apps hors navigateur, ou navigateur sans domaine)  
4. **domaine** (contextes hors navigateur)  
5. motifs titre  
6. défauts d’app  
7. `other`

Si l’extension média signale une lecture et que le helper URL rate (ex. plein écran), l’origine de l’onglet en lecture sert de `domain`.

Les résumés appliquent les **règles courantes** aux catégories (et une correction réécrit le JSONL du jour) pour que Top apps / sites / l’anneau se mettent à jour immédiatement.

Les segments `ignored` et AFK sont exclus des totaux actifs et des tops.
Les segments navigateur avec un `domain` connu vont dans **Top sites**, pas **Top apps** (Brave n’est plus le seau de quota).

Si `active-url.exe` est absent, le domaine est déduit du titre de fenêtre (fallback).

## Activation

Systray → **Catalogue** → **Activité**. Rebuild helpers : `npm run build:helpers`.

## Notes techniques

- Service `activity-tracker`
- Win32 focus via `koffi` ; URL via `tools/active-url` (WPF UI Automation)
- Détection Lattice : HWND des `BrowserWindow` + chemin exe / `ignoredApps`
- Dwell focus : `focusOffProjectDwellSec` (Options → Stabilité focus)
- Idle via `powerMonitor.getSystemIdleTime()` ; option `manualAfk`
