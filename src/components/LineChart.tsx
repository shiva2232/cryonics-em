// src/shared/LineChart.tsx
import {useRef, useEffect} from "react";
import * as d3 from "d3";

type MetricPoint = { ts: number; [k: string]: number | undefined };
type Props = { data: MetricPoint[]; keys: string[]; height?: number };

export default function LineChart({ data, keys, height=200 }: Props) {
  const refEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!refEl.current) return;
    const container = refEl.current;
    // clear
    container.innerHTML = "";

    const margin = {top: 8, right: 20, bottom: 24, left: 40};
    const w = container.clientWidth || 600;
    const h = height;
    const svg = d3.select(container).append("svg")
      .attr("width", w)
      .attr("height", h);

    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    if (!data || data.length === 0) {
      g.append("text").attr("x", plotW/2).attr("y", plotH/2).attr("text-anchor","middle").text("No data");
      return;
    }

    const parseX = (d: MetricPoint) => new Date(d.ts);
    const x = d3.scaleTime().range([0, plotW]).domain(d3.extent(data, parseX) as [Date, Date]);
    const y = d3.scaleLinear().range([plotH, 0]).domain([0, d3.max(data, d => {
      return d3.max(keys.map(k => (d[k] || 0))) as number;
    }) || 100]);

    // grid + axes
    const xAxis = d3.axisBottom(x).ticks(4).tickFormat(d3.timeFormat("%H:%M") as any);
    const yAxis = d3.axisLeft(y).ticks(4);

    g.append("g").attr("transform", `translate(0,${plotH})`).call(xAxis).attr("class","axis axis-x");
    g.append("g").call(yAxis).attr("class","axis axis-y");

    // color
    const color = d3.scaleOrdinal<string>().domain(keys).range(["#3b82f6","#06b6d4","#f97316"]);

    // lines
    keys.forEach(k => {
      const line = d3.line<MetricPoint>().x(d => x(parseX(d))).y(d => y((d[k] as number) || 0)).curve(d3.curveMonotoneX);
      g.append("path")
        .datum(data)
        .attr("fill","none")
        .attr("stroke", color(k))
        .attr("stroke-width", 2)
        .attr("d", line as any)
        .attr("opacity", 0.95);
    });

    // legend
    const legend = svg.append("g").attr("transform", `translate(${margin.left},8)`);
    keys.forEach((k,i) => {
      const lx = i * 90;
      legend.append("rect").attr("x", lx).attr("width",10).attr("height",10).attr("fill", color(k));
      legend.append("text").attr("x", lx+14).attr("y",10).text(k).attr("font-size","12px").attr("fill","#333");
    });

    // cleanup on unmount
    return () => {
      svg.remove();
    };
  }, [data, keys, height]);

  return <div ref={refEl} style={{width:"100%", height}} />;
}
