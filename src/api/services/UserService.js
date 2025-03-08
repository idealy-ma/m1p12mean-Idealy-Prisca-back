const BaseService = require('./BaseService');
const UserModel = require('../models/User');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
/**
 * Service pour gérer les utilisateurs
 * Suit le principe d'interface ségrégation (I de SOLID)
 * Fournit uniquement les méthodes nécessaires pour les utilisateurs
 */
class UserService extends BaseService {
  constructor() {
    super(UserModel);
  }

  /**
   * Authentifie un utilisateur
   * @param {string} email - L'email de l'utilisateur
   * @param {string} motDePasse - Le mot de passe de l'utilisateur
   * @returns {Promise<Object>} L'utilisateur authentifié
   */
  async authenticate(email, motDePasse) {
    try {
      // Récupérer l'utilisateur avec le mot de passe (normalement masqué)
      const user = await this.repository.model.findOne({ email }).select('+motDePasse');
      
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Vérifier le mot de passe
      const isPasswordValid = user.verifierMotDePasse(motDePasse);
      
      if (!isPasswordValid) {
        throw new Error('Email ou mot de passe incorrect');
      }
      user.estActif = true;

      // Ne pas renvoyer le mot de passe
      user.motDePasse = undefined;
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère un utilisateur par son email
   * @param {string} email - L'email de l'utilisateur
   * @returns {Promise<Object>} L'utilisateur trouvé
   */
  async getByEmail(email) {
    try {
      const user = await this.repository.findByEmail(email);
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère des utilisateurs par rôle
   * @param {string} role - Le rôle des utilisateurs
   * @returns {Promise<Array>} Les utilisateurs trouvés
   */
  async getByRole(role) {
    try {
      return await this.repository.findByRole(role);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change le statut actif d'un utilisateur
   * @param {string} id - L'ID de l'utilisateur
   * @param {boolean} estActif - Le nouveau statut
   * @returns {Promise<Object>} L'utilisateur mis à jour
   */
  async changeActiveStatus(id, estActif) {
    try {
      return await this.update(id, { estActif });
    } catch (error) {
      throw error;
    }
  }

  generateToken(user) {
    if (!user) {
      throw new Error('L\'utilisateur est nécessaire pour générer un token');
    }
    
    // Générer le token JWT avec la clé définie dans config
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, // Payload
      config.jwt.secret, // Utilisation de la clé secrète définie dans config
      { expiresIn: '60d' } // Expiration du token (2 mois)
    );
    user.token = token;
    return token;
  }

  validateFields = (fields) => {
    const { nom, prenom, email, motDePasse } = fields;
    if (!nom || !prenom || !email || !motDePasse) {
      throw new Error('Veuillez fournir tous les champs requis');
    }
  };

  checkIfUserExists = async (email) => {
    const existingUser = await this.repository.model.findOne({ email });
    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }
  };

  hashPassword = async (motDePasse) => {
  //chaîne aléatoire ajoutée au mot de passe avant de le hasher
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(motDePasse, salt);
  };

}

module.exports = new UserService(); 