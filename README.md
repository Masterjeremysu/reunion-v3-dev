# Réunions GT — v2

Application de gestion d'équipe : réunions, actions, collègues, parc auto, consommables, baromètre.

## Stack

- **React 18** + **TypeScript 5** + **Vite**
- **Supabase** — base de données existante (même projet que v1)
- **React Query v5** — cache, sync, mutations
- **Tailwind CSS** — design system dark premium
- **React Router v6** — navigation
- **Recharts** — graphiques dashboard
- **Sonner** — notifications toast
- **Zod + React Hook Form** — validation formulaires

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone https://github.com/VOTRE-REPO/reunions-gt-v2
cd reunions-gt-v2
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Remplir avec vos clés Supabase (mêmes que v1 !)

# 3. Lancer en dev
npm run dev
# → http://localhost:8080
```

## Déploiement Vercel

```bash
# Depuis le dashboard Vercel :
# 1. New Project → importer ce repo
# 2. Framework : Vite
# 3. Environment Variables : VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
# 4. Deploy
```

## Architecture

```
src/
├── features/          # Un dossier = un module autonome
│   ├── auth/          # Login, guard, hook session
│   ├── dashboard/     # KPIs, graphiques, alertes
│   ├── meetings/      # Réunions + comptes-rendus
│   ├── actions/       # Points d'action CRUD
│   ├── colleagues/    # Gestion équipe
│   ├── vehicles/      # Parc auto + inspections
│   ├── notes/         # Notes de préparation
│   ├── consumables/   # Demandes consommables
│   ├── mood/          # Baromètre d'humeur
│   └── schedule/      # Planning hebdo
├── components/
│   ├── ShellLayout.tsx  # Sidebar + navigation
│   └── ui/              # Composants partagés
├── lib/               # supabase.ts, queryClient.ts
├── types/             # database.ts, app.ts
├── utils/             # Fonctions utilitaires
└── constants/         # Routes, query keys, labels
```

## Règle d'or

**Supabase = données (ne bougent jamais)**
**GitHub = interface (remplaçable sans toucher aux données)**

Modifier une feature = toucher uniquement son dossier `features/xxx/`.
Ajouter une feature = créer `features/nouveau/`, brancher dans `App.tsx`. C'est tout.
