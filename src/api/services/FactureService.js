const BaseService = require('./BaseService');
const FactureRepository = require('../models/Facture'); // Notre modèle/repository
const ReparationRepository = require('../models/Reparation').model; // Importer directement le modèle Mongoose pour populate
const ReparationService = require('./ReparationService'); // Pour récupérer les détails de la réparation
const AppError = require('../utils/AppError'); // Utilitaire pour les erreurs HTTP
const Counter = require('../models/Counter'); // Importer le modèle Counter

class FactureService extends BaseService {
  constructor() {
    super(FactureRepository); // Passer le repository Facture à BaseService
  }

  /**
   * Crée une facture à partir d'une réparation terminée.
   * @param {string} reparationId - L'ID de la réparation à facturer.
   * @param {string} userId - L'ID de l'utilisateur (manager) qui effectue l'action.
   * @returns {Promise<Facture>} La facture créée.
   */
  async createFactureFromReparation(reparationId, userId) {
    // 1. Récupérer la réparation et POPULER les champs nécessaires
    const reparation = await ReparationRepository.findById(reparationId)
        .populate('client')
        .populate('vehicule')
        .populate('servicesInclus.service') // Populer les détails du service inclus
        .populate('packsInclus.servicePack')  // Populer les détails du pack inclus
        .populate('devisOrigine') // Populer si besoin d'infos du devis
        .exec();

    if (!reparation) {
      throw new AppError('Réparation non trouvée', 404);
    }

    // 2. Vérifier les conditions
    if (reparation.statusReparation !== 'Terminée') { 
      throw new AppError('La réparation doit être terminée pour être facturée.', 400);
    }
    const existingFacture = await this.repository.model.findOne({ reparation: reparationId });
    if (existingFacture) {
      throw new AppError('Une facture existe déjà pour cette réparation.', 409); 
    }

    // 3. Générer le prochain numéro de facture de manière atomique
    const numeroFacture = await this.generateNextNumeroFacture(); 

    // 4. Préparer les données de la facture
    const dateEmission = new Date();
    const delaiPaiement = 30; 
    const dateEcheance = new Date(dateEmission.getTime() + delaiPaiement * 24 * 60 * 60 * 1000);

    // 5. Mapper les lignes à partir des données populées
    const lignesFacture = [];
    reparation.servicesInclus.forEach(item => {
      if (!item.service || typeof item.service !== 'object') {
          console.error("Service manquant ou non populé pour item:", item);
          throw new AppError(`Détails du service manquant ou invalide pour la facturation (ID: ${item.service}).`, 500);
      }
      lignesFacture.push({
          designation: item.service.name,
          quantite: 1, 
          prixUnitaireHT: item.prix, 
          tauxTVA: item.service.tauxTVA || 20, // Utiliser TVA du service ou 20% par défaut
          type: 'service', // Ou mapper depuis type de service
          reference: item.service._id.toString() 
      });
    });
    reparation.packsInclus.forEach(packItem => {
        if (!packItem.servicePack || typeof packItem.servicePack !== 'object') {
            console.error("Pack manquant ou non populé pour packItem:", packItem);
            throw new AppError(`Détails du pack manquant ou invalide pour la facturation (ID: ${packItem.servicePack}).`, 500);
        }
        lignesFacture.push({
            designation: `Pack: ${packItem.servicePack.name}`, 
            quantite: 1,
            prixUnitaireHT: packItem.prix,
            tauxTVA: packItem.servicePack.tauxTVA || 20, // Utiliser TVA du pack ou 20% par défaut
            type: 'service', // Ou 'pack'
            reference: packItem.servicePack._id.toString()
        });
    });
    
    if (lignesFacture.length === 0) {
         throw new AppError("Impossible de générer une facture sans lignes de service/pack.", 400);
    }

    // 6. Créer l'objet facture
    const factureData = {
      numeroFacture: numeroFacture,
      dateEmission: dateEmission,
      dateEcheance: dateEcheance,
      client: reparation.client._id, // Utiliser l'ID populé
      vehicule: reparation.vehicule._id, // Utiliser l'ID populé
      reparation: reparationId,
      devis: reparation.devisOrigine ? reparation.devisOrigine._id : undefined, // Utiliser l'ID populé (si existe)
      lignesFacture: lignesFacture,
      statut: 'brouillon', 
      delaiPaiement: delaiPaiement,
      creePar: userId, 
      // Les montants/totaux seront calculés par le pre-save hook du modèle Facture
    };

    // 7. Créer la facture via le repository (méthode create héritée de BaseService)
    const nouvelleFacture = await this.create(factureData);

    // 8. Mettre à jour le statut de la réparation à "Facturée"
    //    Utiliser ReparationService qui étend BaseService et donc a la méthode update
    await ReparationService.update(reparationId, { statusReparation: 'Facturée' });

    return nouvelleFacture;
  }

