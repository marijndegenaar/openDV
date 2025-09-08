<template lang="pug">
.flex.flex-col.md_flex-row
  .diagram.flex.flex-col.h-3x4.md_h-screen.md_w-3x4
    .chart-container.flex-1.min-h-96.border.border-gray-300.rounded-lg.bg-gray-50.overflow-auto(ref="chartContainer")
    .loading.text-center.p-5.text-gray-600.italic(v-if="loading") Loading data...
    .error.text-center.p-5.text-red-600.bg-red-50.border.border-red-200.rounded.mx-2(v-if="error") {{ error }}
    .debug-info.text-center.p-2.text-gray-500.text-sm.mt-2
      p Debug: {{ debugInfo }}
  .info-container.p-2.bg-gray-50.border-l.border-gray-300.h-screen.overflow-y-auto.w-full.md_w-1x4
    .event-info.p-4(v-if="selectedEvent")
      h3.event-title.text-lg.font-bold.mb-3.leading-tight {{ selectedEvent.title }}
      .event-year.text-gray-600.text-sm.mb-4.font-medium Year: {{ selectedEvent.year }}
      .event-description.text-gray-800.text-sm.leading-relaxed.m-0 {{ selectedEvent.description }}
    .no-selection.p-4.text-center.text-gray-600.italic(v-else)
      p Click on an event node to view its description
</template>

<script setup>
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

// ===== COMPOSITION API SETUP =====
const route = useRoute()
const { client } = usePrismic()

// ===== CONFIGURATION & CONSTANTS =====
const CHART_CONFIG = {
  margins: { top: 20, right: 300, bottom: 20, left: 20 },
  minWidth: 300,
  minHeight: 500,
  nodeWidth: 20,
  nodePadding: 24,
  cornerRadius: 8,
  // Node sizing for different types
  themeNodeWidth: 20,       // Theme nodes (left side)
  yearNodeWidth: 40,        // Year nodes (right side) - wider for better visibility
  // Opacity settings for visual hierarchy
  defaultOpacity: 0.5,      // Default opacity for all elements (50%)
  linkOpacityHover: 1,      // Full opacity on hover
  backgroundOpacity: 0.1,   // 10% opacity when backgrounded
  nodeOpacityHighlight: 0.9, // 90% opacity when highlighted
  // Typography settings
  fontSize: { base: 14, min: 18, max: 24, title: { min: 14, max: 22 } },
  tooltipOffset: 15
}

const COLORS = {
  custom: ['#8863EB', '#E163EB', '#636AEB', '#EB63AB', '#B463EB', '#D3B1EB'],
  event: '#2E8B57',
  border: '#000',
  text: { primary: '#333', white: '#fff' },
  tooltip: { 
    bg: 'rgba(0,0,0,0.9)', 
    shadow: '0 4px 8px rgba(0,0,0,0.3)' 
  }
}

// ===== REACTIVE STATE =====
const chartContainer = ref(null)
const loading = ref(true)
const error = ref(null)
const debugInfo = ref('Initializing...')
const currentData = ref(null)
const prismicData = ref(null)
const selectedEvent = ref(null)

