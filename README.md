# API de Gestion de Garage Automobile

Backend pour l'application de gestion de garage automobile, développé avec la stack MEAN (MongoDB, Express, Angular, Node.js).

## Structure du Projet

Le projet suit une architecture MVC (Modèle-Vue-Contrôleur) et respecte les principes SOLID :

- **S** - Principe de Responsabilité Unique
- **O** - Principe Ouvert/Fermé
- **L** - Principe de Substitution de Liskov
- **I** - Principe de Ségrégation des Interfaces
- **D** - Principe d'Inversion des Dépendances

```
src/
├── api/
│   ├── controllers/    # Contrôleurs pour gérer les requêtes HTTP
│   ├── middlewares/    # Middlewares Express (auth, validation, etc.)
│   ├── models/         # Modèles de données Mongoose
│   ├── routes/         # Routes Express
│   ├── services/       # Services métier
│   └── utils/          # Utilitaires
├── config/             # Configuration de l'application
└── database/           # Configuration de la base de données
```

## Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/idealy-ma/m1p12mean-Idealy-Prisca-back.git
cd m1p12mean-Idealy-Prisca-back
```

2. Installer les dépendances :
```bash
npm install
```

3. Créer un fichier `.env` à la racine du projet avec les variables d'environnement nécessaires (voir `.env.example`).

## Démarrage

Pour démarrer le serveur en mode développement :
```bash
npm run dev
```

Pour démarrer le serveur en mode production :
```bash
npm start
```

## API Endpoints

### Utilisateurs
- `POST /api/v1/users/register` - Créer un nouvel utilisateur
- `POST /api/v1/users/login` - Authentifier un utilisateur
- `GET /api/v1/users/me` - Obtenir l'utilisateur actuel (authentifié)
- `GET /api/v1/users` - Obtenir tous les utilisateurs (admin)
- `GET /api/v1/users/:id` - Obtenir un utilisateur par ID (admin)
- `PUT /api/v1/users/:id` - Mettre à jour un utilisateur (admin)
- `DELETE /api/v1/users/:id` - Supprimer un utilisateur (admin)
- `PATCH /api/v1/users/:id/status` - Changer le statut actif d'un utilisateur (admin)

## Principes SOLID Appliqués

1. **Principe de Responsabilité Unique (S)**
   - Chaque classe a une seule responsabilité
   - Exemple : `BaseModel` gère uniquement les opérations CRUD de base

2. **Principe Ouvert/Fermé (O)**
   - Les classes sont ouvertes à l'extension mais fermées à la modification
   - Exemple : `BaseController` peut être étendu sans être modifié

3. **Principe de Substitution de Liskov (L)**
   - Les sous-classes peuvent remplacer leurs classes de base
   - Exemple : `UserModel` étend `BaseModel` sans changer son comportement

4. **Principe de Ségrégation des Interfaces (I)**
   - Les interfaces spécifiques sont préférables aux interfaces générales
   - Exemple : `UserService` fournit uniquement les méthodes nécessaires pour les utilisateurs

5. **Principe d'Inversion des Dépendances (D)**
   - Dépendre des abstractions, pas des implémentations
   - Exemple : `BaseService` dépend d'une abstraction de repository

## Licence

ISC
