const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schéma pour stocker les compteurs séquentiels
const CounterSchema = new Schema({
    _id: { // Le nom du compteur (ex: 'facture_seq')
        type: String, 
        required: true
    },
    seq: { // La dernière valeur de séquence utilisée
        type: Number, 
        default: 0 
    }
});

// Méthode statique pour obtenir le prochain numéro de séquence de manière atomique
CounterSchema.statics.getNextSequenceValue = async function(sequenceName) {
    const sequenceDocument = await this.findByIdAndUpdate(
        sequenceName, 
        { $inc: { seq: 1 } }, // Incrémenter la séquence
        { new: true, upsert: true } // Retourner le nouveau doc, le créer s'il n'existe pas
    );
    return sequenceDocument.seq;
};

module.exports = mongoose.model('Counter', CounterSchema); 