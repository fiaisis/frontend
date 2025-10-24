import { EChartsOption, SeriesOption } from 'echarts';
import React, { useEffect } from 'react';
import { GraphData } from './Graph';
import ReactECharts from 'echarts-for-react';

interface PlotProps {
  graphData: GraphData;
}

const Plot = (props: PlotProps): React.ReactElement | null => {
  const [options, setOptions] = React.useState<EChartsOption>();

  const computeOptions1DOptions = (data: number[][][], errors?: number[][][]): EChartsOption => {
    const seriesUnpacked: SeriesOption[] = [];
    data.forEach((data, index) => {
      seriesUnpacked.push({
        name: index,
        data: data,
        type: 'line',
        showSymbol: false,
        emphasis: { disabled: false },
      });
    });
    return {
      grid: {
        left: '2%',
        right: '2%',
        top: '2%',
        bottom: '2%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { show: false },
        min: -0.05,
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          filterMode: 'none',
        },
        {
          type: 'inside',
          yAxisIndex: [0],
          filterMode: 'none',
        },
      ],
      toolbox: {
        show: true,
        feature: {
          dataZoom: {
            filterMode: 'none',
          },
        },
      },

      series: seriesUnpacked,
    };
  };

  const computeOptions2DOptions = (data: number[][]): EChartsOption => {
    return {
      animation: false,
      xAxis: {
        type: 'category',
      },
      yAxis: {
        type: 'category',
      },
      visualMap: {
        min: 0,
        max: 2,
        calculable: true,
        inRange: {
          color: [
            '#440154',
            '#482475',
            '#414487',
            '#355f8d',
            '#2a788e',
            '#21918c',
            '#22a884',
            '#44bf70',
            '#7ad151',
            '#bddf26',
            '#fde725',
          ],
        },
      },
      series: [
        {
          type: 'heatmap',
          data: data,
        },
      ],
      tooltip: {
        trigger: 'item',
      },
    };
  };

  useEffect(() => {
    if (props.graphData.isHeatmap) {
      setOptions(computeOptions2DOptions(props.graphData.data));
    } else {
      setOptions(computeOptions1DOptions(props.graphData.data, props.graphData.errors));
    }
  }, [props]);

  if (!options) return null;

  return <ReactECharts style={{ height: '85vh', width: '100%' }} option={options} notMerge={true} />;
};

export default Plot;
