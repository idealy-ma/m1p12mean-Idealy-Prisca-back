const BaseService = require('./BaseService');
const UserModel = require('../models/User');
const DevisModel = require('../models/Devis');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
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

  /**
   * Compte le nombre de managers actifs dans le système
   * @returns {Promise<number>} Le nombre de managers actifs
   */
  async getActiveManagersCount() {
    try {
      return await this.repository.model.countDocuments({ 
        role: 'manager',
        estActif: true 
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère tous les employés (mécaniciens et managers)
   * @returns {Promise<Array>} Les employés trouvés
   */
  async getAllEmployees() {
    try {
      // Utiliser une requête avec opérateur $in pour récupérer les utilisateurs avec rôle mécanicien ou manager
      return await this.repository.model.find({
        role: { $in: ['mecanicien', 'manager'] }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère tous les employés (mécaniciens et managers) avec pagination
   * @param {Object} filters - Les filtres à appliquer (nom, prénom, rôle, etc.)
   * @param {Object} options - Les options de pagination (page, limit, sort, etc.)
   * @returns {Promise<Object>} Résultat paginé contenant les employés trouvés
   */
  async getAllEmployeesPaginated(filters = {}, options = {}) {
    try {
      // Assurer que seuls les employés (mécaniciens et managers) sont retournés
      const employeeFilters = {
        ...filters,
        role: filters.role || { $in: ['mecanicien', 'manager'] }
      };
      
      // Calculer le skip pour la pagination manuelle
      const skip = (options.page - 1) * options.limit;
      
      // Obtenir le nombre total de documents correspondant aux filtres
      const totalDocs = await this.repository.model.countDocuments(employeeFilters);
      
      // Obtenir les documents paginés
      const docs = await this.repository.model
        .find(employeeFilters)
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit);
      
      // Calculer le nombre total de pages
      const totalPages = Math.ceil(totalDocs / options.limit);
      
      // Retourner un objet formaté similaire à mongoose-paginate-v2
      return {
        docs,
        totalDocs,
        limit: options.limit,
        page: options.page,
        totalPages,
        hasPrevPage: options.page > 1,
        hasNextPage: options.page < totalPages,
        prevPage: options.page > 1 ? options.page - 1 : null,
        nextPage: options.page < totalPages ? options.page + 1 : null
      };
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
      { 
        id: user._id,
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email
      },
      config.jwt.secret,
      { expiresIn: '60d' }
    );
    
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

  /**
   * Récupère les mécaniciens disponibles pour une date spécifique
   * @param {string|Date} date - La date pour laquelle vérifier la disponibilité (format YYYY-MM-DD ou objet Date)
   * @returns {Promise<Array>} Les mécaniciens disponibles
   */
  async getAvailableMechanicsByDate(date) {
    try {
      // S'assurer que la date est au format YYYY-MM-DD
      const targetDate = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
      
      // Récupérer tous les mécaniciens actifs
      const allMechanics = await this.repository.model.find({ 
        role: 'mecanicien',
        estActif: true
      });

      // Si aucun mécanicien, retourner un tableau vide
      if (!allMechanics.length) return [];

      // Récupérer les IDs de tous les mécaniciens
      const allMechanicsIds = allMechanics.map(mech => mech._id.toString());
      
      // Utiliser le modèle Mongoose directement comme dans les autres méthodes
      const DevisMongooseModel = mongoose.model('Devis');
      
      // Récupérer tous les devis avec statut "en_attente" ou "accepte"
      const activeDevis = await DevisMongooseModel.find({
        status: { $in: ['en_attente', 'accepte'] }
      }).populate('mecaniciensTravaillant.mecanicien');

      // Ensemble des IDs de mécaniciens occupés à la date spécifiée
      const busyMechanicsIds = new Set();

      // Parcourir tous les devis actifs
      activeDevis.forEach(devis => {
        devis.mecaniciensTravaillant.forEach(mecanicienData => {
          const { mecanicien, debut, heureDeTravail } = mecanicienData;
          // Si le mécanicien a une date de début et des heures de travail
          if (mecanicien && debut) {
            const startDate = new Date(debut);
            // Calculer le nombre de jours de travail nécessaires (8h par jour)
            const workDays = Math.ceil(heureDeTravail / 8);
            
            // Vérifier si la date cible est dans la période de travail
            for (let i = 0; i < workDays; i++) {
              const currentDate = new Date(startDate);
              currentDate.setDate(startDate.getDate() + i);
              const currentDateStr = currentDate.toISOString().split('T')[0];
              
              // Si la date courante correspond à la date cible, marquer le mécanicien comme occupé
              if (currentDateStr === targetDate) {
                busyMechanicsIds.add(mecanicien._id.toString());
                break;
              }
            }
          }
        });
      });

      // Filtrer les mécaniciens disponibles (ceux qui ne sont pas occupés)
      const availableMechanicsIds = allMechanicsIds.filter(id => !busyMechanicsIds.has(id));
      
      // Récupérer les objets mécaniciens complets pour les IDs disponibles
      const availableMechanics = allMechanics.filter(mechanic => 
        availableMechanicsIds.includes(mechanic._id.toString())
      );

      return availableMechanics;
    } catch (error) {
      console.error('Erreur dans getAvailableMechanicsByDate:', error);
      throw error;
    }
  }
}

module.exports = new UserService(); 