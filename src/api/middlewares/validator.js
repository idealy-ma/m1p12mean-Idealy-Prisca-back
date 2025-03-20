const { body, validationResult } = require('express-validator');

/**
 * Middleware de validation des données pour les employés
 */
exports.validateEmployeeInput = [
  body('nom')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  
  body('prenom')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis')
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('L\'email est requis')
    .isEmail()
    .withMessage('L\'email n\'est pas valide')
    .normalizeEmail(),
  
  body('motDePasse')
    .trim()
    .notEmpty()
    .withMessage('Le mot de passe est requis')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Le rôle est requis')
    .isIn(['manager', 'mecanicien'])
    .withMessage('Le rôle doit être soit "manager" soit "mecanicien"'),
  
  body('telephone')
    .optional()
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Le numéro de téléphone doit contenir entre 8 et 20 caractères'),
  
  body('adresse')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('L\'adresse ne doit pas dépasser 200 caractères'),
  
  // Middleware pour vérifier les erreurs de validation
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: errors.array()
      });
    }
    next();
  }
];

// Export d'autres validateurs au besoin 