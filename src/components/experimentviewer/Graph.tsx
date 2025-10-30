import React, { useEffect } from 'react';
import { FileToPlot } from './PlotController';
import { plottingApi } from '../../lib/plotting-api';
import Plot from './Plot';

interface GraphProps {
  filesToBePlotted: FileToPlot[];
  instrument: string;
  experimentNumber: string;
}

export type GraphData =
  | {
      isHeatmap: false;
      data: number[][][];
      errors: number[][][];
    }
  | {
      isHeatmap: true;
      data: number[][];
    };

export const Graph = (props: GraphProps): React.ReactElement => {
  const [data, setData] = React.useState<GraphData>({ data: [], errors: [], isHeatmap: false });

  const fetchHeatmapData = async (filename: string): Promise<number[][]> => {
    return await plottingApi
      .get(`processed_data/${props.instrument}/${props.experimentNumber}`, {
        params: {
          filename: filename,
        },
      })
      .then((res) => res.data);
  };

  const fetchData = async (filename: string, slice: number): Promise<number[][]> => {
    return await plottingApi
      .get(`echarts_data/${props.instrument}/${props.experimentNumber}`, {
        params: {
          filename: filename,
          selection: slice,
        },
      })
      .then((res) => res.data);
  };

  const fetchErrorData = async (filename: string, slice: number): Promise<number[][]> => {
    return await plottingApi
      .get(`echarts_data/${props.instrument}/${props.experimentNumber}`, {
        params: {
          filename: filename,
          selection: slice,
        },
      })
      .then((res) => res.data);
  };

  useEffect(() => {
    (async () => {
      if (props.filesToBePlotted.find((file) => file.plotAsHeatmap)) {
        // Heatmap case
        const heatmapData = await fetchHeatmapData(props.filesToBePlotted[0].fileName);
        setData({ isHeatmap: true, data: heatmapData });
        return;
      }

      // Normal graph case
      const dataPromises: Promise<number[][]>[] = [];
      const errorPromises: Promise<number[][]>[] = [];

      props.filesToBePlotted.forEach((file) => {
        const slices = file.slices && file.slices.length > 0 ? file.slices : [0];
        slices.forEach((slice) => {
          dataPromises.push(fetchData(file.fileName, slice));
          errorPromises.push(fetchErrorData(file.fileName, slice));
        });
      });

      const [dataArray, errorsArray] = await Promise.all([Promise.all(dataPromises), Promise.all(errorPromises)]);

      setData({ isHeatmap: false, data: dataArray, errors: errorsArray });
    })();
  }, [props.filesToBePlotted]);

  const axisSource = props.filesToBePlotted.length > 0 ? props.filesToBePlotted[0] : undefined;
  const axesLabels = axisSource?.meta?.axes_labels;
  const xAxisMin = axisSource?.meta?.x_axis_min;
  const xAxisMax = axisSource?.meta?.x_axis_max;
  const yAxisMin = axisSource?.meta?.y_axis_min;
  const yAxisMax = axisSource?.meta?.y_axis_max;
  const visualMapMin = axisSource?.visualMapMin;
  const visualMapMax = axisSource?.visualMapMax;

  return (
    <>
      {data ? (
        <Plot
          graphData={data}
          axesLabels={axesLabels}
          xAxisMin={xAxisMin}
          xAxisMax={xAxisMax}
          yAxisMin={yAxisMin}
          yAxisMax={yAxisMax}
          visualMapMin={visualMapMin}
          visualMapMax={visualMapMax}
        />
      ) : (
        <></>
      )}
    </>
  );
};
