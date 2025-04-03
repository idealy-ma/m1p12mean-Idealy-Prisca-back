const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const BaseModel = require('./BaseModel'); // Importer BaseModel

// Sous-schéma pour les lignes de facture
const LigneFactureSchema = new Schema({
    designation: { 
        type: String, 
        required: [true, 'La désignation est requise.'] 
    },
    quantite: {
        type: Number,
        required: [true, 'La quantité est requise.'],
        min: [0, 'La quantité ne peut pas être négative.']
    },
    prixUnitaireHT: {
        type: Number,
        required: [true, 'Le prix unitaire HT est requis.'],
        min: [0, 'Le prix unitaire ne peut pas être négatif.']
    },
    tauxTVA: {
        type: Number,
        required: [true, 'Le taux de TVA est requis.'],
        default: 20 // Valeur par défaut si non fournie
    },
    montantHT: { 
        type: Number,
        required: true 
    },
    montantTVA: { 
        type: Number,
        required: true 
    },
    montantTTC: { 
        type: Number,
        required: true 
    },
    type: {
        type: String,
        enum: ['piece', 'main_oeuvre'],
        required: [true, 'Le type de ligne est requis (piece ou main_oeuvre).']
    },
    reference: { // Référence pour les pièces
        type: String 
    }
}, { _id: false }); // Pas besoin d'un _id séparé pour les lignes

// Sous-schéma pour les transactions de paiement
const TransactionSchema = new Schema({
    date: { 
        type: Date, 
        default: Date.now 
    },
    montant: {
        type: Number,
        required: [true, 'Le montant de la transaction est requis.']
    },
    modePaiement: {
        type: String,
        enum: ['especes', 'carte', 'virement', 'cheque', 'en_ligne'],
        required: [true, 'Le mode de paiement est requis.']
    },
    reference: { // Référence de la transaction (ex: numéro de chèque, ID transaction en ligne)
        type: String 
    },
    statut: {
        type: String,
        enum: ['en_attente', 'validee', 'rejetee', 'remboursee'],
        default: 'validee' // ou 'en_attente' si une validation manuelle est nécessaire
    }
}, { timestamps: true, _id: true }); // Ajouter _id et timestamps aux transactions

// Sous-schéma pour la remise
const RemiseSchema = new Schema({
    montant: { 
        type: Number, 
        required: true, 
        default: 0 
    },
    pourcentage: { 
        type: Number 
    },
    description: { 
        type: String 
    }
}, { _id: false });

// Schéma principal pour la Facture
const FactureSchema = new Schema({
    // numeroFacture sera généré par le service lors de la création
    numeroFacture: { 
        type: String,
        unique: true,
        required: true // Rendre requis car il sera défini par le service
    },
    dateEmission: {
        type: Date,
        default: Date.now,
        required: true
    },
    dateEcheance: {
        type: Date,
        required: true
    },
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    vehicule: {
        type: Schema.Types.ObjectId,
        ref: 'Vehicule', 
        required: true
    },
    reparation: { 
        type: Schema.Types.ObjectId,
        ref: 'Reparation',
        required: true,
        index: true 
    },
    devis: { 
        type: Schema.Types.ObjectId,
        ref: 'Devis'
    },
    lignesFacture: {
        type: [LigneFactureSchema],
        validate: [v => Array.isArray(v) && v.length > 0, 'La facture doit contenir au moins une ligne.']
    },
    montantHT: {
        type: Number,
        required: true,
        min: 0
    },
    montantTVA: {
        type: Number,
        required: true,
        min: 0
    },
    montantTTC: {
        type: Number,
        required: true,
        min: 0
    },
    remise: { 
        type: RemiseSchema 
    },
    statut: {
        type: String,
        enum: ['brouillon', 'validee', 'emise', 'payee', 'partiellement_payee', 'annulee', 'en_retard'],
        default: 'brouillon',
        required: true
    },
    transactions: {
        type: [TransactionSchema] 
    },
    commentaires: {
        type: String 
    },
    delaiPaiement: { 
        type: Number,
        default: 30,
        required: true
    },
    creePar: { 
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    validePar: { 
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { 
    timestamps: true, 
});

// Calculs automatiques avant sauvegarde
FactureSchema.pre('save', function(next) {
    let totalHT = 0;
    this.lignesFacture.forEach(ligne => {
        ligne.montantHT = ligne.quantite * ligne.prixUnitaireHT;
        ligne.montantTVA = ligne.montantHT * (ligne.tauxTVA / 100);
        ligne.montantTTC = ligne.montantHT + ligne.montantTVA;
        totalHT += ligne.montantHT;
    });
    this.montantHT = totalHT;
    this.montantTVA = this.lignesFacture.reduce((sum, ligne) => sum + ligne.montantTVA, 0);
    const remiseMontant = this.remise ? this.remise.montant : 0;
    this.montantTTC = this.montantHT + this.montantTVA - remiseMontant;
    next();
});

// Créer le modèle Mongoose
const FactureModel = mongoose.model('Facture', FactureSchema);

// Définir la classe Facture qui étend BaseModel
class Facture extends BaseModel {
  constructor() {
    super(FactureModel); // Passer le modèle Mongoose au constructeur parent
  }
}

// Exporter une instance de la classe Facture (qui encapsule le modèle)
module.exports = new Facture(); 