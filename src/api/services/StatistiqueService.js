const mongoose = require('mongoose');
// Importer directement les modèles Mongoose
// Assurez-vous que les chemins sont corrects et que ces fichiers exportent bien le modèle Mongoose
const Facture = require('../models/Facture'); // Supposons que Facture.js exporte le modèle mongoose.model('Facture', ...)
const Devis = require('../models/Devis');     // Supposons que Devis.js exporte le modèle mongoose.model('Devis', ...)
const AppError = require('../utils/AppError'); // Pour la gestion d'erreurs

// Helper pour construire le filtre de date pour les agrégations
const buildDateFilter = (dateField, dateDebut, dateFin) => {
    const dateFilter = {};
    if (dateDebut) {
        try {
            // Valider le format YYYY-MM-DD (simple vérification)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDebut)) throw new Error('Format invalide');
            dateFilter.$gte = new Date(dateDebut + 'T00:00:00.000Z'); // Début de journée UTC
        } catch (e) { console.error(`Date de début invalide: ${dateDebut}`); /* Ne pas ajouter si invalide */ }
    }
    if (dateFin) {
        try {
             // Valider le format YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFin)) throw new Error('Format invalide');
            const endDate = new Date(dateFin + 'T00:00:00.000Z');
            endDate.setDate(endDate.getDate() + 1); // Début du jour suivant pour inclure toute la journée dateFin
            dateFilter.$lt = endDate;
        } catch (e) { console.error(`Date de fin invalide: ${dateFin}`); /* Ne pas ajouter si invalide */ }
    }
    // Retourne un objet { [dateField]: { $gte: ..., $lt: ... } } ou un objet vide si aucune date valide
    return Object.keys(dateFilter).length > 0 ? { [dateField]: dateFilter } : {};
};


class StatistiqueService {

    /**
     * Calcule le chiffre d'affaires total sur une période donnée.
     * Basé sur la somme des montantTTC des factures émises (non annulées).
     * @param {string} dateDebut - Date de début (YYYY-MM-DD)
     * @param {string} dateFin - Date de fin (YYYY-MM-DD)
     * @returns {Promise<{totalCA: number}>}
     */
    async getChiffreAffairesTotal(dateDebut, dateFin) {
        try {
            // Utiliser mongoose.model pour être sûr d'avoir le modèle
            const FactureModel = mongoose.model('Facture');
            const dateMatch = buildDateFilter('dateEmission', dateDebut, dateFin);
            const matchStage = {
                statut: { $ne: 'annulee' },
                ...dateMatch // Fusionne avec le filtre de date
            };

            const result = await FactureModel.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalCA: { $sum: '$montantTTC' }
                    }
                },
                { $project: { _id: 0, totalCA: 1 } }
            ]);

            // Arrondir le résultat à 2 décimales
            const totalCA = result.length > 0 ? parseFloat(result[0].totalCA.toFixed(2)) : 0;
            return { totalCA: totalCA };

        } catch (error) {
            console.error("Erreur dans getChiffreAffairesTotal:", error);
            throw new AppError("Erreur serveur lors du calcul du chiffre d'affaires total.", 500);
        }
    }

    /**
     * Calcule le chiffre d'affaires par type de service/ligne sur une période.
     * @param {string} dateDebut - Date de début (YYYY-MM-DD)
     * @param {string} dateFin - Date de fin (YYYY-MM-DD)
     * @returns {Promise<Array<{type: string, totalCA: number}>>}
     */
    async getChiffreAffairesParType(dateDebut, dateFin) {
         try {
            const FactureModel = mongoose.model('Facture');
            const dateMatch = buildDateFilter('dateEmission', dateDebut, dateFin);
            const matchStage = {
                statut: { $ne: 'annulee' },
                ...dateMatch
            };

            const results = await FactureModel.aggregate([
                { $match: matchStage },
                { $unwind: '$lignesFacture' }, // Décomposer les lignes de facture
                {
                    $group: {
                        _id: '$lignesFacture.type', // Grouper par type ('service', 'pack', 'piece', 'main_oeuvre')
                        totalCA: { $sum: '$lignesFacture.montantTTC' } // Sommer le TTC de chaque ligne
                    }
                },
                {
                    $project: {
                        _id: 0, // Exclure l'ID technique
                        type: '$_id', // Renommer _id en type
                        // Arrondir le résultat à 2 décimales
                        totalCA: { $round: ['$totalCA', 2] }
                    }
                },
                { $sort: { totalCA: -1 } } // Trier par CA décroissant (optionnel)
            ]);

            // S'assurer qu'on retourne un tableau même si vide
            return results || [];

        } catch (error) {
            console.error("Erreur dans getChiffreAffairesParType:", error);
            throw new AppError("Erreur serveur lors du calcul du chiffre d'affaires par type.", 500);
        }
    }

    /**
     * Compte le nombre de devis par statut sur une période donnée et calcule le taux d'acceptation.
     * @param {string} dateDebut - Date de début (YYYY-MM-DD)
     * @param {string} dateFin - Date de fin (YYYY-MM-DD)
     * @returns {Promise<{detailsParStatut: Array<{statut: string, count: number}>, totalDevis: number, devisAcceptes: number, tauxAcceptation: number}>}
     */
    async getStatutsDevis(dateDebut, dateFin) {
        try {
            const DevisModel = mongoose.model('Devis');
            // Utiliser dateCreation du devis pour le filtre de période
            const dateMatch = buildDateFilter('dateCreation', dateDebut, dateFin);

            const results = await DevisModel.aggregate([
                { $match: dateMatch }, // Appliquer le filtre de date
                {
                    $group: {
                        _id: '$status', // Grouper par le champ 'status' du devis
                        count: { $sum: 1 } // Compter les documents dans chaque groupe
                    }
                },
                {
                    $project: {
                        _id: 0,
                        statut: '$_id', // Renommer _id en statut
                        count: 1
                    }
                },
                 { $sort: { statut: 1 } } // Trier par nom de statut (optionnel)
            ]);

            // Calculer le total pour le taux d'acceptation
            const totalDevis = results.reduce((sum, item) => sum + item.count, 0);
            // Trouver le compte pour 'accepte' (attention à la casse si besoin)
            const devisAcceptes = results.find(item => item.statut && item.statut.toLowerCase() === 'accepte')?.count || 0;
            // Calculer le taux, éviter division par zéro, arrondir
            const tauxAcceptation = totalDevis > 0 ? parseFloat(((devisAcceptes / totalDevis) * 100).toFixed(1)) : 0;


            return {
                detailsParStatut: results || [],
                totalDevis: totalDevis,
                devisAcceptes: devisAcceptes,
                tauxAcceptation: tauxAcceptation
            };

        } catch (error) {
            console.error("Erreur dans getStatutsDevis:", error);
            throw new AppError("Erreur serveur lors du calcul des statistiques de devis.", 500);
        }
    }

    // On pourrait ajouter ici d'autres méthodes de statistiques si besoin
    // Par exemple, une méthode pour obtenir l'évolution du CA par mois sur l'année

}

module.exports = new StatistiqueService();

