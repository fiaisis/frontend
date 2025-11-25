/**
 * H5Grove-style API client for HDF5 file exploration
 * Provides automatic discovery of datasets and their structure
 */

import h5Api from './h5Api';
import { type Attribute, type DType, type Entity, isDataset, isNumericType } from '@h5web/app';

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

/**
 * Fetch metadata for an entity in the HDF5 file
 * @param file - Full path to the HDF5 file
 * @param path - Path within the HDF5 file (default: '/')
 */
export async function fetchEntityMetadata(file: string, path: string = '/'): Promise<Entity> {
  try {
    const response = await h5Api.get<Entity>('/h5grove/meta', {
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
    const response = await h5Api.get<string[]>('/h5grove/paths', {
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
    const response = await h5Api.get<Record<string, unknown>>('/h5grove/attr', {
      params: { file, path },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching attributes for ${file}:${path}:`, error);
    return {};
  }
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

    // Explore each path
    for (const path of allPaths) {
      try {
        const metadata = await fetchEntityMetadata(fullPath, path);
        console.log('[H5Grove] Fetching metadata for:', path);
        console.log('[H5Grove] Fetched metadata was:', metadata);
        if (isDataset(metadata)) {
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

          if (dtype && isNumericType(dtype) && shape.length > 0) {
            const attributes = metadata.attributes;
            console.log('[H5Grove] Discovered numeric dataset:', { path, shape, dtype });
            datasets.push({
              path: path,
              shape,
              dtype,
              attributes,
              isNumeric: true,
              is1D: shape.length === 1,
              is2D: shape.length === 2,
            });
          } else {
            console.log('[H5Grove] Skipping non-numeric dataset:', { path, shape, dtype });
          }
        }
      } catch (error) {
        // Skip inaccessible paths
        continue;
      }
    }

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
            const sameParent =
              dataPathParts.slice(0, -1).join('/') === errorPathParts.slice(0, -1).join('/');
            if (sameParent) {
              dataDs.errorPath = errorDs.path;
              break; // Found a match, move to next data dataset
            }
          }
        }
      }
    }

    // Mark datasets with 'signal' attribute as primary
    datasets.forEach((ds) => {
      ds.isPrimary = ds.attributes?.some((attr) => attr.name === 'signal') || false;
    });

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
