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

  registerUser = async (req, res) => {
    try {
      const { nom, prenom, email, motDePasse, role, telephone, adresse } = req.body;
  
      // Valider les champs
      this.service.validateFields({ nom, prenom, email, motDePasse });

      // Vérifier si l'utilisateur existe déjà
      await this.service.checkIfUserExists(email);

      // Hashage du mot de passe
      const hashedPassword = await this.service.hashPassword(motDePasse);
  
      // Création de l'utilisateur
      const newUser = {
        nom,
        prenom,
        email,
        motDePasse: hashedPassword,
        role,
        telephone,
        adresse,
        estActif: true // L'utilisateur peut être actif immédiatement
      };
  
  
      // Générer un token JWT
      const token = this.service.generateToken(newUser);

      // Sauvegarder l'utilisateur dans la base de données
      await this.service.create(newUser); 

      // Répondre avec l'utilisateur créé et le token JWT
      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: {
          user: {
            id: newUser._id,
            nom: newUser.nom,
            prenom: newUser.prenom,
            email: newUser.email,
            role: newUser.role,
            telephone: newUser.telephone,
            adresse: newUser.adresse
          },
          token
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de l\'inscription de l\'utilisateur'
      });
    }
  };
  
  /**
   * Enregistre un nouvel employé (mécanicien ou manager)
   * Accessible uniquement par les managers
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  registerEmployee = async (req, res) => {
    try {
      const { nom, prenom, email, motDePasse, role, telephone, adresse } = req.body;
      
      // Valider les champs obligatoires
      this.service.validateFields({ nom, prenom, email, motDePasse });
      
      // Vérifier que le rôle est valide (mécanicien ou manager uniquement)
      if (role !== 'mecanicien' && role !== 'manager') {
        return res.status(400).json({
          success: false,
          message: 'Le rôle doit être soit mécanicien soit manager'
        });
      }
      
      // Vérifier si un utilisateur avec cet email existe déjà
      await this.service.checkIfUserExists(email);
      
      // Hashage du mot de passe
      const hashedPassword = await this.service.hashPassword(motDePasse);
      
      // Création de l'employé
      const newEmployee = {
        nom,
        prenom,
        email,
        motDePasse: hashedPassword,
        role,
        telephone,
        adresse,
        estActif: true // L'employé est actif dès sa création
      };
      
      // Sauvegarder l'employé dans la base de données
      const savedEmployee = await this.service.create(newEmployee);
      
      // Masquer le mot de passe dans la réponse
      savedEmployee.motDePasse = undefined;
      
      // Répondre avec l'employé créé
      res.status(201).json({
        success: true,
        message: `${role === 'mecanicien' ? 'Mécanicien' : 'Manager'} créé avec succès`,
        data: savedEmployee
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la création de l\'employé'
      });
    }
  };
}

module.exports = new UserController(); 