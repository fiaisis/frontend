import { EChartsOption, SeriesOption } from 'echarts';
import React, { useEffect } from 'react';
import { GraphData } from './Graph';
import ReactECharts from 'echarts-for-react';

interface PlotProps {
  graphData: GraphData;
  axesLabels?: { axes: string };
  xAxisMin?: number;
  xAxisMax?: number;
  yAxisMin?: number;
  yAxisMax?: number;
  visualMapMin?: number;
  visualMapMax?: number;
  fileTitle?: string;
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

    // Parse axis names from props.axesLabels?.axes e.g., "X:Y"
    const axesStr = props.axesLabels?.axes || '';
    const [xNameRaw, yNameRaw] = axesStr.split(':');
    const xName = xNameRaw?.trim() || undefined;
    const yName = yNameRaw?.trim() || undefined;

    return {
      grid: {
        left: '6%',
        right: '2%',
        top: '6%',
        bottom: '8%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        name: xName,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: {
          fontSize: 15,
          fontWeight: 'bold',
          color: '#86b4ff',
        },
        min: typeof props.xAxisMin === 'number' ? props.xAxisMin : undefined,
        max: typeof props.xAxisMax === 'number' ? props.xAxisMax : undefined,
        axisLabel: {
          formatter: (value: number) => {
            const num = Number(value);
            return isNaN(num) ? String(value) : num.toFixed(1);
          },
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { show: false },
        name: yName,
        nameLocation: 'middle',
        nameGap: 36,
        nameTextStyle: {
          fontSize: 15,
          fontWeight: 'bold',
          color: '#86b4ff',
        },
        min: typeof props.yAxisMin === 'number' ? props.yAxisMin : -0.05,
        max: typeof props.yAxisMax === 'number' ? props.yAxisMax : undefined,
        axisLabel: {
          formatter: (value: number) => {
            const num = Number(value);
            return isNaN(num) ? String(value) : num.toFixed(1);
          },
        },
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
          restore: {},
          saveAsImage: {},
        },
      },

      series: seriesUnpacked,
    };
  };

  const computeOptions2DOptions = (data: number[][]): EChartsOption => {
    const axesStr = props.axesLabels?.axes || '';
    const [xNameRaw, yNameRaw] = axesStr.split(':');
    const xName = xNameRaw?.trim() || undefined;
    const yName = yNameRaw?.trim() || undefined;

    const vMin = typeof props.visualMapMin === 'number' ? props.visualMapMin : 0;
    const vMax = typeof props.visualMapMax === 'number' ? props.visualMapMax : 2;

    const truncate = (s?: string, max = 40): string | undefined => {
      if (!s) return undefined;
      return s.length > max ? s.slice(0, max) + '…' : s;
    };

    const titleText = truncate(props.fileTitle);

    return {
      animation: false,
      title: titleText
        ? {
            text: titleText,
            left: 'center',
            top: 6,
            textStyle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
          }
        : undefined,
      grid: { top: titleText ? 48 : 16, bottom: 24, left: 50, right: 24, containLabel: true },
      xAxis: {
        type: 'category',
        name: xName,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { fontSize: 15, fontWeight: 'bold', color: '#86b4ff' },
        axisLabel: {
          formatter: (value: string | number) => {
            const num = Number(value);
            return isNaN(num) ? String(value) : num.toFixed(1);
          },
        },
      },
      yAxis: {
        type: 'category',
        name: yName,
        nameLocation: 'middle',
        nameGap: 36,
        nameTextStyle: { fontSize: 15, fontWeight: 'bold', color: '#86b4ff' },
        axisLabel: {
          formatter: (value: string | number) => {
            const num = Number(value);
            return isNaN(num) ? String(value) : num.toFixed(1);
          },
        },
      },
      visualMap: {
        min: vMin,
        max: vMax,
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
