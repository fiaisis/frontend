import React, { useEffect } from 'react';
import { FileToPlot } from './PlotController';
import { plottingApi } from '../../lib/plotting-api';
import Plot from './Plot';

interface GraphProps {
  filesToBePlotted: FileToPlot[];
}

export interface GraphData {
  data: number[][];
  errors: number[][];
  isHeatmap: boolean;
}

const Graph = (props: GraphProps): React.ReactElement => {
  const [selectedFiles, setSelectedFiles] = React.useState<FileToPlot[]>([]);
  const [data, setData] = React.useState<GraphData>({ data: [], errors: [], isHeatmap: false });

  const fetchHeatmapData = async (filename: string): Promise<number[][]> => {
    return await plottingApi
      .get('processed_data', {
        params: {
          filename: filename,
          path: '/mantid_workspace_1/workspace/values',
        },
      })
      .then((res) => res.data);
  };

  const fetchData = async (filename: string, slice: number): Promise<number[]> => {
    return await plottingApi
      .get('data', {
        params: {
          file: filename,
          path: '/mantid_workspace_1/workspace/values',
          selection: slice,
        },
      })
      .then((res) => res.data);
  };

  const fetchErrorData = async (filename: string, slice: number): Promise<number[]> => {
    return await plottingApi
      .get('data', {
        params: {
          file: filename,
          path: '/mantid_workspace_1/workspace/errors',
          selection: slice,
        },
      })
      .then((res) => res.data);
  };

  useEffect(() => {
    if (props.filesToBePlotted.find((file) => file.heatmap)) {
      setSelectedFiles([props.filesToBePlotted.filter((file) => file.heatmap)[0]]);
      return;
    }
    if (props.filesToBePlotted.length > 0) {
      const tempArray: FileToPlot[] = [];
      props.filesToBePlotted.forEach((file) => {
        if (file.plotted) {
          tempArray.push(file);
        }
      });
      setSelectedFiles(tempArray);
    }
  }, [props.filesToBePlotted]);

  useEffect(() => {
    (async () => {
      const dataArray = await Promise.all(
        selectedFiles.map(async (file) => {
          const baseName = file.fileName.slice(0, -1);

          if (file.plotted && file.heatmap) {
            const data = await fetchHeatmapData(baseName);
            return { data, errors: [], isHeatmap: true };
          } else if (file.plotted && file.slices?.length) {
            const data: number[][] = [];
            const errors: number[][] = [];

            for (const slice of file.slices) {
              const [sliceData, sliceErrors] = await Promise.all([
                fetchData(baseName, slice),
                fetchErrorData(baseName, slice),
              ]);
              data.push(sliceData);
              errors.push(sliceErrors);
            }

            return { data, errors, isHeatmap: false };
          } else {
            const [result, error] = await Promise.all([fetchData(baseName, 0), fetchErrorData(baseName, 0)]);
            return { data: [result], errors: [error], isHeatmap: false };
          }
        })
      );
      console.log(dataArray);

      const mergedData = dataArray.reduce(
        (acc, curr) => {
          acc.data.push(...curr.data);
          if (curr.errors) {
            acc.errors.push(...curr.errors);
          }
          acc.isHeatmap ||= curr.isHeatmap;
          return acc;
        },
        {
          data: [] as number[][],
          errors: [] as number[][], // start as empty
          isHeatmap: false,
        }
      );

      setData(mergedData);
    })();
  }, [selectedFiles]);

  return (
    <>
      {selectedFiles.map((file, index) => (
        <div key={index}>{`${file.fileName} ${file.plotted} ${file.heatmap} ${file.slices}`}</div>
      ))}
      {data ? <Plot graphData={data}></Plot> : <></>}
    </>
  );
};

export default Graph;
