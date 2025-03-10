# Système de Gestion des Rôles

Ce document explique le système de gestion des rôles mis en place dans l'application de garage.

## Rôles disponibles

L'application comporte trois rôles principaux :

1. **Manager** : Administrateur du système avec accès complet à toutes les fonctionnalités.
2. **Mécanicien** : Employé du garage qui gère les réparations et les rendez-vous.
3. **Client** : Utilisateur qui peut prendre des rendez-vous et suivre l'état de ses réparations.

## Structure du système

Le système de gestion des rôles est basé sur les éléments suivants :

### 1. Modèle Utilisateur

Le modèle `User` inclut un champ `role` qui peut prendre l'une des trois valeurs : 'manager', 'mecanicien' ou 'client'.

```javascript
role: {
  type: String,
  enum: ['client', 'manager', 'mecanicien'],
  default: 'client'
}
```

### 2. Middlewares d'authentification et d'autorisation

Deux middlewares principaux gèrent l'accès aux ressources :

- **protect** : Vérifie si l'utilisateur est authentifié via un token JWT.
- **authorize** : Vérifie si l'utilisateur a le rôle requis pour accéder à une ressource.

### 3. Routes spécifiques aux rôles

Les routes sont organisées par rôle pour une meilleure séparation des préoccupations :

- `/users` : Routes générales d'authentification et de gestion des utilisateurs.
- `/manager` : Routes accessibles uniquement aux managers.
- `/mecanicien` : Routes accessibles uniquement aux mécaniciens.
- `/client` : Routes accessibles uniquement aux clients.

## Utilisation

### Authentification

Pour accéder aux routes protégées, l'utilisateur doit d'abord s'authentifier :

```
POST /api/users/login
```

Le serveur renvoie un token JWT qui doit être inclus dans les requêtes suivantes dans l'en-tête `Authorization` :

```
Authorization: Bearer <token>
```

### Accès aux ressources

Les routes sont protégées en fonction du rôle de l'utilisateur. Par exemple :

- Un manager peut accéder à `/api/manager/users` pour voir tous les utilisateurs.
- Un mécanicien peut accéder à `/api/mecanicien/clients` pour voir les clients.
- Un client peut accéder à `/api/client/rendez-vous` pour gérer ses rendez-vous.

## Exemple d'utilisation

### 1. Authentification

```javascript
// Exemple de requête d'authentification
fetch('/api/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    motDePasse: 'password123'
  })
})
.then(response => response.json())
.then(data => {
  // Stocker le token
  localStorage.setItem('token', data.token);
});
```

### 2. Accès à une ressource protégée

```javascript
// Exemple de requête à une ressource protégée
fetch('/api/manager/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  // Traiter les données
  console.log(data);
});
```

## Bonnes pratiques

1. Toujours vérifier le rôle de l'utilisateur avant d'accéder à une ressource sensible.
2. Ne pas exposer d'informations sensibles dans les tokens JWT.
3. Utiliser des tokens avec une durée de validité limitée (par exemple, 24 heures).
4. Implémenter un système de rafraîchissement des tokens pour une meilleure expérience utilisateur. 