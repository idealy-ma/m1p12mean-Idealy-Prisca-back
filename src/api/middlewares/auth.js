const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const config = require('../../config');

/**
 * Middleware pour protéger les routes
 * Vérifie si l'utilisateur est authentifié via un token JWT
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Vérifier si le token est présent dans les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    try {
      // Vérifier le token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Ajouter l'utilisateur à la requête
      const user = await UserModel.model.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      if (!user.estActif) {
        return res.status(401).json({
          success: false,
          message: 'Votre compte est désactivé. Veuillez contacter l\'administrateur.'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

/**
 * Middleware pour autoriser certains rôles
 * @param {...String} roles - Les rôles autorisés
 * @returns {Function} Middleware Express
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Le rôle ${req.user.role} n'est pas autorisé à accéder à cette ressource`
      });
    }

    next();
  };
}; 