// ===== LIFECYCLE & OBSERVERS =====
let resizeObserver = null
onMounted(async () => {
  debugInfo.value = 'Component mounted, starting Prismic data load...'
  await loadPrismicData()
  setupResizeObserver()
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

// ===== DATA LOADING FUNCTIONS =====
/**
 * Loads diagram configuration and CSV data from Prismic CMS
 * Handles the initial data fetching and error states
 */
async function loadPrismicData() {
  try {
    loading.value = true
    error.value = null
    debugInfo.value = 'Loading Prismic data...'
    
    // Fetch the diagram page from Prismic using the UID from the route
    const { data } = await client.getByUID('diagram', route.params.uid)
    
    if (!data) {
      throw new Error('Diagram page not found')
    }
    
    prismicData.value = data
    debugInfo.value = `Prismic data loaded: ${data.title}`
    
    // Load CSV data from the csv_file field in Prismic
    if (data.csv_file?.url) {
      await loadCSVData(data.csv_file.url)
    } else {
      throw new Error('CSV file not found in Prismic data')
    }
    
  } catch (err) {
    console.error('Error loading Prismic data:', err)
    error.value = err.message || 'Failed to load diagram data'
    debugInfo.value = `Prismic failed: ${err.message}`
    loading.value = false
  }
}

/**
 * Loads and processes CSV data from the provided URL
 * Extracts themes and transforms data for Sankey diagram
 */
async function loadCSVData(csvUrl) {
  try {
    debugInfo.value = 'Loading CSV data from Prismic...'
    
    const csvData = await d3.csv(csvUrl)
    debugInfo.value = `CSV loaded: ${csvData.length} rows`
    
    if (!csvData?.length) throw new Error('CSV data was empty')
    
    // Extract all unique themes from the CSV data
    const allThemes = csvData.map(row => row.Theme || row.theme)
    const themes = [...new Set(allThemes.flatMap(themeString => themeString.split(';').map(t => t.trim())))]
    
    debugInfo.value = `Found ${themes.length} unique themes and ${csvData.length} events`
    
    const sankeyData = transformCSVToSankey(csvData, themes)
    debugInfo.value = `CSV processed: ${sankeyData.nodes.length} nodes (${themes.length} themes + ${csvData.length} events) with ${sankeyData.links.length} total connections`
    
    loading.value = false
    currentData.value = sankeyData
    createSankeyDiagram(sankeyData)
    
  } catch (err) {
    console.error('Error loading CSV data:', err)
    error.value = err.message || 'Failed to load CSV data'
    debugInfo.value = `CSV failed: ${err.message}`
    loading.value = false
  }
}

// ===== DATA TRANSFORMATION FUNCTIONS =====
/**
 * Transforms CSV data into Sankey diagram format
 * Creates nodes for themes and events, and links between them
 */
function transformCSVToSankey(csvData, themes) {
  const sortedData = [...csvData].sort((a, b) => {
    const yearDiff = parseInt(a.Year || a.year) - parseInt(b.Year || b.year)
    return yearDiff !== 0 ? yearDiff : (a.Theme || a.theme).localeCompare(b.Theme || b.theme)
  })
  
  const nodes = [
    // Theme nodes (left side of diagram)
    ...themes.map((theme, index) => ({
      id: index,
      name: theme,
      type: 'theme',
      x_position: 0
    })),
    // Event nodes (right side of diagram)
    ...sortedData.map((row, index) => ({
      id: themes.length + index,
      name: `${row.Year || row.year} - ${row.Title || row.title}`,
      type: 'event',
      x_position: 1,
      year: parseInt(row.Year || row.year),
      title: row.Title || row.title,
      description: row.Description || row.description
    }))
  ]
  
  // Create links for each theme-event combination
  const links = []
  sortedData.forEach((row, index) => {
    const eventIndex = themes.length + index
    const eventThemes = (row.Theme || row.theme).split(';').map(t => t.trim())
    
    
    eventThemes.forEach(theme => {
      const themeIndex = themes.indexOf(theme)
      if (themeIndex !== -1) {
        links.push({
          source: themeIndex,
          target: eventIndex,
          value: 2, // Link weight for visual sizing
          description: row.Title || row.title,
          fullDescription: row.Description || row.description,
          year: parseInt(row.Year || row.year),
          theme: theme
        })
      }
    })
  })
  
  return { nodes, links }
}

// ===== RESIZE HANDLING FUNCTIONS =====
/**
 * Sets up a ResizeObserver to redraw the chart when container size changes
 * Ensures the diagram remains responsive to window resizing
 */
function setupResizeObserver() {
  if (!chartContainer.value) return
  
  resizeObserver = new ResizeObserver(() => {
    if (chartContainer.value && !loading.value && currentData.value) {
      createSankeyDiagram(currentData.value)
    }
  })
  resizeObserver.observe(chartContainer.value)
}

// ===== CHART CREATION FUNCTIONS =====
/**
 * Main function to create the Sankey diagram
 * Handles container sizing, SVG creation, and element rendering
 */
function createSankeyDiagram(data) {
  if (!data || !chartContainer.value) {
    console.warn('Cannot create Sankey diagram: missing data or container')
    return
  }
  
  try {
    const containerRect = chartContainer.value.getBoundingClientRect()
    const width = Math.max(containerRect.width - CHART_CONFIG.margins.left - CHART_CONFIG.margins.right, CHART_CONFIG.minWidth)
    const height = Math.max(containerRect.height - CHART_CONFIG.margins.top - CHART_CONFIG.margins.bottom, CHART_CONFIG.minHeight)

    // Clear any existing chart
    d3.select(chartContainer.value).selectAll("*").remove()

    const svg = createSVGContainer(chartContainer.value, width, height, CHART_CONFIG.margins)
    const result = createSankeyLayout(data, width, height)
    const tooltip = createTooltip()

    const { links, nodes, labels } = createChartElements(svg, result, width, tooltip)
    
    createTitle(svg, width)
    addHoverInteractions(links, nodes, labels, width)
  } catch (err) {
    console.error('Error creating Sankey diagram:', err)
    error.value = 'Failed to render diagram'
    debugInfo.value = `Chart creation failed: ${err.message}`
  }
}

function createSVGContainer(container, width, height, margin) {
  return d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
}

function createSankeyLayout(data, width, height) {
  return sankey()
    .nodeWidth(CHART_CONFIG.nodeWidth)
    .nodePadding(CHART_CONFIG.nodePadding)
    .nodeSort((a, b) => {
      if (a.x_position !== b.x_position) return a.x_position - b.x_position
      if (a.x_position === 1) return a.year - b.year
      return 0
    })
    .extent([[0, 0], [width, height]])(data)
}

function createTooltip() {
  return d3.select("body").append("div")
    .attr("class", "sankey-tooltip")
    .style("position", "fixed")
    .style("visibility", "hidden")
    .style("background", COLORS.tooltip.bg)
    .style("color", COLORS.text.white)
    .style("padding", "12px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("box-shadow", COLORS.tooltip.shadow)
    .style("max-width", "300px")
    .style("word-wrap", "break-word")
    .style("white-space", "normal")
}

function createChartElements(svg, result, width, tooltip) {
  const links = createLinks(svg, result, width, tooltip)  // Create links first (behind)
  const nodes = createNodes(svg, result, width)  // Then nodes on top
  const labels = createLabels(svg, result, width)
  
  return { links, nodes, labels }
}

function createLinks(svg, result, width, tooltip) {
  // Adjust node positions for year nodes to account for wider width
  const adjustedResult = {
    ...result,
    nodes: result.nodes.map(node => {
      if (node.x0 >= width / 2) {
        const adjustment = (CHART_CONFIG.yearNodeWidth - (node.x1 - node.x0)) / 2
        return {
          ...node,
          x0: node.x0 - adjustment,
          x1: node.x1 + adjustment
        }
      }
      return node
    })
  }

  return svg.append("g")
    .selectAll("path")
    .data(adjustedResult.links)
    .enter().append("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke", d => COLORS.custom[d.source.index % COLORS.custom.length])
    .attr("stroke-width", "8")
    .attr("fill", "none")
    .attr("opacity", CHART_CONFIG.defaultOpacity)
    .attr("class", "link")
    .style("cursor", "pointer")
    .style("pointer-events", "stroke") // Only respond to clicks on the stroke, not the fill
    .style("transition", "opacity 0.3s ease")
    .call(addTooltipEvents, tooltip)
}

function createNodes(svg, result, width) {
  // Only create theme nodes (left side), year nodes are handled by CSS labels
  const nodes = svg.append("g")
    .selectAll("path")
    .data(result.nodes.filter(d => d.x0 < width / 2)) // Only theme nodes
    .enter().append("path")
    .attr("d", d => {
      const x = d.x0
      const y = d.y0
      const w = CHART_CONFIG.themeNodeWidth
      const h = Math.max(20, d.y1 - d.y0)
      const r = CHART_CONFIG.cornerRadius
      
      // Theme nodes - left-only rounded corners
      return `M ${x + r} ${y} 
              L ${x + w} ${y} 
              L ${x + w} ${y + h} 
              L ${x + r} ${y + h} 
              Q ${x} ${y + h} ${x} ${y + h - r} 
              L ${x} ${y + r} 
              Q ${x} ${y} ${x + r} ${y} Z`
    })
    .attr("fill", d => COLORS.custom[d.index % COLORS.custom.length])
    .attr("stroke", COLORS.border)
    .attr("stroke-width", 1)
    .attr("class", "node theme-node")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .style("transition", "opacity 0.3s ease")
  
  return nodes
}

function createLabels(svg, result, width) {
  const fontSize = Math.max(CHART_CONFIG.fontSize.min, Math.min(CHART_CONFIG.fontSize.max, width / 80))
  
  const themeLabels = createThemeLabels(svg, result, width, fontSize)
  const yearLabels = createYearLabels(svg, result, width, fontSize)
  const titleLabels = createTitleLabels(svg, result, width, fontSize)
  
  return { themeLabels, yearLabels, titleLabels }
}

function createThemeLabels(svg, result, width, fontSize) {
  return svg.append("g")
    .selectAll("text")
    .data(result.nodes.filter(d => d.x0 < width / 2))
    .enter().append("text")
    .attr("x", d => d.x1 + 6)
    .attr("y", d => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .text(d => d.name.replace(/\b\w/g, l => l.toUpperCase())) // Title case: first letter of each word capitalized
    .attr("font-size", `${fontSize}px`)
    .attr("fill", COLORS.text.primary)
    .attr("font-weight", "normal")
    .attr("class", "label")
    .style("pointer-events", "none")
}

function createYearLabels(svg, result, width, fontSize) {
  return svg.append("g")
    .selectAll("foreignObject")
    .data(result.nodes.filter(d => d.x0 >= width / 2))
    .enter().append("foreignObject")
    .attr("x", d => d.x0 - (CHART_CONFIG.yearNodeWidth - (d.x1 - d.x0)) / 2)
    .attr("y", d => (d.y1 + d.y0) / 2 - 12) // Center vertically, adjust for padding
    .attr("width", CHART_CONFIG.yearNodeWidth)
    .attr("height", 24)
    .append("xhtml:div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("height", "100%")
    .style("background", "#8863EB")
    .style("border-radius", "8px")
    .style("padding", "2px 6px")
    .style("font-size", `${fontSize - 6}px`)
    .style("color", "white")
    .style("font-weight", "normal")
    .style("text-align", "center")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .text(d => d.year)
    .on("mouseenter", function(event, d) {
      highlightYearFlows(d.index, svg, result, width)
    })
    .on("mouseleave", function() {
      resetYearHighlighting(svg)
    })
}

function createTitleLabels(svg, result, width, fontSize) {
  return svg.append("g")
    .selectAll("text")
    .data(result.nodes.filter(d => d.x0 >= width / 2))
    .enter().append("text")
    .attr("x", d => {
      // Position after the wider year node
      const adjustedX = d.x0 - (CHART_CONFIG.yearNodeWidth - (d.x1 - d.x0)) / 2
      return adjustedX + CHART_CONFIG.yearNodeWidth + 6
    })
    .attr("y", d => (d.y1 + d.y0 - 5) / 2 + 5)
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .text(d => d.title)
    .attr("font-size", `${fontSize - 4}px`)
    .attr("fill", COLORS.text.primary)
    .attr("font-weight", "normal")
    .attr("class", "label title-label")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .on("click", (event, d) => {
      event.stopPropagation()
      
      // Remove previous selection from all nodes
      d3.selectAll(".node").classed("selected", false)
      
      // Add selection to the corresponding node
      d3.selectAll(".node").filter(nodeData => nodeData === d).classed("selected", true)
      
      selectedEvent.value = {
        title: d.title,
        year: d.year,
        description: d.description
      }
    })
    .on("mouseenter", function(event, d) {
      // Highlight the year flows for this event
      highlightYearFlows(d.index, svg, result, width)
      // Also add visual feedback to the title
      d3.select(this).style("fill", "#2E8B57").style("text-decoration", "underline")
    })
    .on("mouseleave", function(event, d) {
      // Reset highlighting
      resetYearHighlighting(svg)
      // Reset title styling
      d3.select(this).style("fill", COLORS.text.primary).style("text-decoration", "none")
    })
}

// ===== INTERACTION FUNCTIONS =====
function addTooltipEvents(selection, tooltip) {
  selection
    .on("mouseenter", (event, d) => showTooltip(event, d, tooltip))
    .on("mousemove", (event) => updateTooltipPosition(event, tooltip))
    .on("mouseleave", function() {
      d3.select(this).style("opacity", CHART_CONFIG.defaultOpacity)
      tooltip.style("visibility", "hidden")
    })
}

function showTooltip(event, d, tooltip) {
  d3.select(event.currentTarget)
    .style("opacity", CHART_CONFIG.linkOpacityHover)
    .style("stroke", COLORS.custom[d.source.index % COLORS.custom.length])
  
  tooltip.style("visibility", "visible")
    .html(`
      <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; word-wrap: break-word;">${d.description}</div>
      <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;"><strong>Theme:</strong> ${d.theme}</div>
      <div style="font-size: 11px; opacity: 0.9; margin-bottom: 4px;"><strong>Year:</strong> ${d.year}</div>
      <div style="font-size: 10px; opacity: 0.8; line-height: 1.3; word-wrap: break-word;">${d.fullDescription}</div>
    `)
    .style("left", (event.clientX + CHART_CONFIG.tooltipOffset) + "px")
    .style("top", (event.clientY - CHART_CONFIG.tooltipOffset) + "px")
}

function updateTooltipPosition(event, tooltip) {
  tooltip
    .style("left", (event.clientX + CHART_CONFIG.tooltipOffset) + "px")
    .style("top", (event.clientY - CHART_CONFIG.tooltipOffset) + "px")
}

function createTitle(svg, width) {
  const titleFontSize = Math.max(CHART_CONFIG.fontSize.title.min, Math.min(CHART_CONFIG.fontSize.title.max, width / 50))
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .style("font-size", `${titleFontSize}px`)
    .style("font-weight", "bold")
    .text(prismicData.value?.title || "Sankey Diagram")
}

function addHoverInteractions(links, nodes, labels, width) {
  const isThemeNode = d => d.x0 < width / 2
  
  nodes.filter(isThemeNode)
    .on("mouseenter", (event, d) => highlightThemeFlows(d.index, links, nodes, labels, width))
    .on("mouseleave", () => resetHighlighting(links, nodes, labels))

  nodes.filter(d => !isThemeNode(d))
    .on("mouseenter", (event, d) => highlightEventFlows(d.index, links, nodes, labels, width))
    .on("mouseleave", () => resetHighlighting(links, nodes, labels))
}

function highlightThemeFlows(themeIndex, links, nodes, labels, width) {
  links.style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight all links from this theme
  links.filter(link => link.source.index === themeIndex)
    .style("opacity", CHART_CONFIG.nodeOpacityHighlight)
    .style("stroke", COLORS.custom[themeIndex % COLORS.custom.length])
  
  nodes.filter(node => node.x0 < width / 2 && node.index !== themeIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  nodes.filter(node => node.x0 >= width / 2)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  labels.themeLabels.filter(label => label.index !== themeIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
}

function highlightEventFlows(eventIndex, links, nodes, labels, width) {
  links.style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight all links connected to this event
  links.filter(link => link.target.index === eventIndex)
    .style("opacity", CHART_CONFIG.nodeOpacityHighlight)
  
  nodes.filter(node => node.x0 >= width / 2 && node.index !== eventIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  nodes.filter(node => node.x0 < width / 2)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  labels.yearLabels.filter(label => label.index !== eventIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  labels.titleLabels.filter(label => label.index !== eventIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
}

function highlightYearFlows(yearIndex, svg, result, width) {
  // Get all elements
  const links = svg.selectAll(".link")
  const nodes = svg.selectAll(".node")
  const themeLabels = svg.selectAll(".label")
  const yearLabels = svg.selectAll("foreignObject")
  
  // Fade out all links
  links.style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight links connected to this year
  links.filter(d => d.target.index === yearIndex)
    .style("opacity", CHART_CONFIG.nodeOpacityHighlight)
  
  // Fade out theme nodes that don't connect to this year
  const connectedThemeIndices = result.links
    .filter(link => link.target.index === yearIndex)
    .map(link => link.source.index)
  
  nodes.filter(d => d.x0 < width / 2 && !connectedThemeIndices.includes(d.index))
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Fade out theme labels that don't connect to this year
  themeLabels.filter(d => d.x0 < width / 2 && !connectedThemeIndices.includes(d.index))
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Fade out other year labels
  yearLabels.filter(d => d.index !== yearIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
}

function resetYearHighlighting(svg) {
  // Reset all elements to default opacity
  svg.selectAll(".link").style("opacity", CHART_CONFIG.defaultOpacity)
  svg.selectAll(".node").style("opacity", CHART_CONFIG.defaultOpacity)
  svg.selectAll(".label").style("opacity", 1)
  svg.selectAll("foreignObject").style("opacity", 1)
}

function resetHighlighting(links, nodes, labels) {
  // Reset links to their default opacity
  links.style("opacity", CHART_CONFIG.defaultOpacity)
  
  // Reset nodes to their default opacity
  nodes.style("opacity", CHART_CONFIG.defaultOpacity)
  
  // Reset all labels to full opacity
  labels.themeLabels.style("opacity", 1)
  labels.yearLabels.style("opacity", 1)
  labels.titleLabels.style("opacity", 1)
}
</script>

<style scoped>
.h-3x4 {
  @media (max-width: 767px) { /* Applies to screens smaller than Tailwind's 'md' breakpoint */
    height: 75vh;
  }
}
/* Custom styles that can't be easily replaced with Tailwind */

/* Selected event node styling for D3 elements */
:deep(.node.selected) {
  stroke: #ff6b35 !important;
  stroke-width: 3px !important;
  filter: drop-shadow(0 0 8px rgba(255, 107, 53, 0.4));
}

/* Make all node colors vibrant */
:deep(.node) {
  opacity: 1 !important; /* Make colors vibrant */
  filter: none !important; /* Remove any opacity filters */
}

/* Responsive adjustments for mobile */
@media (max-width: 768px) {
  .diagram { 
    padding: 10px; 
  }
  .chart-container { 
    min-height: 400px; 
  }
}

@media (max-width: 480px) {
  .diagram { 
    padding: 5px; 
  }
  .chart-container { 
    min-height: 350px; 
  }
}
</style>
