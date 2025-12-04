import { h5Api } from './api';
import { Attribute, DType, Entity, isDataset, isNumericType } from '@h5web/app';

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
    const response = await h5Api.get<DataArray1D>('/data/', { params });
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
    const response = await h5Api.get<DataArray1D>('/data/', { params });
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

// API response types for H5 data
export type DataArray1D = number[];

/**
 * Discovered dataset with error path if available
 */
export interface DiscoveredDataset {
  path: string;
  shape: number[];
  dtype: DType;
  attributes?: Attribute[];
  errorPath?: string;
  isNumeric: boolean;
  is1D: boolean;
  is2D: boolean;
  isPrimary?: boolean; // Whether this dataset has a 'signal' attribute (primary data)
}

/**
 * File structure with discovered datasets
 */
export interface FileStructure {
  filename: string;
  fullPath: string;
  datasets: DiscoveredDataset[];
  dataDataset?: DiscoveredDataset; // Primary data dataset
  errorDataset?: DiscoveredDataset; // Error dataset if found
}

// API request parameters for H5 data fetching
interface DataRequestParams {
  file: string;
  path: string;
  selection?: string; // Single selection index as string
}

/**
 * Fetch metadata for an entity in the HDF5 file
 * @param file - Full path to the HDF5 file
 * @param path - Path within the HDF5 file (default: '/')
 */
