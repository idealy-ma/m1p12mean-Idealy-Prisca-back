const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true  // Pour assurer l'unicité du nom
  },
  type: {
    type: String,
    required: true
  },
  descri:
  {
    type: String
  }
});

const ServiceModel = mongoose.model('Service', ServiceSchema);

class Service extends BaseModel {
  constructor() {
    super(ServiceModel);
  }
}
module.exports = new Service(); 