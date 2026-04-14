# 🌱 Digital Cleanup Day — Formulaire de collecte de données
Application web statique permettant de collecter et d'exporter les données d'un événement **Digital Cleanup Day** : sensibilisation, réemploi, nettoyage de données numériques et recyclage d'équipements.

---
## 📋 Présentation
Ce formulaire multi-étapes guide les organisateurs d'un Digital Cleanup Day dans la saisie structurée de leurs actions. À la fin du processus, les données sont exportées au format **JSON** et sauvegardées localement dans le navigateur.

---
## ✨ Fonctionnalités

Formulaire de collecte des donnée
- 🎓 **Sensibilisation** : webinaires, Fresque du Numérique, jeux sérieux (Numéville, Dowino, The Wokies), autres formats
- ♻️ **Réemploi** : don, réparation, protection, réutilisation par type d'équipement
- 🗂️ **Données** : e-mails, publications, fichiers cloud/local supprimés, applications désinstallées, Go récupérés
- 🔋 **Recyclage** : collecte d'équipements DEEE (quantité + poids en kg)
et 
- ⬇️ **Export JSON** téléchargeable directement depuis le navigateur

---
## 📋 Composants du Projet

Le projet s'articule autour de quatre piliers principaux :

### 1. Formulaire de Collecte (`index.html`)
Un formulaire interactif en trois étapes permettant aux structures (entreprises, associations, collectivités, écoles, citoyens) de saisir leurs résultats :
*   **Sensibilisation** : Webinaires, Fresques du Numérique, jeux pédagogiques.
*   **Réemploi** : Don, réparation et réutilisation d'équipements (ordinateurs, smartphones, tablettes).
*   **Données** : Suppression de fichiers (local/cloud), d'e-mails et d'applications.
*   **Recyclage** : Collecte de DEEE (Déchets d'Équipements Électriques et Électroniques).

### 2. Tableau de Bord National (`dashboard.html`)
Un outil de visualisation dynamique qui agrège les données remontées via Google Sheets :
*   **KPIs Généraux** : Nombre de Cleanups, participants totaux, audience sensibilisée.
*   **Impact CO₂** : Calcul automatisé des tonnes de CO₂ évitées grâce aux actions de nettoyage et de réemploi (basé sur les facteurs de l'ADEME).
*   **Analyses Graphiques** : Répartition par type de structure, distribution géographique, et comparaison Cloud vs Local.
*   **Top Contributeurs** : Mise en avant des structures ayant généré le plus d'impact.

### 3. Méthodologie (`methodologie.html`)
Une page dédiée explicitant les règles de calcul et les sources utilisées pour les estimations d'impact :
*   Détail des facteurs d'émission carbone.
*   Sources scientifiques (ADEME, INR).
*   Hypothèses de calcul pour le réemploi et le recyclage.

### 4. Vue Régionale (`regions.html`)
Une page permettant de filtrer et de visualiser les statistiques par région française et par pays limitrophes.

## 🛠️ Stack Technique

*   **Frontend** : HTML5, CSS3 (Vanilla), JavaScript (ES6+).
*   **Visualisation** : [Chart.js](https://www.chartjs.org/) pour les graphiques.
*   **Backend & Stockage** : Google Sheets via Google Apps Script (interfaçage via `fetch` API).
*   **Iconographie** : Emojis et logos personnalisés.
*   **Impact Environnemental** : Intégration interactive des équivalences via l'iframe de [ImpactCO2.fr](https://impactco2.fr).

## 🚀 Fonctionnement

1.  **Saisie** : L'organisateur remplit le formulaire sur `index.html`.
2.  **Envoi** : Les données sont envoyées vers un script Google Apps Script qui les enregistre dans une feuille de calcul maître.
3.  **Visualisation** : Le dashboard (`dashboard.html`) interroge la feuille de calcul via une API dédiée, traite les données en JavaScript et met à jour les indicateurs et graphiques instantanément.
---

## 📅 Contexte

Le **Digital Cleanup** Day est un événement mondial annuel invitant particuliers et organisations à nettoyer leurs données numériques et à agir pour un numérique plus responsable.

🔗 [Site officiel Digital Cleanup Day](https://www.digitalcleanupday.org/)

---

## 📄 Licence

Ce projet est placé dans le **domaine public** sous licence [Creative Commons Zero v1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).

Vous pouvez copier, modifier, distribuer et utiliser ce projet, même à des fins commerciales, sans demander d'autorisation.

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)

---

*Digital Cleanup Day — Formulaire de collecte de données © 2026*
