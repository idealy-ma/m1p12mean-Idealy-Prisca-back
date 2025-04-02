const BaseService = require('./BaseService');
const DevisModel = require('../models/Devis');
const UserModel = require('../models/User');
const mongoose = require('mongoose');
const Reparation = require('../models/Reparation');

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
  async finalizeDevis(devisId, updateData = {}) {
    // Vérifier que le devis existe
    const devis = await this.repository.model.findById(devisId);

    if (!devis) {
      throw new Error('Devis non trouvé');
    }

    // Vérifier que le devis n'est pas déjà refuse
    if (devis.status === 'refuse') {
      throw new Error('Ce devis est déjà refusé');
    }

    // Vérifier que le devis n'est pas déjà accepte
    if (devis.status === 'accepte') {
      throw new Error('Ce devis est déjà acceptee');
    }

    console.log('updateData', updateData);

    // Vérifier la date d'intervention si fournie
    if (updateData.dateIntervention) {
      const dateIntervention = new Date(updateData.dateIntervention);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateIntervention < today) {
        throw new Error('La date d\'intervention ne peut pas être dans le passé');
      }

      // Vérifier la disponibilité des mécaniciens à cette date
      if (updateData.mecaniciens && updateData.mecaniciens.length > 0) {
        const mecaniciensIds = updateData.mecaniciens.map(m => m.mecanicien);
        
        // Récupérer les devis existants pour cette date
        const devisExistant = await this.repository.model.findOne({
          _id: { $ne: devisId }, // Exclure le devis actuel
          status: { $in: ['en_attente', 'accepte'] },
          dateIntervention: dateIntervention,
          'mecaniciensTravaillant.mecanicien': { $in: mecaniciensIds }
        });

        if (devisExistant) {
          throw new Error('Un ou plusieurs mécaniciens ne sont pas disponibles à cette date');
        }
      }

      // Mettre à jour la date d'intervention
      devis.dateIntervention = dateIntervention;
    }

    // Mettre à jour les données du devis si fournies
    if (updateData) {
      // Synchroniser les services
      if (updateData.services) {
        devis.servicesChoisis = updateData.services;
      }

      // Synchroniser les packs
      if (updateData.packs) {
        devis.packsChoisis = updateData.packs;
      }

      // Synchroniser les lignes supplémentaires
      if (updateData.lignesSupplementaires) {
        devis.lignesSupplementaires = updateData.lignesSupplementaires;
      }

      // Synchroniser les mécaniciens
      if (updateData.mecaniciens) {
        devis.mecaniciensTravaillant = updateData.mecaniciens.map(mecanicien => ({
          ...mecanicien,
          debut: devis.dateIntervention
        }));
      }

      // Sauvegarder les modifications
      await devis.save();
    }

    // Vérifier si le devis a au moins un service, un pack ou une ligne supplémentaire
    if (
      (devis.servicesChoisis.length === 0) && 
      (devis.packsChoisis.length === 0) && 
      (devis.lignesSupplementaires.length === 0)
    ) {
      throw new Error('Le devis doit contenir au moins un service, un pack ou une ligne supplémentaire');
    }

    // Vérifier si au moins un mécanicien est assigné
    if (devis.mecaniciensTravaillant.length === 0) {
      throw new Error('Au moins un mécanicien doit être assigné au devis avant finalisation');
    }

    // Recalculer le total pour s'assurer qu'il est à jour
    await DevisModel.updateTotal(devisId);

    // Finaliser le devis
    await DevisModel.finalizeDevis(devisId);

    // Obtenir le devis mis à jour
    const updatedDevis = await this.repository.model.findById(devisId)
      .populate('client', 'nom prenom email')
      .populate('vehicule', 'immatricule marque modele')
      .populate('servicesChoisis.service')
      .populate('packsChoisis.servicePack')
      .populate('mecaniciensTravaillant.mecanicien', 'nom prenom tarifHoraire');

    // Retourner un message de succès avec les détails du devis
    return { 
      message: 'Devis finalisé avec succès', 
      devis: updatedDevis 
    };
  }
  // accepter le devis
  async acceptDevis(devisId, clientId) {
    // Vérifier que le devis existe et récupérer ses détails pour la copie
    // Populate les champs nécessaires pour la création de la réparation
    const devis = await this.repository.model.findById(devisId)
        .populate('servicesChoisis.service')
        .populate('packsChoisis.servicePack')
        .populate('mecaniciensTravaillant.mecanicien', '_id'); // Seulement l'ID pour la référence

    if (!devis) {
      throw new Error('Devis non trouvé');
    }

    // Vérifier que le client est bien le propriétaire du devis
    if (devis.client.toString() !== clientId.toString()) {
      throw new Error('Vous n\'êtes pas autorisé à accepter ce devis');
    }

    // Vérifier que le devis est en attente ou terminé (préparé par manager)
    // Le statut 'termine' ici signifie 'finalisé' par le manager, pas 'travaux finis'
    if (devis.status !== 'en_attente' && devis.status !== 'termine') {
        throw new Error('Ce devis ne peut plus être accepté (statut actuel: ' + devis.status + ')');
    }

    // Vérifier que le devis a au moins un service ou un pack ou une ligne supplémentaire
    if (devis.servicesChoisis.length === 0 && devis.packsChoisis.length === 0 && devis.lignesSupplementaires.length === 0) {
      throw new Error('Le devis doit contenir au moins un service, un pack ou une ligne supplémentaire pour être accepté');
    }

    const existingReparation = await Reparation.findOne({ devisOrigine: devisId });
    if (existingReparation) {
        if (devis.status !== 'accepte') {
            await this.repository.acceptDevis(devisId);
        }
        return {
            message: 'Devis déjà accepté. Réparation déjà existante.',
            reparationId: existingReparation._id // Retourner l'ID existant
        };
    }

    await this.repository.acceptDevis(devisId);

    const reparationData = {
        devisOrigine: devis._id,
        client: devis.client,
        vehicule: devis.vehicule,
        mecanicienAssigné: devis.mecaniciensTravaillant.length > 0 ? devis.mecaniciensTravaillant[0].mecanicien._id : null, // Prend le premier mécanicien assigné au devis, s'il y en a un
          statusReparation: 'Planifiée',
        servicesInclus: devis.servicesChoisis.map(s => ({ service: s.service._id, prix: s.prix, note: s.note })), 
        packsInclus: devis.packsChoisis.map(p => ({ servicePack: p.servicePack._id, prix: p.prix, note: p.note })), 
        lignesSupplementairesIncluses: devis.lignesSupplementaires.map(l => ({ nom: l.nom, prix: l.prix, quantite: l.quantite, type: l.type, note: l.note })), 
        problemeDeclare: devis.probleme,
        etapesSuivi: [],
        photos: [],
        notesInternes: [],
        dateDebutPrevue: devis.preferredDate,
        coutEstime: devis.total, 
    };

    const nouvelleReparation = new Reparation(reparationData);
    await nouvelleReparation.save();

    console.log(`Réparation ${nouvelleReparation._id} créée pour le devis ${devisId}`);

    return {
        message: 'Devis accepté avec succès et réparation planifiée.',
        reparationId: nouvelleReparation._id
    };
  }
  // refuser le devis
  async refuserDevis(devisId, clientId) {
    // Vérifier que le devis existe
    const devis = await this.repository.model.findById(devisId);
    if (!devis) {
      throw new Error('Devis non trouvé');
    }

    // Vérifier que le client est bien le propriétaire du devis
    if (devis.client.toString() !== clientId.toString()) {
      throw new Error('Vous n\'êtes pas autorisé à refuser ce devis');
    }

    // Vérifier que le devis est en attente
    if (devis.status !== 'en_attente') {
      throw new Error('Ce devis ne peut plus être refusé');
    }

    // Refuser le devis
    await DevisModel.declineDevis(devisId);
    return { message: 'Devis refusé avec succès' };
  }

  // Récupérer tous les devis d'un client
  async getDevisByClient(clientId) {
    return await this.repository.model.find({ client: clientId }).populate('vehicule', 'immatricule marque modele')
    .populate('reponduPar', 'nom prenom').populate('servicesChoisis.service').populate('packsChoisis.servicePack')
    .populate('mecaniciensTravaillant.mecanicien', 'nom prenom tarifHoraire');
  }

  /**
   * Récupère les devis d'un client avec pagination et filtrage
   * @param {string} clientId - L'ID du client
   * @param {Object} filter - Filtre pour la recherche (status, date, etc.)
   * @param {Object} options - Options pour la pagination (page, limit, sort)
   * @returns {Promise<Object>} Les devis trouvés avec métadonnées de pagination
   */
  async getDevisByClientWithPagination(clientId, filter = {}, options = {}) {
    try {
      // Valeurs par défaut pour la pagination
      const page = parseInt(options.page, 10) || 1;
      const limit = parseInt(options.limit, 10) || 10;
      const skip = (page - 1) * limit;
      
      // Options de tri (par défaut: date de création décroissante)
      const sort = options.sort || { dateCreation: -1 };
      
      // Construction du filtre de base avec l'ID du client
      const queryFilter = { client: clientId };
      
      // Ajouter le filtre de statut si présent
      if (filter.status) {
        queryFilter.status = filter.status;
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
        // Recherche dans la description ou problème
        queryFilter.$or = [
          { probleme: { $regex: filter.search, $options: 'i' } }
        ];
      }
      
      // Exécuter la requête avec pagination
      const devis = await this.repository.model.find(queryFilter)
        .populate('vehicule', 'immatricule marque modele')
        .populate('reponduPar', 'nom prenom')
        .populate('servicesChoisis.service')
        .populate('packsChoisis.servicePack')
        .populate('mecaniciensTravaillant.mecanicien', 'nom prenom tarifHoraire')
        .sort(sort)
        .skip(skip)
        .limit(limit);
      
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
      console.error('Erreur dans getDevisByClientWithPagination:', error);
      throw error;
    }
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

async getUnavailableDates() {
  // Récupérer tous les devis en cours
  const devisEnCours = await this.repository.model.find({
    status: { $in: ['en_attente', 'accepte'] } // Filtrer les devis actifs
  }).populate('mecaniciensTravaillant.mecanicien');

  // Récupérer tous les mécaniciens
  const mecaniciens = await UserModel.find({ role: 'mecanicien' });
  // Création d'un objet pour stocker les jours où chaque mécanicien travaille
  let occupation = {};

  devisEnCours.forEach(devis => {
    devis.mecaniciensTravaillant.forEach(mecanicienData => {
      const { mecanicien, debut, heureDeTravail } = mecanicienData;

      if (mecanicien && debut) {
        let dateTravail = new Date(debut);
        let dureeTravail = Math.ceil(heureDeTravail / 8); // Nombre de jours arrondi (ex: 10h -> 2 jours)

        for (let i = 0; i < dureeTravail; i++) {
          let jourTravail = dateTravail.toISOString().split('T')[0]; // Convertir en format YYYY-MM-DD

          if (!occupation[jourTravail]) {
            occupation[jourTravail] = new Set();
          }
          occupation[jourTravail].add(mecanicien._id.toString()); // Ajouter le mécanicien
          dateTravail.setDate(dateTravail.getDate() + 1);
        }
      }
    });
  });

  // Trouver les jours où tous les mécaniciens sont occupés
  let datesBloquees = Object.keys(occupation).filter(date => occupation[date].size >= mecaniciens.length);

  return datesBloquees; // Retourne une liste de dates en format YYYY-MM-DD
}

async toggleTask(devisId, taskId, mecanicienId, type) {
  // Récupérer le devis par son ID
  const devis = await this.repository.model.findById(devisId);
  // Vérifier si le devis existe
  if (!devis) {
    throw new Error('Le devis n\'existe pas');
  }

  // Trouver la tâche dans le bon tableau (servicesChoisis, packsChoisis, ou lignesSupplementaires)
  let taskArray;
  if (type === 'servicesChoisis') {
    taskArray = devis.servicesChoisis;
  } else if (type === 'packsChoisis') {
    taskArray = devis.packsChoisis;
  } else if (type === 'lignesSupplementaires') {
    taskArray = devis.lignesSupplementaires;
  }

  // Trouver la tâche correspondante par taskId
  const task = taskArray.find(item => item._id.toString() === taskId);
  
  // Vérifier si la tâche a été trouvée
  if (!task) {
    throw new Error('Tâche non trouvée');
  }

  // Vérifier si le mécanicien fait partie des mécaniciens travaillant sur ce devis
  const mecanicienPresent = devis.mecaniciensTravaillant.some(item => item.mecanicien.toString() === mecanicienId);
  
  if (!mecanicienPresent) {
    throw new Error('Le mécanicien doit faire partie des mécaniciens travaillant sur ce devis');
  }

  // Vérifier si le mécanicien est celui qui a checké cette tâche
  if (task.completed && task.completedBy && task.completedBy.toString() !== mecanicienId) {
    throw new Error('Seul le mécanicien ayant marqué cette tâche peut la décocher');
  }

  // Basculer l'état de la tâche entre completed: true ou false
  task.completed = !task.completed;

  // Enregistrer ou retirer le mécanicien dans completedBy
  if (task.completed) {
    task.completedBy = mecanicienId;  // Enregistrer l'ID du mécanicien qui a coché la tâche
  } else {
    task.completedBy = null;  // Retirer l'ID du mécanicien si la tâche est décochée
  }

  // Sauvegarder les modifications dans le devis
  await devis.save();

  return task; // Retourner la tâche mise à jour
}
async listDevisForMecanicien(mecanicienId, filter = {}, options = {}) {
  try {
    // Valeurs par défaut pour la pagination
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Options de tri (par défaut: date de création décroissante)
    const sort = options.sort || { dateCreation: -1 };

    // Construction du filtre de base
    const queryFilter = {
      'mecaniciensTravaillant.mecanicien': mecanicienId
    };

    // Ajouter le filtre de statut si présent
    if (filter.status) {
      queryFilter.status = filter.status;
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
      queryFilter.$or = [
        { probleme: { $regex: filter.search, $options: 'i' } }
      ];
    }

    // Exécuter la requête avec pagination
    const devis = await this.repository.model.find(queryFilter)
      .populate([
        { path: 'client', select: 'nom email' },
        { path: 'vehicule', select: 'marque modele' },
        { path: 'servicesChoisis.service', select: 'nom prix' },
        { path: 'packsChoisis.servicePack', select: 'nom prix remise' },
        { path: 'lignesSupplementaires', select: 'nom prix quantite type' }
      ])
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Compter le nombre total de devis pour la pagination
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
    console.error('Erreur dans listDevisForMecanicien:', error);
    throw error;
  }
}


async listTasksForDevis(devisId) {
  try {
    // Trouver le devis par son ID
    const devis = await this.repository.model.findById(devisId).populate([
      {
        path: 'servicesChoisis.service',
        select: 'nom prix'
      },
      {
        path: 'packsChoisis.servicePack',
        select: 'nom prix remise'
      },
      {
        path: 'lignesSupplementaires',
        select: 'nom prix quantite type'
      }
    ]);

    // Vérifier si le devis existe
    if (!devis) {
      throw new Error('Le devis spécifié n\'existe pas');
    }

    const tasks = [];

    // Ajouter les servicesChoisis
    devis.servicesChoisis.forEach(task => {
      tasks.push({
        type: 'service',
        taskId: task._id,
        name: task.service.nom,
        prix: task.prix,
        completed: task.completed,
        priorite: task.priorite
      });
    });

    // Ajouter les packsChoisis
    devis.packsChoisis.forEach(task => {
      tasks.push({
        type: 'pack',
        taskId: task._id,
        name: task.servicePack.nom,
        prix: task.prix,
        completed: task.completed,
        priorite: task.priorite
      });
    });

    // Ajouter les lignesSupplementaires
    devis.lignesSupplementaires.forEach(task => {
      tasks.push({
        type: 'ligneSupplementaire',
        taskId: task._id,
        name: task.nom,
        prix: task.prix,
        completed: task.completed,
        priorite: task.priorite
      });
    });

    return tasks; // Retourne la liste des tâches
  } catch (error) {
    throw new Error('Erreur lors de la récupération des tâches du devis: ' + error.message);
  }
}

// Ajouter un service à un devis existant
async addService(devisId, serviceData) {
  // Vérifier que le devis existe
  const devis = await this.repository.model.findById(devisId);
  if (!devis) {
    throw new Error('Devis non trouvé');
  }

  // Vérifier que le devis n'est pas déjà finalisé
  if (devis.status === 'termine' || devis.status === 'refuse') {
    throw new Error('Impossible de modifier un devis déjà finalisé ou refusé');
  }

  // Ajouter le service au devis
  devis.servicesChoisis.push(serviceData);
  
  // Sauvegarder le devis
  await devis.save();
  
  // Recalculer le total
  await DevisModel.updateTotal(devisId);
  
  // Retourner le devis mis à jour
  return devis;
}

// Ajouter un pack de services à un devis existant
async addServicePack(devisId, packData) {
  // Vérifier que le devis existe
  const devis = await this.repository.model.findById(devisId);
  if (!devis) {
    throw new Error('Devis non trouvé');
  }

  // Vérifier que le devis n'est pas déjà finalisé
  if (devis.status === 'termine' || devis.status === 'refuse') {
    throw new Error('Impossible de modifier un devis déjà finalisé ou refusé');
  }

  // Ajouter le pack au devis
  devis.packsChoisis.push(packData);
  
  // Sauvegarder le devis
  await devis.save();
  
  // Recalculer le total
  await DevisModel.updateTotal(devisId);
  
  // Retourner le devis mis à jour
  return devis;
}

}

module.exports = new DevisService(); 