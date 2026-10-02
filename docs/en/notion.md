# Notion setup

[English](notion.md) · [Français](../fr/notion.md)

## Connect

1. Create an [internal integration](https://www.notion.so/my-integrations) and copy the secret
2. On your tasks database: `…` → **Connections** → add the integration
3. Systray → **Paramètres…** → paste the secret + database URL → **Enregistrer Notion**

Config file: `%APPDATA%\lattice-desk\config.json` (or repo-root `config.json` in dev). Example: `config.example.json`.

Without a token, Lattice runs in **demo mode** once Notion widgets are enabled.

## Property mapping

Defaults (`Name`, `Date`, `Tags`, `Priority`, `Urgency`, `Done`, `Temps de travail`) can be renamed in **Paramètres** or under `properties` in `config.json`. Use **Tester la connexion** to auto-suggest from your schema.

The Number property **`Temps de travail`** (`hoursWorked`) stores total hours on each task. Lattice increments it when you add hours manually in the task detail panel, and when you end a **Travailler dessus** focus session.

## Secondary sources (optional)

Edit `projectSources` in `config.json` to merge another tasks database:

- **Whole database**: omit `projectPageId` / `relationProperty`
- **Filtered by project**: set both (Notion relation)

```json
"projectSources": [
  {
    "databaseId": "https://www.notion.so/YOUR_OTHER_TASKS_DATABASE_ID",
    "label": "My Task List",
    "properties": {
      "title": "Tâche",
      "date": "Date",
      "tag": "État",
      "status": "Importance",
      "urgency": "Urgence"
    },
    "filters": {
      "hideCompleted": true,
      "completedStatusValues": []
    }
  }
]
```

Share each database with the integration. See `config.example.json` for full field names.
