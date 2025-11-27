import axios from 'axios';
import type { DataArray1D, DataRequestParams } from './types';

//TODO this probably needs to be in line with api.ts

// Create axios instance for H5-specific API calls
// Separate from fiaApi to allow different base URL configuration
const h5Api = axios.create({
  timeout: 30000, // 30 second timeout for potentially large data transfers
});

// Request interceptor to add authentication and base URL
h5Api.interceptors.request.use(async (config) => {
  config.baseURL = import.meta.env.VITE_FIA_PLOTTING_API_URL;

  // Add JWT token from localStorage if not in dev mode
  const isDev = import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
  if (!isDev) {
    const token = localStorage.getItem('scigateway:token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return config;
});

// Response interceptor for error handling and token refresh
h5Api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 403 errors by requesting token refresh from SciGateway
    if (error.response && error.response.status === 403) {
      // Dispatch event to SciGateway to refresh token
      document.dispatchEvent(
        new CustomEvent('scigateway', {
          detail: {
            type: 'requestPluginRerender',
          },
        })
      );
    }
    return Promise.reject(error);
  }
);

/**
 * Fetch 1D data from the backend (for line plots)
 * @param file - The full file path to query
 * @param path - The HDF5 dataset path
 * @param selection - Single selection index (for slicing 2D datasets; omit for true 1D datasets)
 * @returns Promise with the 1D data array
 */
export const fetchData1D = async (file: string, path: string, selection?: number): Promise<DataArray1D> => {
  try {
    const params: DataRequestParams = { file, path };
    // Only include selection parameter if provided (for 2D->1D slicing)
    if (selection !== undefined) {
      params.selection = selection.toString();
    }
    const response = await h5Api.get<DataArray1D>('/data', { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching 1D data for file ${file}:`, error);
    throw error;
  }
};

/**
 * Fetch error data for error bars
 * @param file - The full file path to query
 * @param errorPath - The HDF5 path to the error data
 * @param selection - Single selection index (for slicing 2D datasets; omit for true 1D datasets)
 * @returns Promise with the error data array
 */
export const fetchErrorData = async (file: string, errorPath: string, selection?: number): Promise<DataArray1D> => {
  try {
    const params: DataRequestParams = { file, path: errorPath };
    // Only include selection parameter if provided (for 2D->1D slicing)
    if (selection !== undefined) {
      params.selection = selection.toString();
    }
    const response = await h5Api.get<DataArray1D>('/data', { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching error data for file ${file}:`, error);
    throw error;
  }
};

/**
 * Fetch full file path from the plotting API
 * @param filename - The filename to query
 * @param instrumentName - The instrument name
 * @param experimentNumber - The experiment number
 * @returns Promise with the full file path
 */
export const fetchFilePath = async (
  filename: string,
  instrumentName: string,
  experimentNumber: number
): Promise<string> => {
  try {
    const url = `/find_file/instrument/${instrumentName}/experiment_number/${experimentNumber}`;
    const response = await h5Api.get<string>(url, {
      params: { filename },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching file path for ${filename}:`, error);
    throw error;
  }
};

export default h5Api;
