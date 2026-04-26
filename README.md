# 🚀 Réunions GT v3 — Logistics SaaS Platform

![Version](https://img.shields.io/badge/version-3.0.0-6366f1)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**Réunions GT v3** est une solution SaaS **Multi-Tenant** moderne conçue pour les responsables d'activité. Elle permet de piloter des équipes, organiser des réunions, gérer un parc automobile et suivre les consommables, le tout dans un environnement sécurisé et ultra-rapide.

---

## ✨ Points Forts (Features)

### 🏢 Architecture Multi-Tenant & Sécurité
- **Isolation Totale** : Utilisation de **Row Level Security (RLS)** sur Supabase. Chaque organisation vit dans un silo étanche.
- **Administration SaaS** : Un panneau de contrôle pour gérer les membres et le code d'invitation unique.
- **Gestion des Modules (Feature Toggling)** : Activez ou désactivez les fonctionnalités (Parc Auto, Congés, etc.) à la volée pour personnaliser l'expérience client.

### 🎨 Design & Expérience Utilisateur
- **Dark & Light Mode** : Support natif avec transition fluide via des variables CSS modernes.
- **Responsive "Mobile-First"** : Une interface pensée pour le terrain, compatible smartphones et tablettes.
- **Micro-interactions** : Animations subtiles pour une sensation de produit Premium.

### 🛠 Modules Métiers
- **📅 Gestion de Réunions** : Planification et suivi des comptes-rendus.
- **✅ Kanban & Actions** : Suivi des tâches en temps réel avec indicateurs de retard.
- **🚗 Parc Automobile** : Gestion des véhicules et alertes sur les inspections.
- **📦 Consommables** : Gestion de stock et demandes en attente.
- **🏖️ Gestion des Congés** : Validation et suivi du planning d'absence.
- **❤️ Baromètre d'Humeur** : Suivi du bien-être de l'équipe.

---

## 📸 Aperçus

| Login (Dark) | Dashboard (Mobile) |
| :---: | :---: |
| ![Login Page](https://github.com/user-attachments/assets/login_placeholder) | ![Mobile Sidebar](https://github.com/user-attachments/assets/mobile_placeholder) |

---

## 🛠 Stack Technique

- **Frontend** : [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Langage** : [TypeScript](https://www.typescriptlang.org/) (Typage strict pour une robustesse maximale)
- **Backend/DB** : [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **State Management** : [TanStack Query v5](https://tanstack.com/query/latest)
- **Styling** : Modern Vanilla CSS (Variables dynamiques, Flexbox/Grid)
- **Icons** : [Lucide React](https://lucide.dev/)
- **UI Feedback** : [Sonner](https://sonner.stevenly.me/) (Toasts)

---

## 🚀 Installation Locale

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-user/reunion-v3.git
   cd reunion-gt-v3
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   Créez un fichier `.env` à la racine :
   ```env
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anon
   ```

4. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

---

## ☁️ Déploiement

Le projet est optimisé pour un déploiement sur **Vercel** ou **Netlify**.

> [!IMPORTANT]
> N'oubliez pas d'ajouter les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les réglages de votre plateforme de déploiement.

---

## 📄 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.

---

<p align="center">Développé avec ❤️ pour rendre la logistique plus intelligente.</p>
