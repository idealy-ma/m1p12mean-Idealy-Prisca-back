const StatistiqueService = require('../services/StatistiqueService');
const AppError = require('../utils/AppError'); // Pour la gestion d'erreurs standard

class StatistiqueController {

    // Méthode pour récupérer le CA total
    async getChiffreAffaires(req, res, next) {
        try {
            const { dateDebut, dateFin } = req.query;
            // TODO: Ajouter une validation plus robuste des dates ici si nécessaire

            const data = await StatistiqueService.getChiffreAffairesTotal(dateDebut, dateFin);
            res.status(200).json({
                success: true,
                data: data
            });
        } catch (error) {
            next(error); // Passe l'erreur au gestionnaire global
        }
    }

    // Méthode pour récupérer le CA par type de service
    async getCAParType(req, res, next) {
        try {
            const { dateDebut, dateFin } = req.query;
             // TODO: Validation dates

            const data = await StatistiqueService.getChiffreAffairesParType(dateDebut, dateFin);
            res.status(200).json({
                success: true,
                data: data // Retourne un tableau [{ type: '...', totalCA: ... }]
            });
        } catch (error) {
            next(error);
        }
    }

    // Méthode pour récupérer les statistiques des statuts de devis
    async getStatutsDevis(req, res, next) {
        try {
            const { dateDebut, dateFin } = req.query;
             // TODO: Validation dates

            const data = await StatistiqueService.getStatutsDevis(dateDebut, dateFin);
            res.status(200).json({
                success: true,
                data: data // Retourne { detailsParStatut: [...], totalDevis: ..., etc. }
            });
        } catch (error) {
            next(error);
        }
    }

    // Ajouter d'autres méthodes pour d'autres stats si besoin
}

// Exporter une instance du contrôleur
// Binder 'this' n'est pas nécessaire ici car nous n'utilisons pas 'this' dans les méthodes
// Si on utilisait une injection de dépendance via constructeur, le binding serait utile.
module.exports = new StatistiqueController();

