const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const ServicePackSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true // Assurer l'unicité du nom du pack
    },
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
      }
    ],
    remise : {
      type: Number,
      default: 0
    }
  });

  const ServicePackModel = mongoose.model('ServicePack', ServicePackSchema);

  class ServicePack extends BaseModel {
    constructor() {
      super(ServicePackModel);
    }
  }
  module.exports = new ServicePack(); 