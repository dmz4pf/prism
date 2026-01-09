'use client';

import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { cn } from '@/lib/utils';
import type { CashflowData, SankeyNode as NodeType, SankeyLink as LinkType } from '@/types';

interface CashflowSankeyProps {
  data: CashflowData;
  height?: number;
  className?: string;
}

// Extended node type for D3 sankey
interface ExtendedNode extends NodeType {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  sourceLinks?: ExtendedLink[];
  targetLinks?: ExtendedLink[];
}

// Extended link type for D3 sankey
interface ExtendedLink {
  source: ExtendedNode | number;
  target: ExtendedNode | number;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

export function CashflowSankey({ data, height = 400, className }: CashflowSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, links } = useMemo(() => {
    if (!data.nodes.length || !data.links.length) {
      return { nodes: [] as ExtendedNode[], links: [] as ExtendedLink[] };
    }

    // Create node map for link resolution
    const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));

    // Transform links to use indices
    const indexedLinks: ExtendedLink[] = data.links.map((link) => ({
      source: nodeMap.get(link.source) ?? 0,
      target: nodeMap.get(link.target) ?? 0,
      value: link.value,
    }));

    return {
      nodes: data.nodes.map((n) => ({ ...n })) as ExtendedNode[],
      links: indexedLinks,
    };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create sankey generator with explicit typing
    const sankeyGenerator = sankey<ExtendedNode, ExtendedLink>()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([
        [margin.left, margin.top],
        [innerWidth, innerHeight],
      ]);

    // Generate layout
    const sankeyData = sankeyGenerator({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    const layoutNodes = sankeyData.nodes;
    const layoutLinks = sankeyData.links;

    // Draw links with gradient
    const defs = svg.append('defs');

    layoutLinks.forEach((link, i) => {
      const sourceNode = link.source as ExtendedNode;
      const targetNode = link.target as ExtendedNode;

      const gradient = defs
        .append('linearGradient')
        .attr('id', `gradient-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', sourceNode.x1 ?? 0)
        .attr('x2', targetNode.x0 ?? 0);

      gradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', sourceNode.color)
        .attr('stop-opacity', 0.8);

      gradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', targetNode.color)
        .attr('stop-opacity', 0.8);
    });

    // Draw link paths
    svg
      .append('g')
      .selectAll('path')
      .data(layoutLinks)
      .join('path')
      .attr('d', sankeyLinkHorizontal<ExtendedNode, ExtendedLink>())
      .attr('fill', 'none')
      .attr('stroke', (_: ExtendedLink, i: number) => `url(#gradient-${i})`)
      .attr('stroke-width', (d: ExtendedLink) => Math.max(1, d.width ?? 0))
      .attr('opacity', 0.6)
      .attr('class', 'transition-opacity hover:opacity-100');

    // Draw nodes
    const nodeGroup = svg
      .append('g')
      .selectAll('g')
      .data(layoutNodes)
      .join('g');

    // Node rectangles
    nodeGroup
      .append('rect')
      .attr('x', (d: ExtendedNode) => d.x0 ?? 0)
      .attr('y', (d: ExtendedNode) => d.y0 ?? 0)
      .attr('width', (d: ExtendedNode) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', (d: ExtendedNode) => (d.y1 ?? 0) - (d.y0 ?? 0))
      .attr('fill', (d: ExtendedNode) => d.color)
      .attr('rx', 4)
      .attr('class', 'transition-all hover:brightness-110');

    // Node labels
    nodeGroup
      .append('text')
      .attr('x', (d: ExtendedNode) => {
        return d.type === 'source' ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6;
      })
      .attr('y', (d: ExtendedNode) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: ExtendedNode) => (d.type === 'source' ? 'start' : 'end'))
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text((d: ExtendedNode) => d.label);

    // Value labels
    nodeGroup
      .append('text')
      .attr('x', (d: ExtendedNode) => {
        return d.type === 'source' ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6;
      })
      .attr('y', (d: ExtendedNode) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2 + 14)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: ExtendedNode) => (d.type === 'source' ? 'start' : 'end'))
      .attr('fill', '#9CA3AF')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text((d: ExtendedNode) => `$${(d.value ?? 0).toLocaleString()}`);
  }, [nodes, links, height]);

  if (!data.nodes.length) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-background-card p-8 flex items-center justify-center',
          className
        )}
        style={{ height }}
      >
        <p className="text-secondary-400">No cashflow data to display</p>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn('rounded-xl border border-border bg-background-card overflow-hidden', className)}
    >
      <div className="p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-white">Cashflow Overview</h3>
        <p className="text-sm text-secondary-400">Visual representation of your DeFi positions</p>
      </div>
      <svg ref={svgRef} width="100%" height={height} className="overflow-visible" />
    </motion.div>
  );
}
