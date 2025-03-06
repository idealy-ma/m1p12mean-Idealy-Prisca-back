import mongoose from 'mongoose';
import { database } from '../config';

/**
 * Classe pour gérer la connexion à la base de données MongoDB
 * Suit le principe de responsabilité unique (S de SOLID)
 */
class Database {
  constructor() {
    this.mongoose = mongoose;
    this.isConnected = false;
    this.connection = null;
  }

  /**
   * Connecte à la base de données MongoDB
   * @returns {Promise<mongoose.Connection>} La connexion à la base de données
   */
  async connect() {
    try {
      if (this.isConnected) {
        console.log('Utilisation de la connexion MongoDB existante');
        return this.connection;
      }

      console.log('Connexion à MongoDB...');
      this.connection = await this.mongoose.connect(database.uri);
      this.isConnected = true;
      console.log('Connexion à MongoDB établie avec succès');
      return this.connection;
    } catch (error) {
      console.error('Erreur de connexion à MongoDB:', error.message);
      process.exit(1);
    }
  }

  /**
   * Déconnecte de la base de données MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.mongoose.disconnect();
      this.isConnected = false;
      console.log('Déconnexion de MongoDB réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion de MongoDB:', error.message);
      throw error;
    }
  }
}

// Exporter une instance unique (pattern Singleton)
export default new Database(); 