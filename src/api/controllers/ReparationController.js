const ReparationService = require('../services/ReparationService');
const mongoose = require('mongoose');
const Vehicule = require('../models/Vehicule');
const User = require('../models/User');

class ReparationController {

  /**
   * Récupère les détails d'une réparation par son ID.
   * Vérifie les droits d'accès :
   * - Le client propriétaire peut voir sa réparation.
   * - Le mécanicien assigné peut voir la réparation.
   * - Un manager peut voir n'importe quelle réparation.
   * @param {Object} req - Requête Express (avec req.user venant du middleware protect)
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getReparationById = async (req, res, next) => {
    try {
      const reparationId = req.params.id;
      const userId = req.user._id;
      const userRole = req.user.role;

      if (!mongoose.Types.ObjectId.isValid(reparationId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de réparation invalide.',
          error: 'INVALID_ID'
        });
      }

      const reparation = await ReparationService.getReparationByIdAvecDetails(reparationId);

      if (!reparation) {
        return res.status(404).json({ 
          success: false, 
          message: 'Réparation non trouvée.',
          error: 'NOT_FOUND'
        });
      }

      // Vérification des droits d'accès
      let canAccess = false;
      if (userRole === 'manager') {
        canAccess = true;
      } else if (userRole === 'client' && reparation.client?._id.equals(userId)) {
        canAccess = true;
      } else if (userRole === 'mecanicien' && reparation.mecaniciensAssignes?.some(a => a.mecanicien?._id.equals(userId))) {
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès non autorisé à cette réparation.',
          error: 'FORBIDDEN'
        });
      }

      res.status(200).json({
        success: true,
        data: reparation
      });

    } catch (error) {
      console.error("Erreur dans getReparationById:", error);
      next(error);
    }
  }

  /**
   * Récupère la liste de toutes les réparations (avec pagination/filtrage).
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getAllReparations = async (req, res, next) => {
    try {
      // Extraire searchTerm avec les autres filtres spécifiques
      const { page = 1, limit = 10, sort: sortQuery, immatriculationFilter, searchTerm, ...otherFilters } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skipNum = (pageNum - 1) * limitNum;
      
      let sortOption = { dateCreationReparation: -1 }; 
      if (sortQuery) {
        try {
          sortOption = JSON.parse(sortQuery);
        } catch (e) {
          console.warn("Paramètre de tri invalide, utilisation du tri par défaut:", sortQuery);
        }
      }
      
      // Filtre de base avec les filtres directs (ex: statusReparation)
      const filter = { ...otherFilters };
      // Utiliser $and pour combiner tous les filtres complexes
      const andConditions = [];
      // Ajouter les filtres directs s'ils existent
      if (Object.keys(otherFilters).length > 0) {
          // Convertir otherFilters en structure Mongoose si nécessaire (ex: client ID)
          if(otherFilters.client) otherFilters.client = new mongoose.Types.ObjectId(otherFilters.client);
          andConditions.push(otherFilters);
      }

      // Gérer le filtre par immatriculation spécifique
      if (immatriculationFilter) {
        try {
          const vehicles = await Vehicule.find({ 
            immatriculation: { $regex: immatriculationFilter, $options: 'i' } 
          }).select('_id');
          const vehicleIds = vehicles.map(v => v._id);
          andConditions.push({ vehicule: { $in: vehicleIds.length > 0 ? vehicleIds : [new mongoose.Types.ObjectId()] } });
        } catch (vehError) {
          console.error("Erreur filtre immatriculation:", vehError);
        }
      }

      // Gérer le filtre général searchTerm
      if (searchTerm) {
        const searchRegex = { $regex: searchTerm, $options: 'i' };
        const searchOrConditions = [];
        let clientIds = [];
        let vehicleIds = [];

        try {
          // Chercher les IDs clients correspondants
          const clients = await User.find({
            role: 'client',
            $or: [
              { nom: searchRegex },
              { prenom: searchRegex },
              { email: searchRegex },
              { telephone: searchRegex }
            ]
          }).select('_id');
          clientIds = clients.map(c => c._id);
          if (clientIds.length > 0) {
            searchOrConditions.push({ client: { $in: clientIds } });
          }

          // Chercher les IDs véhicules correspondants
          const vehicles = await Vehicule.find({
            $or: [
              { marque: searchRegex },
              { modele: searchRegex },
              { immatriculation: searchRegex } // Recherche aussi ici
            ]
          }).select('_id');
          vehicleIds = vehicles.map(v => v._id);
          if (vehicleIds.length > 0) {
            searchOrConditions.push({ vehicule: { $in: vehicleIds } });
          }

          // Ajouter d'autres champs directs de Reparation si pertinent
          // searchOrConditions.push({ problemeDeclare: searchRegex });

          // Si le terme de recherche est fourni mais ne correspond à rien (client/véhicule)
          // et qu'il n'y a pas d'autres filtres, forcer aucun résultat.
          if (searchOrConditions.length > 0) {
             andConditions.push({ $or: searchOrConditions });
          } else {
             // Le terme de recherche ne correspond à aucun client/véhicule
             // Ajouter une condition impossible pour qu'aucun document ne corresponde
             andConditions.push({ _id: new mongoose.Types.ObjectId() }); 
          }

        } catch (searchError) {
            console.error("Erreur lors de la recherche générale (searchTerm):", searchError);
            // En cas d'erreur de recherche, ignorer ce filtre?
            // Pour l'instant, on ignore.
        }
      }

      // Appliquer la condition $and si elle contient des éléments
      if (andConditions.length > 0) {
          filter.$and = andConditions;
      }
      
      // Utiliser getReparationsAvecDetails avec le filtre final
      const results = await ReparationService.getReparationsAvecDetails(filter, sortOption, skipNum, limitNum);
      // Compter avec le même filtre final
      const total = await ReparationService.repository.model.countDocuments(filter); 
      
      res.status(200).json({
        success: true,
        count: results.length,
        total: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        data: results
      });
    } catch (error) {
      console.error("Erreur dans getAllReparations:", error);
      next(error);
    }
  }

  /**
   * Récupère la liste des réparations en cours assignées au mécanicien connecté.
   * @param {Object} req - Requête Express (avec req.user)
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getMecanicienReparationsEnCours = async (req, res, next) => {
    try {
      const mecanicienId = req.user._id;
      const defaultStatuses = ['Planifiée', 'En cours', 'En attente pièces'];
      
      // Extraire les paramètres comme dans getAllDevis
      const {
        page = 1,
        limit = 10,
        sortField = 'dateDebutPrevue', // Default sort field
        sortOrder = 'asc', // Default sort order
          status,
      } = req.query;
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skipNum = (pageNum - 1) * limitNum;
      
      const filter = {
        'mecaniciensAssignes.mecanicien': mecanicienId,
        statusReparation: { $in: defaultStatuses },
      };
      if (status) {
        filter.statusReparation = status;
      }

      const sortOption = {};
      sortOption[sortField] = sortOrder === 'desc' ? -1 : 1;

      // Utilise la nouvelle méthode pour récupérer les réparations avec les détails nécessaires
      const results = await ReparationService.getReparationsAvecDetails(filter, sortOption, skipNum, limitNum);
      // Le comptage total utilise toujours le filtre simple, pas besoin de populate ici
      console.log(results);
      
      const total = await ReparationService.repository.model.countDocuments(filter);

      res.status(200).json({
        success: true,
        count: results.length,
        total: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        data: results
      });

    } catch (error) {
      console.error("Erreur dans getMecanicienReparationsEnCours:", error);
      next(error);
    }
  }

  /**
   * Met à jour le statut d'une étape spécifique d'une réparation.
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  updateEtapeStatus = async (req, res, next) => {
    try {
      const { reparationId, etapeId } = req.params;
      const { status, dateFin } = req.body; // Nouveau statut et date de fin optionnelle
      const userId = req.user._id;
      const userRole = req.user.role;

      // Validation simple des IDs
      if (!mongoose.Types.ObjectId.isValid(reparationId) || !mongoose.Types.ObjectId.isValid(etapeId)) {
        return res.status(400).json({ success: false, message: 'ID de réparation ou d\'étape invalide.', error: 'INVALID_ID' });
      }

      // Valider que le statut reçu est une valeur valide de l'enum EtapeStatus
      // Utiliser les valeurs exactes définies dans le schéma Mongoose
      const validStatuses = ['En attente', 'En cours', 'Terminée', 'Bloquée']; // Utiliser la liste codée en dur
      if (!status || !validStatuses.includes(status)) {
         return res.status(400).json({ success: false, message: `Statut '${status}' fourni invalide. Les statuts valides sont: ${validStatuses.join(', ')}.`, error: 'INVALID_STATUS' });
      }

      // Récupérer la réparation complète (sans utiliser getReparationByIdAvecDetails car on va la modifier)
      const reparation = await ReparationService.repository.model.findById(reparationId);

      if (!reparation) {
        return res.status(404).json({ success: false, message: 'Réparation non trouvée.', error: 'NOT_FOUND' });
      }

      // Vérification des droits d'accès (Manager ou Mécanicien assigné)
      let canAccess = false;
      if (userRole === 'manager') {
        canAccess = true;
      } else if (userRole === 'mecanicien' && reparation.mecaniciensAssignes?.some(a => a.mecanicien?.equals(userId))) {
        // Utiliser .equals() pour comparer les ObjectIds Mongoose
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à modifier cette étape.', error: 'FORBIDDEN' });
      }

      // Trouver l'étape dans le tableau
      const etapeIndex = reparation.etapesSuivi.findIndex(etape => etape._id.equals(etapeId));

      if (etapeIndex === -1) {
        return res.status(404).json({ success: false, message: 'Étape non trouvée dans cette réparation.', error: 'STEP_NOT_FOUND' });
      }

      // Mettre à jour le statut de l'étape
      reparation.etapesSuivi[etapeIndex].status = status;
      // Mettre à jour la date de fin si fournie et si le statut est 'terminee' ou 'annulee'
      if ((status === 'terminee' || status === 'annulee') && dateFin) {
          reparation.etapesSuivi[etapeIndex].dateFin = new Date(dateFin);
      } else if (status === 'en_cours' || status === 'en_attente') {
          // Optionnel: Effacer la date de fin si on revient à un statut non terminé
          reparation.etapesSuivi[etapeIndex].dateFin = undefined;
      }
      
      // Marquer le tableau comme modifié pour Mongoose
      reparation.markModified('etapesSuivi');

      // Sauvegarder la réparation
      const reparationMiseAJour = await reparation.save();

      // Renvoyer l'étape mise à jour
      res.status(200).json({
        success: true,
        message: 'Statut de l\'étape mis à jour.',
        data: reparationMiseAJour.etapesSuivi[etapeIndex] // Renvoyer juste l'étape modifiée
      });

    } catch (error) {
      console.error("Erreur dans updateEtapeStatus:", error);
      next(error);
    }
  }

  /**
   * Ajoute un commentaire à une étape spécifique d'une réparation.
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  addCommentToEtape = async (req, res, next) => {
    try {
      const { reparationId, etapeId } = req.params;
      const { message } = req.body; // Message du commentaire
      const userId = req.user._id;
      const userRole = req.user.role;

      // Validation
      if (!mongoose.Types.ObjectId.isValid(reparationId) || !mongoose.Types.ObjectId.isValid(etapeId)) {
        return res.status(400).json({ success: false, message: 'ID de réparation ou d\'étape invalide.', error: 'INVALID_ID' });
      }
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Le message du commentaire ne peut pas être vide.', error: 'INVALID_MESSAGE' });
      }

      // Récupérer la réparation
      const reparation = await ReparationService.repository.model.findById(reparationId);
      if (!reparation) {
        return res.status(404).json({ success: false, message: 'Réparation non trouvée.', error: 'NOT_FOUND' });
      }

      // Vérification des droits d'accès (Mécanicien assigné ou Client propriétaire)
      let canAccess = false;
      if (userRole === 'mecanicien' && reparation.mecaniciensAssignes?.some(a => a.mecanicien?.equals(userId))) {
        canAccess = true;
      } else if (userRole === 'client' && reparation.client?.equals(userId)) {
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à commenter cette étape.', error: 'FORBIDDEN' });
      }

      // Trouver l'index de l'étape
      const etapeIndex = reparation.etapesSuivi.findIndex(etape => etape._id.equals(etapeId));
      if (etapeIndex === -1) {
        return res.status(404).json({ success: false, message: 'Étape non trouvée dans cette réparation.', error: 'STEP_NOT_FOUND' });
      }

      // Créer le nouveau commentaire
      const nouveauCommentaire = {
        auteur: userId, // Stocker l'ID de l'auteur
        message: message.trim(),
        date: new Date() // La date est gérée par défaut, mais on peut la forcer ici
      };

      // Ajouter le commentaire au tableau des commentaires de l'étape
      reparation.etapesSuivi[etapeIndex].commentaires.push(nouveauCommentaire);
      
      // Marquer le chemin comme modifié pour Mongoose
      reparation.markModified('etapesSuivi');

      // Sauvegarder la réparation
      const reparationMiseAJour = await reparation.save();

      // Récupérer l'étape mise à jour
      const etapeMiseAJour = reparationMiseAJour.etapesSuivi[etapeIndex];
      
      // Populer l'auteur du dernier commentaire ajouté avant de renvoyer
      // Utiliser .populate() sur le sous-document peut être un peu différent
      // Assurons-nous que l'auteur est bien populé sur l'étape entière récupérée
      await reparationMiseAJour.populate({
          path: 'etapesSuivi.commentaires.auteur',
          select: 'nom prenom role' // Sélectionner les champs nécessaires
      });
      // Récupérer à nouveau l'étape après population générale
      const etapePopulee = reparationMiseAJour.etapesSuivi.find(e => e._id.equals(etapeId)); 

      res.status(201).json({
        success: true,
        message: 'Commentaire ajouté avec succès.',
        data: etapePopulee // Renvoyer l'étape complète avec l'auteur du nouveau commentaire populé
      });

    } catch (error) {
      console.error("Erreur dans addCommentToEtape:", error);
      // Gérer les erreurs de validation Mongoose spécifiques si nécessaire
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message, error: 'VALIDATION_ERROR', details: error.errors });
      }
      next(error);
    }
  }

  /**
   * Ajoute une photo (URL) à une réparation.
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  addPhotoToReparation = async (req, res, next) => {
    try {
      const { reparationId } = req.params;
      const { url, description, etapeAssociee } = req.body; // URL Supabase et métadonnées
      const userId = req.user._id;
      const userRole = req.user.role;

      // Validation
      if (!mongoose.Types.ObjectId.isValid(reparationId)) {
        return res.status(400).json({ success: false, message: 'ID de réparation invalide.', error: 'INVALID_ID' });
      }
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'L\'URL de la photo est requise.', error: 'INVALID_URL' });
      }
       if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'La description de la photo est requise.', error: 'INVALID_DESCRIPTION' });
      }
      if (etapeAssociee && !mongoose.Types.ObjectId.isValid(etapeAssociee)) {
         return res.status(400).json({ success: false, message: 'ID d\'étape associée invalide.', error: 'INVALID_STEP_ID' });
      }

      // Récupérer la réparation
      const reparation = await ReparationService.repository.model.findById(reparationId);
      if (!reparation) {
        return res.status(404).json({ success: false, message: 'Réparation non trouvée.', error: 'NOT_FOUND' });
      }

      // Vérification des droits d'accès (Manager ou Mécanicien assigné)
      let canAccess = false;
      if (userRole === 'manager') {
        canAccess = true;
      } else if (userRole === 'mecanicien' && reparation.mecaniciensAssignes?.some(a => a.mecanicien?.equals(userId))) {
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à ajouter une photo à cette réparation.', error: 'FORBIDDEN' });
      }

      // Vérifier que l'étape associée existe (si fournie)
      if (etapeAssociee && !reparation.etapesSuivi.some(e => e._id.equals(etapeAssociee))) {
           return res.status(404).json({ success: false, message: 'Étape associée non trouvée dans cette réparation.', error: 'STEP_NOT_FOUND' });
      }

      // Créer le nouvel objet photo
      const nouvellePhoto = {
        url: url,
        description: description.trim(),
        ajoutePar: userId,
        dateAjout: new Date()
      };
      if (etapeAssociee) {
        nouvellePhoto.etapeAssociee = etapeAssociee;
      }

      // Ajouter la photo au tableau
      reparation.photos.push(nouvellePhoto);
      
      // Marquer le chemin comme modifié (important pour les tableaux)
      // Bien que push le fasse implicitement, c'est une bonne pratique de l'ajouter
      reparation.markModified('photos'); 

      // Sauvegarder la réparation
      const reparationMiseAJour = await reparation.save();
      
      // Renvoyer la photo juste ajoutée
      // Trouver la photo ajoutée (la dernière du tableau)
      const photoAjoutee = reparationMiseAJour.photos[reparationMiseAJour.photos.length - 1];

      res.status(201).json({
        success: true,
        message: 'Photo ajoutée avec succès.',
        data: photoAjoutee // Renvoyer l'objet photo ajouté
      });

    } catch (error) {
      console.error("Erreur dans addPhotoToReparation:", error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message, error: 'VALIDATION_ERROR', details: error.errors });
      }
      next(error);
    }
  }

  /**
   * Met à jour le statut global d'une réparation (Manager seulement).
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  updateReparationStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, dateFinReelle } = req.body; // Nouveau statut et date de fin optionnelle

      // Validation ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'ID de réparation invalide.', error: 'INVALID_ID' });
      }

      // Valider que le statut reçu est une valeur valide de l'enum ReparationStatus
      // CORRECTION: Utiliser un tableau statique des statuts valides
      const validStatuses = ['Planifiée', 'En cours', 'En attente pièces', 'Terminée', 'Facturée', 'Annulée'];
      if (!status || !validStatuses.includes(status)) {
         return res.status(400).json({ success: false, message: `Statut '${status}' fourni invalide. Les statuts valides sont: ${validStatuses.join(', ')}.`, error: 'INVALID_STATUS' });
      }

      // Préparer les données de mise à jour
      const updateData = { statusReparation: status };
      // Si le statut est Terminé ou Annulé et qu'une date est fournie, l'ajouter
      if ((status === 'Terminée' || status === 'Annulée') && dateFinReelle) {
        updateData.dateFinReelle = new Date(dateFinReelle);
      } else if (status !== 'Terminée' && status !== 'Annulée') {
         // Optionnel: Effacer la date de fin si on passe à un autre statut
         // A discuter: faut-il faire $unset ou mettre à null?
         // Pour l'instant, on ne touche pas si non fournie.
      }

      // Pas besoin de vérifier le rôle ici, le middleware authorize('manager') l'a fait
      
      // Utiliser le BaseService pour mettre à jour
      // Note: ReparationService hérite de BaseService qui a la méthode update
      const updatedReparation = await ReparationService.update(id, updateData);

      if (!updatedReparation) {
        return res.status(404).json({ success: false, message: 'Réparation non trouvée lors de la mise à jour.', error: 'NOT_FOUND' });
      }

      // TODO: Ajouter une logique pour tracer ce changement (ex: dans etapesSuivi) si nécessaire

      res.status(200).json({
        success: true,
        message: 'Statut de la réparation mis à jour avec succès.',
        data: updatedReparation // Renvoyer la réparation complète mise à jour
      });

    } catch (error) {
      console.error("Erreur dans updateReparationStatus:", error);
      // Gérer les erreurs spécifiques (validation, etc.)
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message, error: 'VALIDATION_ERROR', details: error.errors });
      }
       if (error.message === 'Entité non trouvée') { // Erreur venant potentiellement de BaseService.update
         return res.status(404).json({ success: false, message: 'Réparation non trouvée lors de la mise à jour.', error: 'NOT_FOUND' });
       }
      next(error);
    }
  }

}

module.exports = new ReparationController(); 