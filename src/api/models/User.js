const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');
// Définition du schéma utilisateur
const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, "L'email est requis"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez fournir un email valide']
  },
  motDePasse: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Ne pas inclure par défaut dans les requêtes
  },
  role: {
    type: String,
    enum: ['client', 'manager', 'mecanicien'],
    default: 'client'
  },
  telephone: {
    type: String,
    trim: true
  },
  adresse: {
    type: String,
    trim: true
  },
  estActif: {
    type: Boolean,
    default: false
  },
  tarifHoraire: {
    type: Number,
    required: function() { return this.role === 'mecanicien'; }, // Ajoute une condition pour rendre ce champ requis seulement si le rôle est 'mecanicien'
    min: [0, 'Le tarif horaire doit être un nombre positif'] // Optionnel: validation du tarif horaire
  }
}, {
  timestamps: true, // Ajoute createdAt et updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Méthode pour vérifier si le mot de passe est correct (à implémenter avec bcrypt)
userSchema.methods.verifierMotDePasse = function(motDePasseCandidat) {
  return bcrypt.compare(motDePasseCandidat, this.motDePasse);
};

// Créer le modèle Mongoose
const UserModel = mongoose.model('User', userSchema);

/**
 * Classe User qui étend BaseModel
 * Suit le principe de substitution de Liskov (L de SOLID)
 */
class User extends BaseModel {
  constructor() {
    super(UserModel);
  }

  /**
   * Trouve un utilisateur par son email
   * @param {string} email - L'email de l'utilisateur
   * @returns {Promise<Object>} L'utilisateur trouvé
   */
  async findByEmail(email) {
    try {
      return await this.model.findOne({ email });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Trouve des utilisateurs par rôle
   * @param {string} role - Le rôle des utilisateurs
   * @returns {Promise<Array>} Les utilisateurs trouvés
   */
  async findByRole(role) {
    try {
      return await this.model.find({ role });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new User(); 