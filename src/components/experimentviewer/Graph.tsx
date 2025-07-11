import React, { useEffect } from 'react';
import { FileToPlot } from './PlotController';
import { plottingApi } from '../../lib/plotting-api';
import Plot from './Plot';

interface GraphProps {
  filesToBePlotted: FileToPlot[];
}

export interface GraphData {
  data: number[][];
  isHeatmap: boolean;
}

const Graph = (props: GraphProps): React.ReactElement => {
  const [selectedFiles, setSelectedFiles] = React.useState<FileToPlot[]>([]);
  const [data, setData] = React.useState<GraphData>({ data: [], isHeatmap: false });

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
            const data = await fetchHeatmapData(baseName); // number[][]
            return { data, isHeatmap: true };
          } else if (file.plotted && file.slices?.length) {
            const data = await Promise.all(
              file.slices.map((slice) => fetchData(baseName, slice)) // number[]
            );
            return { data, isHeatmap: false }; // data: number[][]
          } else {
            const result = await fetchData(baseName, 0); // number[]
            return { data: [result], isHeatmap: false }; // wrap single slice in array
          }
        })
      );

      console.log(dataArray);

      setData(dataArray[0]);
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
