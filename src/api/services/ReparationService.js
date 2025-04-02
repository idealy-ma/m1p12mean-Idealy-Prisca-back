const BaseService = require('./BaseService');
const Reparation = require('../models/Reparation'); // Importer le modèle Mongoose

class ReparationService extends BaseService {
  constructor() {
    // Passer le modèle Mongoose directement à BaseService
    super(Reparation);
  }

  // Méthodes spécifiques au service Reparation peuvent être ajoutées ici plus tard.
  // Par exemple :
  // async findByMecanicien(mecanicienId) { ... }
  // async addEtape(reparationId, etapeData) { ... }
  // async updateEtapeStatus(reparationId, etapeId, status) { ... }

}

module.exports = new ReparationService(); 