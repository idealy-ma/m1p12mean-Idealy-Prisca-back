const BaseController = require('./BaseController');
const UserService = require('../services/UserService');
/**
 * Contrôleur pour gérer les utilisateurs
 * Suit le principe d'interface ségrégation (I de SOLID)
 */
class UserController extends BaseController {
  constructor() {
    super(UserService);
  }

  /**
   * Authentifie un utilisateur
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  login = async (req, res) => {
    try {
      const { email, motDePasse } = req.body;
      if (!email || !motDePasse) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir un email et un mot de passe'
        });
      }
      
      const user = await this.service.authenticate(email, motDePasse);
      
      // Ici, vous pourriez générer un token JWT
      const token = this.service.generateToken(user);

      res.status(200).json({
        success: true,
        token,
        data: user
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Récupère l'utilisateur actuel
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  getMe = async (req, res) => {
    try {
      // req.user serait défini par un middleware d'authentification
      const user = await this.service.getById(req.user.id);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Récupère des utilisateurs par rôle
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  getByRole = async (req, res) => {
    try {
      const { role } = req.params;
      
      if (!role) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir un rôle'
        });
      }
      
      const users = await this.service.getByRole(role);
      
      res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Change le statut actif d'un utilisateur
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  changeActiveStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const { estActif } = req.body;
      
      if (estActif === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir un statut actif'
        });
      }
      
      const user = await this.service.changeActiveStatus(id, estActif);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
}

module.exports = new UserController(); 