const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
const vehiculeController = require('../controllers/vehiculeController');
const router = express.Router();

// Toutes ces routes nécessitent d'être authentifié en tant que client
router.use(protect);
router.use(authorize('client'));

function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]; // Extraire le token de l'en-tête Authorization

  if (!token) {
    return res.status(403).json({ message: 'Token requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token invalide' });
    }
    req.user = decoded; // L'utilisateur est ajouté à la requête
    next();
  });
}
// Route pour récupérer les véhicules de l'utilisateur connecté
router.get('/vehicules', verifyToken, vehiculeController.getVehicules);


module.exports = router; 