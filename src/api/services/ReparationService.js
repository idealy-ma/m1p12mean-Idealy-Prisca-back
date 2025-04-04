const BaseService = require('./BaseService');
const Reparation = require('../models/Reparation'); 
const mongoose = require('mongoose');
// Suppression des imports directs des modèles/classes User et Vehicule
// const UserModel = require('../models/User');
// const VehiculeModel = require('../models/Vehicule');

class ReparationService extends BaseService {
  constructor() {
    // Passer directement l'instance du repository (Reparation qui étend BaseModel)
    super(Reparation);
  }

  /**
   * Récupère une réparation par son ID avec tous les détails nécessaires
   * @param {string} id - ID de la réparation
   * @returns {Promise<Object>} La réparation avec tous les détails
   */
  async getReparationByIdAvecDetails(id) {
    try {
      const reparation = await this.repository.model.findById(id)
        .populate('client', 'nom prenom email telephone')
        .populate('vehicule', 'marque modele immatriculation annee kilometrage photoUrl')
        .populate('mecaniciensAssignes.mecanicien', 'nom prenom email telephone')
        .populate('devisOrigine', 'status total dateCreation')
        .populate('etapesSuivi.commentaires.auteur', 'nom prenom role email');

      if (!reparation) {
        throw new Error('Réparation non trouvée');
      }

      return reparation;
    } catch (error) {
      console.error("Erreur dans getReparationByIdAvecDetails:", error);
      throw error;
    }
  }

  /**
   * Récupère toutes les entités avec des populate spécifiques pour vehicule et client.
   * Utilisé pour des vues qui nécessitent ces détails, comme la liste des réparations du mécanicien.
   * @param {Object} filter - Filtre pour la recherche
   * @param {Object} sort - Options de tri
   * @param {number} skip - Nombre d'éléments à sauter
   * @param {number} limit - Nombre d'éléments à retourner
   * @returns {Promise<Array>} Les entités trouvées avec les populate
   */
  async getReparationsAvecDetails(filter = {}, sort = null, skip = 0, limit = 0) {
    try {
      let query = this.repository.model.find(filter);

      // Populate les champs nécessaires
      query = query.populate('vehicule', 'marque modele immatriculation')
                   .populate('client', 'nom prenom telephone')
                   .populate({ 
                       path: 'etapesSuivi.commentaires.auteur', 
                       select: 'nom prenom role' 
                   });

      // Applique les options de tri, skip et limit
      if (sort) {
        query = query.sort(sort);
      }
      if (skip > 0) {
        query = query.skip(skip);
      }
      if (limit > 0) {
        query = query.limit(limit);
      }

      // Exécute la requête
      return await query.exec();
    } catch (error) {
      console.error("Erreur dans getReparationsAvecDetails:", error);
      throw error; // Rethrow pour que le contrôleur puisse gérer
    }
  }

  /**
   * Récupère l'historique des réparations terminées/facturées/annulées pour un mécanicien
   * @param {string} mechanicId - L'ID du mécanicien
   * @param {Object} options - Options de pagination et tri (page, limit, sort) et filtres (searchTerm, dateDebut, dateFin)
   * @returns {Promise<Object>} Les réparations trouvées avec métadonnées de pagination
   */
  async getReparationsHistoryForMechanic(mechanicId, options = {}) {
    try {
      // Valeurs par défaut pour la pagination
      const page = parseInt(options.page, 10) || 1;
      const limit = parseInt(options.limit, 10) || 10;
      const skip = (page - 1) * limit;
      
      // Options de tri (par défaut: date de fin réelle décroissante, puis date de création)
      const sort = options.sort || { dateFinReelle: -1, dateCreationReparation: -1 };
      
      // Construction du filtre de base
      const baseFilter = {
        'mecaniciensAssignes.mecanicien': new mongoose.Types.ObjectId(mechanicId),
        'statusReparation': { $in: ['Terminée', 'Facturée', 'Annulée'] }
      };
      
      // Construire les conditions $and
      const andConditions = [baseFilter];
      
      // Ajouter filtre de date
      const dateFilter = {};
      if (options.dateDebut) {
        try {
          dateFilter.$gte = new Date(options.dateDebut + 'T00:00:00.000Z');
        } catch (e) { console.error("Date de début invalide:", options.dateDebut); }
      }
      if (options.dateFin) {
        try {
          const endDate = new Date(options.dateFin + 'T00:00:00.000Z');
          endDate.setDate(endDate.getDate() + 1);
          dateFilter.$lt = endDate;
        } catch (e) { console.error("Date de fin invalide:", options.dateFin); }
      }
      if (Object.keys(dateFilter).length > 0) {
        andConditions.push({ dateFinReelle: dateFilter });
      }
      
      // Ajouter filtre searchTerm
      if (options.searchTerm && options.searchTerm.trim() !== '') {
        const searchTerm = options.searchTerm.trim();
        const searchRegex = { $regex: searchTerm, $options: 'i' };
        let clientIds = [];
        let vehicleIds = [];
        
        try {
          // Chercher les clients en utilisant mongoose.model()
          const clients = await mongoose.model('User').find({ // Utilisation de mongoose.model('User')
            role: 'client',
            $or: [{ nom: searchRegex }, { prenom: searchRegex }, { email: searchRegex }]
          }).select('_id').lean();
          clientIds = clients.map(c => c._id);
          
          // Chercher les véhicules en utilisant mongoose.model()
          const vehicles = await mongoose.model('Vehicule').find({ // Utilisation de mongoose.model('Vehicule')
            $or: [{ marque: searchRegex }, { modele: searchRegex }, { immatriculation: searchRegex }]
          }).select('_id').lean();
          vehicleIds = vehicles.map(v => v._id);
          
          if (clientIds.length > 0 || vehicleIds.length > 0) {
            const searchOrConditions = [];
            if (clientIds.length > 0) searchOrConditions.push({ client: { $in: clientIds } });
            if (vehicleIds.length > 0) searchOrConditions.push({ vehicule: { $in: vehicleIds } });
            andConditions.push({ $or: searchOrConditions });
          } else {
            console.log(`[SearchTerm Historique] Terme "${searchTerm}" n'a trouvé ni client ni véhicule.`);
            andConditions.push({ _id: new mongoose.Types.ObjectId() }); // Condition impossible
          }
        } catch (searchError) {
          console.error(`[SearchTerm Historique] Erreur pendant la recherche pour "${searchTerm}":`, searchError);
          throw new Error(`Erreur lors de l'application du filtre de recherche : ${searchError.message}`);
        }
      }
      
      // Filtre final combiné
      const finalFilter = { $and: andConditions };
      
      // Exécuter la requête avec pagination
      const reparations = await this.repository.model.find(finalFilter)
        .populate('client', 'nom prenom')
        .populate('vehicule', 'immatriculation marque modele')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Compter le nombre total de documents pour la pagination avec le filtre final
      const total = await this.repository.model.countDocuments(finalFilter);
      
      // Calculer les métadonnées de pagination
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      return {
        reparations,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev
        }
      };
    } catch (error) {
      console.error('Erreur dans getReparationsHistoryForMechanic:', error);
      if (error instanceof mongoose.Error.CastError) {
        throw new Error('ID du mécanicien invalide');
      }
      throw error;
    }
  }

  // Méthodes spécifiques au service Reparation peuvent être ajoutées ici plus tard.
  // Par exemple :
  // async findByMecanicien(mecanicienId) { ... }
  // async addEtape(reparationId, etapeData) { ... }
  // async updateEtapeStatus(reparationId, etapeId, status) { ... }

}

module.exports = new ReparationService(); 