export async function fetchEntityMetadata(file: string, path: string = '/'): Promise<Entity> {
  try {
    const response = await h5Api.get<Entity>('/meta/', {
      params: { file, path },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching metadata for ${file}:${path}:`, error);
    throw error;
  }
}

/**
 * Fetch all searchable paths in the HDF5 file
 * @param file - Full path to the HDF5 file
 */
export async function fetchSearchablePaths(file: string): Promise<string[]> {
  try {
    const response = await h5Api.get<string[]>('/paths/', {
      params: { file },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching paths for ${file}:`, error);
    throw error;
  }
}

/**
 * Fetch attributes for an entity
 * @param file - Full path to the HDF5 file
 * @param path - Path within the HDF5 file
 */
export async function fetchAttributes(file: string, path: string): Promise<Record<string, unknown>> {
  try {
    const response = await h5Api.get<Record<string, unknown>>('/attr/', {
      params: { file, path },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching attributes for ${file}:${path}:`, error);
    return {};
  }
}

/**
 * Process an array of items in parallel batches
 * @param items - Array of items to process
 * @param batchSize - Number of items to process in parallel
 * @param processor - Async function to process each item
 * @returns Array of successful results (failures are filtered out)
 */
async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(batch.map((item) => processor(item)));

    // Collect successful results, skip failures
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });
  }

  return results;
}

/**
 * Discover the structure of an HDF5 file
 * @param filename - Original filename
 * @param fullPath - Full path to the HDF5 file
 */
export async function discoverFileStructure(filename: string, fullPath: string): Promise<FileStructure> {
  try {
    // Get all searchable paths
    const allPaths = await fetchSearchablePaths(fullPath);

    // Collect all numeric datasets
    const datasets: DiscoveredDataset[] = [];

    // Process paths in parallel batches (OPTIMIZED for performance)
    const BATCH_SIZE = 15; // Fetch 15 metadata items in parallel

    const discoveredDatasets = await processBatches(
      allPaths,
      BATCH_SIZE,
      async (path: string): Promise<DiscoveredDataset | null> => {
        // Validation
        if (!path.toLowerCase().startsWith('/')) {
          throw new Error(`Invalid path: ${path}`);
        }

        // Fetch metadata for this path
        const metadata = await fetchEntityMetadata(fullPath, path);
        console.log('[H5Grove] Fetching metadata for:', path);
        console.log('[H5Grove] Fetched metadata was:', metadata);

        // Only process datasets
        if (!isDataset(metadata)) {
          return null; // Not a dataset, skip
        }

        console.log('[H5Grove] Dataset metadata:', metadata);
        const shape = metadata.shape || [];
        let dtype = metadata.type;

        // Convert numeric class codes to string class names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (dtype && typeof dtype === 'object' && typeof (dtype as any).class === 'number') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const numericClass = (dtype as any).class;
          let stringClass: string;

          // HDF5 class codes: 0=Integer, 1=Float, 2=Time, 3=String, etc.
          // https://github.com/silx-kit/h5web/blob/main/packages/shared/src/h5t.ts
          switch (numericClass) {
            case 0:
              stringClass = 'Integer';
              break;
            case 1:
              stringClass = 'Float';
              break;
            case 2:
              stringClass = 'Time';
              break;
            case 3:
              stringClass = 'String';
              break;
            case 4:
              stringClass = 'Bitfield';
              break;
            case 5:
              stringClass = 'Opaque';
              break;
            case 6:
              stringClass = 'Compound';
              break;
            case 7:
              stringClass = 'Reference';
              break;
            case 8:
              stringClass = 'Enumeration';
              break;
            case 9:
              stringClass = 'Array (variable length)';
              break;
            case 10:
              stringClass = 'Array';
              break;
            default:
              console.warn(`[H5Grove] Unknown class code: ${numericClass}`);
              stringClass = 'Unknown';
          }

          dtype = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...(dtype as any),
            class: stringClass,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as DType;

          console.log('[H5Grove] Converted dtype class:', { from: numericClass, to: stringClass });
        }

        // Only keep numeric datasets with shape
        if (dtype && isNumericType(dtype) && shape.length > 0) {
          const attributes = metadata.attributes;
          console.log('[H5Grove] Discovered numeric dataset:', { path, shape, dtype });

          return {
            path: path,
            shape,
            dtype,
            attributes,
            isNumeric: true,
            is1D: shape.length === 1,
            is2D: shape.length === 2,
            isPrimary: attributes?.some((attr) => attr.name === 'signal') || false,
          };
        }

        console.log('[H5Grove] Skipping non-numeric dataset:', { path, shape, dtype });
        return null; // Not numeric, skip
      }
    );

    // Filter out null results and add to datasets array
    datasets.push(...discoveredDatasets.filter((ds): ds is DiscoveredDataset => ds !== null));

    console.log('[H5Grove] Discovered datasets:', datasets);

    // Separate data and error datasets
    const dataDatasets = datasets.filter(
      (ds) => !ds.path.toLowerCase().includes('error') && !ds.path.toLowerCase().includes('err')
    );

    const errorDatasets = datasets.filter(
      (ds) => ds.path.toLowerCase().includes('error') || ds.path.toLowerCase().includes('err')
    );

    // Link error datasets to data datasets with matching shapes
    for (const dataDs of dataDatasets) {
      // Try to find a matching error dataset
      for (const errorDs of errorDatasets) {
        // Check if shapes match
        const shapesMatch =
          dataDs.shape.length === errorDs.shape.length && dataDs.shape.every((dim, i) => dim === errorDs.shape[i]);

        if (shapesMatch) {
          // Check if error path corresponds to data path (e.g., /data/data -> /data/error)
          const dataPathParts = dataDs.path.split('/');
          const errorPathParts = errorDs.path.split('/');

          // If they're in the same parent directory or have similar structure, link them
          if (dataPathParts.length === errorPathParts.length) {
            const sameParent = dataPathParts.slice(0, -1).join('/') === errorPathParts.slice(0, -1).join('/');
            if (sameParent) {
              dataDs.errorPath = errorDs.path;
              break; // Found a match, move to next data dataset
            }
          }
        }
      }
    }

    // Identify primary data and error datasets
    // A primary dataset has an attribute with name "signal" at any position
    const dataDataset =
      dataDatasets.find((ds) => ds.attributes?.some((attr) => attr.name === 'signal')) || dataDatasets[0];
    const errorDataset = errorDatasets[0];

    // Log primary datasets for debugging
    const primaryDatasets = datasets.filter((ds) => ds.isPrimary);
    if (primaryDatasets.length > 0) {
      console.log(
        '[H5Grove] Primary datasets:',
        primaryDatasets.map((ds) => ds.path)
      );
    }

    // Log linked error paths for debugging
    const datasetsWithErrors = datasets.filter((ds) => ds.errorPath);
    if (datasetsWithErrors.length > 0) {
      console.log(
        '[H5Grove] Linked error paths:',
        datasetsWithErrors.map((ds) => ({
          data: ds.path,
          error: ds.errorPath,
        }))
      );
    }

    return {
      filename,
      fullPath,
      datasets,
      dataDataset,
      errorDataset,
    };
  } catch (error) {
    console.error(`Error discovering structure for ${filename}:`, error);
    throw error;
  }
}
