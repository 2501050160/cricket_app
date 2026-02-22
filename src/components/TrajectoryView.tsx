import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TrajectoryPoint, PITCH_LENGTH, STUMP_HEIGHT, STUMP_WIDTH } from '../services/physics';

interface TrajectoryViewProps {
  points: TrajectoryPoint[];
  predictions: TrajectoryPoint[];
  impactPoint?: { x: number; y: number; z: number };
}

export const TrajectoryView: React.FC<TrajectoryViewProps> = ({ points, predictions, impactPoint }) => {
  const sideViewRef = useRef<SVGSVGElement>(null);
  const topViewRef = useRef<SVGSVGElement>(null);
  const frontViewRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!sideViewRef.current || !topViewRef.current || !frontViewRef.current) return;

    const margin = { top: 30, right: 60, bottom: 50, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    // --- Side View (Z vs Y) ---
    const sideSvg = d3.select(sideViewRef.current);
    sideSvg.selectAll("*").remove();
    const sideG = sideSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScaleSide = d3.scaleLinear().domain([-2, PITCH_LENGTH + 5]).range([0, width]);
    const yScaleSide = d3.scaleLinear().domain([0, 3.5]).range([height, 0]);

    // Ground line
    sideG.append("line")
      .attr("x1", xScaleSide(-2)).attr("y1", height).attr("x2", xScaleSide(PITCH_LENGTH + 4)).attr("y2", height)
      .attr("stroke", "#444").attr("stroke-width", 2);

    // Stumps
    sideG.append("rect")
      .attr("x", xScaleSide(PITCH_LENGTH))
      .attr("y", yScaleSide(STUMP_HEIGHT))
      .attr("width", 6)
      .attr("height", height - yScaleSide(STUMP_HEIGHT))
      .attr("fill", "#ef4444");

    const lineSide = d3.line<TrajectoryPoint>()
      .x(d => xScaleSide(d.z))
      .y(d => yScaleSide(d.y));

    sideG.append("path").datum(points).attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", 3).attr("d", lineSide);
    sideG.append("path").datum(predictions).attr("fill", "none").attr("stroke", "#3b82f6").attr("stroke-width", 2).attr("stroke-dasharray", "4,4").attr("d", lineSide);

    // --- Top View (Z vs X) ---
    const topSvg = d3.select(topViewRef.current);
    topSvg.selectAll("*").remove();
    const topG = topSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const yScaleTop = d3.scaleLinear().domain([-2, 2]).range([height, 0]);

    // Pitch boundaries
    topG.append("rect")
      .attr("x", xScaleSide(0)).attr("y", yScaleTop(1.524)).attr("width", xScaleSide(PITCH_LENGTH) - xScaleSide(0)).attr("height", yScaleTop(-1.524) - yScaleTop(1.524))
      .attr("fill", "#fef3c7").attr("opacity", 0.2);

    const lineTop = d3.line<TrajectoryPoint>()
      .x(d => xScaleSide(d.z))
      .y(d => yScaleTop(d.x));

    topG.append("path").datum(points).attr("fill", "none").attr("stroke", "#10b981").attr("stroke-width", 3).attr("d", lineTop);
    topG.append("path").datum(predictions).attr("fill", "none").attr("stroke", "#10b981").attr("stroke-width", 2).attr("stroke-dasharray", "4,4").attr("d", lineTop);

    // --- Front View (X vs Y) ---
    const frontSvg = d3.select(frontViewRef.current);
    frontSvg.selectAll("*").remove();
    const frontG = frontSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const xScaleFront = d3.scaleLinear().domain([-1.5, 1.5]).range([0, width]);
    const yScaleFront = d3.scaleLinear().domain([0, 2.5]).range([height, 0]);

    // Stumps (Front)
    frontG.append("rect")
      .attr("x", xScaleFront(-STUMP_WIDTH/2))
      .attr("y", yScaleFront(STUMP_HEIGHT))
      .attr("width", xScaleFront(STUMP_WIDTH/2) - xScaleFront(-STUMP_WIDTH/2))
      .attr("height", height - yScaleFront(STUMP_HEIGHT))
      .attr("fill", "#ef4444")
      .attr("opacity", 0.5);

    if (impactPoint) {
      frontG.append("circle")
        .attr("cx", xScaleFront(impactPoint.x))
        .attr("cy", yScaleFront(impactPoint.y))
        .attr("r", 8)
        .attr("fill", "#f59e0b")
        .attr("stroke", "white")
        .attr("stroke-width", 2);
    }

  }, [points, predictions, impactPoint]);

  return (
    <div className="flex flex-col gap-12 p-8 bg-zinc-900/50 rounded-3xl border border-white/5">
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-black uppercase tracking-tighter italic">Elevation Profile</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Side View Analysis</span>
        </div>
        <div className="bg-black/60 p-8 rounded-2xl border border-white/5 flex justify-center">
          <svg ref={sideViewRef} width="1000" height="350" className="w-full h-auto max-w-5xl" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
          <h3 className="text-lg font-black uppercase tracking-tighter italic">Pitch Map</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Top-Down Trajectory</span>
        </div>
        <div className="bg-black/60 p-8 rounded-2xl border border-white/5 flex justify-center">
          <svg ref={topViewRef} width="1000" height="350" className="w-full h-auto max-w-5xl" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
          <h3 className="text-lg font-black uppercase tracking-tighter italic">Impact Analysis</h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Front-On Stump View</span>
        </div>
        <div className="bg-black/60 p-8 rounded-2xl border border-white/5 flex justify-center">
          <svg ref={frontViewRef} width="1000" height="350" className="w-full h-auto max-w-5xl" />
        </div>
      </div>
    </div>
  );
};
