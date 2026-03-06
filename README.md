# Voici ton `README.md` mis à jour avec la licence CC0 1.0, prêt à copier-coller :

---

```markdown
# 🌱 Digital Cleanup Day — Formulaire de collecte de données

Application web statique permettant de collecter et d'exporter les données d'un événement **Digital Cleanup Day** : sensibilisation, réemploi, nettoyage de données numériques et recyclage d'équipements.

---

## 📋 Présentation

Ce formulaire multi-étapes guide les organisateurs d'un Digital Cleanup Day dans la saisie structurée de leurs actions. À la fin du processus, les données sont exportées au format **JSON** et sauvegardées localement dans le navigateur.

---

## ✨ Fonctionnalités

- 📝 **Formulaire en 3 étapes** avec barre de progression
- ✅ **Validation des champs obligatoires** avant de passer à l'étape suivante
- 🎓 **Sensibilisation** : webinaires, Fresque du Numérique, jeux sérieux (Numéville, Dowino, The Wokies), autres formats
- ♻️ **Réemploi** : don, réparation, protection, réutilisation par type d'équipement
- 🗂️ **Données** : e-mails, publications, fichiers cloud/local supprimés, applications désinstallées, Go récupérés
- 🔋 **Recyclage** : collecte d'équipements DEEE (quantité + poids en kg)
- 💾 **Sauvegarde automatique** dans le `localStorage` du navigateur
- ⬇️ **Export JSON** téléchargeable directement depuis le navigateur
- 🔄 **Réinitialisation** du formulaire en un clic

---

## 🗂️ Structure du projet

```
📦 digital-cleanup-day/
├── index.html   # Structure HTML du formulaire
├── app.js       # Logique JavaScript (navigation, validation, export)
└── style.css    # Styles de l'application
```

---

## 🚀 Installation & Utilisation

Aucune dépendance, aucun framework. L'application fonctionne entièrement côté client.

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-utilisateur/digital-cleanup-day.git
   ```

2. **Ouvrir le fichier `index.html`** dans un navigateur web moderne.

> ⚠️ Aucun serveur backend n'est requis.

---

## 📊 Format des données exportées

Les données sont exportées sous forme d'un objet JSON structuré comme suit :

```json
{
  "metadata": {
    "dateSubmission": "2026-03-21T10:00:00.000Z",
    "cleanupId": "120001",
    "organizer": "Nom de l'organisation",
    "understoodImpacts": true,
    "actionsRealisees": ["sensibilisation", "reemploi", "donnees", "recyclage"]
  },
  "sensibilisation": { ... },
  "reemploi": { ... },
  "donnees": { ... },
  "recyclage": { ... }
}
```

---

## 🛠️ Technologies utilisées

| Technologie | Usage |
|-------------|-------|
| HTML5 | Structure du formulaire |
| CSS3 | Mise en forme et responsive |
| JavaScript (Vanilla) | Logique, validation, export |
| localStorage | Persistance locale des données |

---

## 📅 Contexte

Le **Digital Cleanup Day** est un événement mondial annuel invitant particuliers et organisations à nettoyer leurs données numériques et à agir pour un numérique plus responsable.

🔗 [Site officiel Digital Cleanup Day](https://www.digitalcleanupday.org/)

---

## 📄 Licence

Ce projet est placé dans le **domaine public** sous licence [Creative Commons Zero v1.0 Universal (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/).

> Vous pouvez copier, modifier, distribuer et utiliser ce projet, même à des fins commerciales, sans demander d'autorisation.

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)

---

*Digital Cleanup Day — Formulaire de collecte de données © 2026*
```
