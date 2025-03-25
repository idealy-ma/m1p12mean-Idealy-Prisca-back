const BaseService = require('./BaseService');
const DevisModel = require('../models/Devis');
const mongoose = require('mongoose');

/**
 * Service pour gérer les devis
 * Suit le principe d'interface ségrégation (I de SOLID)
 * Fournit uniquement les méthodes nécessaires pour les devis
 */
class DevisService extends BaseService {
  constructor() {
    super(DevisModel);
  }

  /**
   * Récupère les devis avec pagination et filtrage
   * @param {Object} filter - Filtre pour la recherche (client, status, date, etc.)
   * @param {Object} options - Options pour la pagination (page, limit, sort)
   * @returns {Promise<Object>} Les devis trouvés avec métadonnées de pagination
   */
  async getDevisWithPagination(filter = {}, options = {}) {
    try {
      // Valeurs par défaut pour la pagination
      const page = parseInt(options.page, 10) || 1;
      const limit = parseInt(options.limit, 10) || 10;
      const skip = (page - 1) * limit;
      
      // Options de tri (par défaut: date de création décroissante)
      const sort = options.sort || { dateCreation: -1 };
      
      // Construction du filtre
      const queryFilter = {};
      
      // Ajouter le filtre de statut si présent
      if (filter.status) {
        queryFilter.status = filter.status;
      }
      
      // Ajouter le filtre de client si présent
      if (filter.client) {
        // Essayer plusieurs approches pour le filtrage par client
        try {
          // Approche 1: Utiliser l'ID tel quel
          queryFilter.client = filter.client;
          
          // Approche 2: Si c'est un ObjectId valide, l'utiliser aussi
          if (mongoose.Types.ObjectId.isValid(filter.client)) {
            queryFilter.client = filter.client;
          }
        } catch (err) {
          console.error('Erreur lors du traitement de l\'ID client:', err);
          // En cas d'erreur, utiliser l'ID tel quel
          queryFilter.client = filter.client;
        }
      }
      
      // Filtrage par plage de dates si spécifié
      if (filter.dateDebut || filter.dateFin) {
        queryFilter.dateCreation = {};
        
        if (filter.dateDebut) {
          queryFilter.dateCreation.$gte = new Date(filter.dateDebut);
        }
        
        if (filter.dateFin) {
          queryFilter.dateCreation.$lte = new Date(filter.dateFin);
        }
      }
      
      // Recherche textuelle si spécifiée
      if (filter.search) {
        // Recherche dans la description
        queryFilter.$or = [
          { description: { $regex: filter.search, $options: 'i' } }
        ];
      }
      
      console.log('Filtre final pour la requête:', JSON.stringify(queryFilter));
      
      // Exécuter la requête avec pagination
      const devis = await this.repository.model.find(queryFilter)
        .populate('client', 'nom prenom email')
        .populate('vehicule', 'immatricule marque modele')
        .populate('reponduPar', 'nom prenom')
        .populate('servicesChoisis.service').populate('packsChoisis.servicePack')
        .populate('mecaniciensTravaillant.mecanicien', 'nom prenom tarifHoraire')
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
      console.log('Nombre de devis trouvés:', devis.length);
      
      // Compter le nombre total de documents pour la pagination
      const total = await this.repository.model.countDocuments(queryFilter);
      
      // Calculer les métadonnées de pagination
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      return {
        devis,
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
      console.error('Erreur dans getDevisWithPagination:', error);
      throw error;
    }
  }

  /**
   * Récupère un devis par son ID avec les relations peuplées
   * @param {string} id - L'ID du devis
   * @returns {Promise<Object>} Le devis trouvé
   * @throws {Error} Si l'ID est invalide ou si le devis n'est pas trouvé
   */
  async getDevisById(id) {
    try {
      // Vérifier si l'ID est valide
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('ID de devis invalide');
      }

      // Récupérer le devis avec les relations peuplées
      const devis = await this.repository.model.findById(id)
        .populate('client', 'nom prenom email')
        .populate('vehicule', 'immatricule marque modele')
        .populate('reponduPar', 'nom prenom')
        .populate('servicesChoisis.service').populate('packsChoisis.servicePack')
        .populate('mecaniciensTravaillant.mecanicien', 'nom prenom tarifHoraire');

      // Vérifier si le devis existe
      if (!devis) {
        throw new Error('Devis non trouvé');
      }

      return devis;
    } catch (error) {
      throw error;
    }
  }
   // Créer un devis avec les services choisis et packs
  async createDevis(data) {
    const devis = await this.repository.model.create(data);
    await DevisModel.updateTotal(devis._id); // Calculer le total après création
    return devis;
  }
  // Ajouter une ligne supplémentaire au devis
  async addLigneSupplementaire(devisId, ligne) {
    const devis = await this.repository.model.findById(devisId);
    devis.lignesSupplementaires.push(ligne);
    await devis.save();
    await DevisModel.updateTotal(devisId); // Recalculer le total
    return devis;
  }

  // Finaliser le devis (le marquer comme "terminé")
  async finalizeDevis(devisId) {
    await DevisModel.finalizeDevis(devisId);
    return { message: 'Devis envoyé avec succès' };
  }

  // Récupérer tous les devis d'un client
  async getDevisByClient(clientId) {
    return await this.repository.model.find({ client: clientId }).populate('vehicule', 'immatricule marque modele')
    .populate('reponduPar', 'nom prenom').populate('servicesChoisis.service').populate('packsChoisis.servicePack')
    .populate('mecaniciensTravaillant.mecanicien', 'nom prenom tarifHoraire');
  }
  /**
 * Assigner un ou plusieurs mécaniciens à un devis.
 * 
 * @param {mongoose.Types.ObjectId} devisId - L'identifiant du devis.
 * @param {Array} mecaniciensIds - Un tableau d'ID de mécaniciens à assigner.
 * @param {Array} heuresDeTravail - Un tableau d'heures de travail correspondantes pour chaque mécanicien.
 * @returns {Promise} - Une promesse qui résout le devis mis à jour.
 */
async assignMecaniciens(devisId, mecaniciensIds, heuresDeTravail) {
  if (mecaniciensIds.length !== heuresDeTravail.length) {
    throw new Error("Le nombre de mécaniciens ne correspond pas au nombre d'heures de travail.");
  }

  // Trouver le devis à mettre à jour
  const devis = await DevisModel.findById(devisId);
  if (!devis) {
    throw new Error("Devis non trouvé");
  }

  // Vérifier si le mécanicien est déjà assigné
  mecaniciensIds.forEach(mecanicienId => {
    const isAlreadyAssigned = devis.mecaniciensTravaillant.some(
      (mecanicien) => mecanicien.mecanicien.toString() === mecanicienId.toString()
    );

    if (isAlreadyAssigned) {
      throw new Error(`Le mécanicien avec l'ID ${mecanicienId} est déjà assigné à ce devis.`);
    }
  });

  // Préparer les mécaniciens à ajouter
  const mecaniciensTravaillant = mecaniciensIds.map((mecanicienId, index) => ({
    mecanicien: mecanicienId,
    heureDeTravail: heuresDeTravail[index],
    debut: null // Vous pouvez ajouter une date de début si nécessaire
  }));

  // Ajouter les mécaniciens au devis
  devis.mecaniciensTravaillant.push(...mecaniciensTravaillant);

  // Sauvegarder le devis mis à jour
  await devis.save();
  await DevisModel.updateTotal(devisId); // Recalculer le total

  return devis; // Retourne le devis mis à jour
}

}

module.exports = new DevisService(); 