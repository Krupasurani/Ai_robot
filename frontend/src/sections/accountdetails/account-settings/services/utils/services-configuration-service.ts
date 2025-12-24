import axios from 'src/utils/axios';

// Base API URL
const API_BASE_URL = '/api/v1/configurationManager';

// ============================================================================
// Types
// ============================================================================

export interface PublicUrlConfig {
  url: string;
}

export interface SystemHealth {
  api: boolean;
  database: boolean;
  search: boolean;
}

// ============================================================================
// Public URL Configuration
// ============================================================================

/**
 * Fetch Frontend Public URL configuration
 * @returns {Promise<PublicUrlConfig>} The frontend public URL configuration
 */
export const getFrontendPublicUrl = async (): Promise<PublicUrlConfig> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/frontendPublicUrl`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Frontend Public URL:', error);
    throw error;
  }
};

/**
 * Update Frontend Public URL configuration
 * @param {string} url - The new frontend public URL
 * @returns {Promise<any>} The API response
 */
export const updateFrontendPublicUrl = async (url: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/frontendPublicUrl`, { url });
    return response;
  } catch (error) {
    console.error('Failed to update Frontend Public URL:', error);
    throw error;
  }
};

/**
 * Fetch Connector Public URL configuration
 * @returns {Promise<PublicUrlConfig>} The connector public URL configuration
 */
export const getConnectorPublicUrl = async (): Promise<PublicUrlConfig> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/connectorPublicUrl`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Connector Public URL:', error);
    throw error;
  }
};

/**
 * Update Connector Public URL configuration
 * @param {string} url - The new connector public URL
 * @returns {Promise<any>} The API response
 */
export const updateConnectorPublicUrl = async (url: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/connectorPublicUrl`, { url });
    return response;
  } catch (error) {
    console.error('Failed to update Connector Public URL:', error);
    throw error;
  }
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  getFrontendPublicUrl,
  updateFrontendPublicUrl,
  getConnectorPublicUrl,
  updateConnectorPublicUrl,
};
