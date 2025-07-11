import { EChartsOption, SeriesOption } from 'echarts';
import React, { useEffect } from 'react';
import ReactECharts from 'echarts-for-react';

interface PlotProps {
  data: number[][];
  heatmap: boolean;
}

const Plot = (props: PlotProps): React.ReactElement | null => {
  const [options, setOptions] = React.useState<EChartsOption>();

  const computeOptions1DOptions = (data: number[][]): EChartsOption => {
    const legendNames = data.map((item, index) => index.toString());
    const seriesUnpacked: SeriesOption[] = data.map((item, index) => ({
      name: index.toString(),
      type: 'line',
      data: item,
    }));
    return {
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
      },
      yAxis: {
        type: 'value',
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
    if (props.heatmap) {
      setOptions(computeOptions2DOptions(props.data));
    } else {
      setOptions(computeOptions1DOptions(props.data));
    }
  }, [props]);

  if (!options) return null;

  return <ReactECharts style={{ height: '85vh', width: '100%' }} option={options} notMerge={true} />;
};

export default Plot;