  /**
   * Génère le prochain numéro de facture séquentiel en utilisant un compteur atomique.
   * @returns {Promise<string>} Le prochain numéro de facture (ex: FACT-0001).
   */
  async generateNextNumeroFacture() {
    const sequenceName = 'facture_seq'; // Nom du compteur pour les factures
    try {
        const nextSeq = await Counter.getNextSequenceValue(sequenceName);
        return `FACT-${String(nextSeq).padStart(4, '0')}`; // Formatage
    } catch (error) {
        console.error("Erreur lors de la génération du numéro de séquence de facture:", error);
        // Fournir un fallback ou relancer une erreur spécifique
        throw new AppError("Impossible de générer le numéro de facture.", 500);
    }
  }

  // --- Surcharge des méthodes de BaseService pour ajouter .populate() ---

  /**
   * Récupère une facture par son ID avec les champs associés populés.
   * @param {string} id - L'ID de la facture.
   * @returns {Promise<Facture>} L'entité trouvée et populée.
   */
  async getById(id) {
    try {
      const entity = await this.repository.model.findById(id)
        .populate('client')
        .populate('vehicule')
        .populate('reparation') // Populer la réparation liée
        .populate('devis') // Populer le devis lié
        .exec(); // Exécuter la requête avec populate
       
      if (!entity) {
        // Utiliser AppError pour une gestion d'erreur cohérente
        throw new AppError('Facture non trouvée', 404);
      }
      return entity;
    } catch (error) {
      // Relancer l'erreur pour qu'elle soit gérée par le contrôleur/middleware
      // Si ce n'est pas déjà une AppError, l'encapsuler pourrait être une option
      if (!(error instanceof AppError)) {
          console.error("Erreur non gérée dans FactureService.getById:", error);
          throw new AppError("Erreur serveur lors de la récupération de la facture.", 500);
      }
      throw error;
    }
  }

  /**
   * Récupère toutes les factures avec les champs associés populés.
   * @param {Object} filter - Filtre pour la recherche
   * @param {Object} options - Options de tri, pagination (skip, limit)
   * @returns {Promise<Array<Facture>>} Les entités trouvées et populées.
   */
  async getAll(filter = {}, options = {}) {
    try {
        const { sort = { dateEmission: -1 }, skip = 0, limit = 0 } = options;

        let query = this.repository.model.find(filter)
            .populate('client')
            .populate('vehicule')
            .populate('reparation', 'statusReparation') // Ne populer que le statut si besoin
            .sort(sort);
       
        if (skip > 0) {
            query = query.skip(skip);
        }
        if (limit > 0) {
            query = query.limit(limit);
        }

        return await query.exec();
    } catch (error) {
      console.error("Erreur dans FactureService.getAll:", error);
      throw new AppError("Erreur serveur lors de la récupération des factures.", 500);
    }
  }

  // Les méthodes create, update, delete peuvent généralement utiliser celles de BaseService
  // sauf si une logique pré/post spécifique (autre que populate) est nécessaire.
  // Par exemple, pour l'update, on pourrait vouloir recalculer les totaux si les lignes sont modifiées.

  // Exemple de surcharge de update si nécessaire :
  /*
  async update(id, data) {
      // Logique spécifique avant la mise à jour ?
      const updatedEntity = await super.update(id, data); // Appel à la méthode parente
      // Logique spécifique après la mise à jour ?
      return updatedEntity;
  }
  */
}

module.exports = new FactureService(); 