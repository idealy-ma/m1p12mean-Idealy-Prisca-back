/**
 * Classe d'erreur personnalisée pour l'application
 * Permet de créer des erreurs opérationnelles avec un code de statut HTTP
 */
class AppError extends Error {
  /**
   * @param {string} message - Le message d'erreur
   * @param {number} statusCode - Le code de statut HTTP
   */
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError; 