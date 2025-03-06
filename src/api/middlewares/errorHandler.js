/**
 * Middleware pour gérer les erreurs
 * Centralise la gestion des erreurs pour toute l'application
 */

// Gestionnaire d'erreurs pour les erreurs de développement
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Gestionnaire d'erreurs pour les erreurs de production
const sendErrorProd = (err, res) => {
  // Erreur opérationnelle, connue : envoyer message au client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Erreur de programmation ou inconnue : ne pas divulguer les détails
    console.error('ERREUR 💥', err);
    res.status(500).json({
      success: false,
      message: 'Une erreur est survenue'
    });
  }
};

// Gestionnaire d'erreurs pour les erreurs de validation Mongoose
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Données invalides. ${errors.join('. ')}`;
  
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  
  return error;
};

// Gestionnaire d'erreurs pour les erreurs de duplication MongoDB
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Valeur en double: ${value}. Veuillez utiliser une autre valeur.`;
  
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  
  return error;
};

// Gestionnaire d'erreurs pour les erreurs de cast MongoDB
const handleCastErrorDB = (err) => {
  const message = `Valeur invalide ${err.value} pour le champ ${err.path}`;
  
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  
  return error;
};

// Middleware principal de gestion des erreurs
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  
  // Environnement de développement
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } 
  // Environnement de production
  else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    
    // Erreurs Mongoose/MongoDB
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    
    sendErrorProd(error, res);
  }
};

module.exports = errorHandler; 