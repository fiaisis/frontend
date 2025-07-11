import { EChartsOption, SeriesOption } from 'echarts';
import React, { useEffect } from 'react';
import { GraphData } from './Graph';
import ReactECharts from 'echarts-for-react';

interface PlotProps {
  graphData: GraphData;
}

const Plot = (props: PlotProps): React.ReactElement | null => {
  const [options, setOptions] = React.useState<EChartsOption>();

  const computeOptions1DOptions = (data: number[][], errors?: number[][]): EChartsOption => {
    const legendNames = data.map((_, index) => index.toString());

    const seriesUnpacked: SeriesOption[] = [];

    data.forEach((item, index) => {
      // Line series
      seriesUnpacked.push({
        name: legendNames[index],
        type: 'line',
        data: item,
        color: '#00c0ff',
      });

      // Optional error bar series
      if (errors && errors[index]) {
        const errorData = item.map((y, i) => {
          const err = errors[index][i] ?? 0;
          return [i, y - err, y + err]; // [x, yLow, yHigh]
        });

        seriesUnpacked.push({
          name: `${legendNames[index]} error`,
          type: 'custom',
          renderItem: (params, api) => {
            const x = api.value(0);
            const low = api.value(1);
            const high = api.value(2);

            const coordLow = api.coord([x, low]);
            const coordHigh = api.coord([x, high]);
            const barWidth = 6;

            return {
              type: 'group',
              children: [
                {
                  type: 'line',
                  shape: {
                    x1: coordLow[0],
                    y1: coordLow[1],
                    x2: coordHigh[0],
                    y2: coordHigh[1],
                  },
                  style: {
                    stroke: '#00c0ff',
                    width: 1,
                  },
                },
                {
                  type: 'line',
                  shape: {
                    x1: coordLow[0] - barWidth / 2,
                    y1: coordLow[1],
                    x2: coordLow[0] + barWidth / 2,
                    y2: coordLow[1],
                  },
                  style: {
                    stroke: '#0085ff',
                    width: 1,
                  },
                },
                {
                  type: 'line',
                  shape: {
                    x1: coordHigh[0] - barWidth / 2,
                    y1: coordHigh[1],
                    x2: coordHigh[0] + barWidth / 2,
                    y2: coordHigh[1],
                  },
                  style: {
                    stroke: '#0085ff',
                    width: 1,
                  },
                },
              ],
            };
          },
          encode: {
            x: 0,
            y: [1, 2],
          },
          data: errorData,
          silent: true,
        });
      }
    });

    return {
      grid: {
        show: false,
      },
      legend: {
        data: legendNames,
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
          },
        },
      },
      dataZoom: [
        {
          type: 'inside',
        },
      ],
      xAxis: {
        type: 'category',
        axisLine: {
          show: true,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        scale: false,
        max: function (value) {
          // Cap maximum but allow 10% padding
          return Math.max(3, value.max * 1.1);
        },
        axisLine: {
          show: true,
        },
        splitLine: {
          show: false,
        },
        min: -0.1,
      },
      tooltip: {
        trigger: 'axis',
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
        max: 1,
        calculable: true,
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

  // return <>test</>;
  return <ReactECharts style={{ height: '85vh', width: '100%' }} option={options} notMerge={true} />;
};

export default Plot;
