import axios from 'axios';

// Set axios base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5001' : window.location.origin);

axios.defaults.baseURL = API_BASE_URL;

export default axios;
