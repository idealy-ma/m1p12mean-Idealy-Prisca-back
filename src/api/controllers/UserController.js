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

  /**
   * Permet à un utilisateur de mettre à jour ses propres informations
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  updateProfile = async (req, res) => {
    try {
      // L'utilisateur est récupéré à partir du middleware d'authentification
      const userId = req.user._id;
      
      // Données autorisées à être mises à jour par l'utilisateur
      const { nom, prenom, telephone, adresse } = req.body;
      
      // Créer un objet avec les données à mettre à jour
      const updateData = {};
      if (nom) updateData.nom = nom;
      if (prenom) updateData.prenom = prenom;
      if (telephone) updateData.telephone = telephone;
      if (adresse) updateData.adresse = adresse;
      
      // Mise à jour du mot de passe si fourni
      if (req.body.motDePasse) {
        updateData.motDePasse = await this.service.hashPassword(req.body.motDePasse);
      }
      
      // Ne pas autoriser la modification du rôle ou du statut actif par l'utilisateur lui-même
      // Seul un manager peut changer ces valeurs
      
      // Mettre à jour l'utilisateur dans la base de données
      const updatedUser = await this.service.update(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: updatedUser
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du profil'
      });
    }
  };

  /**
   * Supprime un employé (mécanicien ou manager)
   * Accessible uniquement par les managers
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  deleteEmployee = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Vérifier si l'employé existe et s'il est bien un mécanicien ou un manager
      const employee = await this.service.getById(id);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employé non trouvé'
        });
      }
      
      // Vérifier que l'utilisateur est bien un employé (mécanicien ou manager)
      if (employee.role !== 'mecanicien' && employee.role !== 'manager') {
        return res.status(400).json({
          success: false,
          message: 'L\'utilisateur n\'est pas un employé (mécanicien ou manager)'
        });
      }
      
      // Un manager ne peut pas se supprimer lui-même
      if (employee._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas vous supprimer vous-même'
        });
      }
      
      // Supprimer l'employé
      await this.service.delete(id);
      
      res.status(200).json({
        success: true,
        message: `${employee.role === 'mecanicien' ? 'Mécanicien' : 'Manager'} supprimé avec succès`,
        data: null
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la suppression de l\'employé'
      });
    }
  };

  /**
   * Suspend un utilisateur (définit estActif à false)
   * Accessible uniquement par les managers
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  suspendUser = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Vérifier si l'utilisateur existe
      const user = await this.service.getById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }
      
      // Un manager ne peut pas se suspendre lui-même
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas vous suspendre vous-même'
        });
      }
      
      // Si l'utilisateur à suspendre est un manager, vérifier que l'action est autorisée
      if (user.role === 'manager') {
        // Autoriser uniquement si ce n'est pas le dernier manager actif
        const activeManagers = await this.service.getActiveManagersCount();
        if (activeManagers <= 1 && user.estActif) {
          return res.status(400).json({
            success: false,
            message: 'Impossible de suspendre le dernier manager actif'
          });
        }
      }
      
      // Suspendre l'utilisateur (définir estActif à false)
      const suspendedUser = await this.service.changeActiveStatus(id, false);
      
      res.status(200).json({
        success: true,
        message: `L'utilisateur ${user.prenom} ${user.nom} a été suspendu avec succès`,
        data: suspendedUser
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la suspension de l\'utilisateur'
      });
    }
  };

  /**
   * Change le rôle d'un employé (mécanicien ou manager)
   * Accessible uniquement par les managers
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  changeEmployeeRole = async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Vérifier que le rôle est valide
      if (role !== 'mecanicien' && role !== 'manager') {
        return res.status(400).json({
          success: false,
          message: 'Le rôle doit être soit mécanicien soit manager'
        });
      }
      
      // Vérifier si l'employé existe
      const employee = await this.service.getById(id);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employé non trouvé'
        });
      }
      
      // Vérifier que l'utilisateur est bien un employé (mécanicien ou manager)
      if (employee.role !== 'mecanicien' && employee.role !== 'manager') {
        return res.status(400).json({
          success: false,
          message: 'L\'utilisateur n\'est pas un employé (mécanicien ou manager)'
        });
      }
      
      // Un manager ne peut pas changer son propre rôle
      if (employee._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Vous ne pouvez pas modifier votre propre rôle'
        });
      }
      
      // Si on change le rôle d'un manager à mécanicien, vérifier s'il reste assez de managers
      if (employee.role === 'manager' && role === 'mecanicien') {
        const activeManagers = await this.service.getActiveManagersCount();
        if (activeManagers <= 1 && employee.estActif) {
          return res.status(400).json({
            success: false,
            message: 'Impossible de changer le rôle du dernier manager actif'
          });
        }
      }
      
      // Changer le rôle de l'employé
      const updatedEmployee = await this.service.update(id, { role });
      
      res.status(200).json({
        success: true,
        message: `Le rôle de l'employé ${employee.prenom} ${employee.nom} a été changé en ${role === 'mecanicien' ? 'mécanicien' : 'manager'} avec succès`,
        data: updatedEmployee
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors du changement de rôle de l\'employé'
      });
    }
  };
}

module.exports = new UserController(); 