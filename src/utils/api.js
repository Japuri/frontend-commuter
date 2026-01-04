// Utility to get the API base URL depending on environment
// Usage: import { API_BASE_URL } from '../utils/api';

// Always use Render backend for production
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://backend-commuter.onrender.com';
