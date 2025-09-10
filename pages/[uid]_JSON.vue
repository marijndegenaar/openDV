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
      .event-themes.mb-3(v-if="selectedEvent.themes && selectedEvent.themes.length")
        .theme-pills.flex.flex-wrap.gap-2
          .theme-pill.px-3.py-1.rounded-full.text-xs.font-medium.text-white(
            v-for="theme in selectedEvent.themes" 
            :key="theme.key"
            :style="{ backgroundColor: theme.color }"
          ) {{ theme.name }}
      .event-year.text-gray-600.text-sm.mb-4.font-medium Year: {{ selectedEvent.year }}
      .event-description.text-gray-800.text-sm.leading-relaxed.m-0(v-html="renderMarkdown(selectedEvent.description)")
    .theme-info.p-4(v-else-if="selectedTheme")
      h3.theme-title.text-lg.font-bold.mb-3.leading-tight {{ selectedTheme.name }}
      .theme-type.text-purple-600.text-sm.mb-4.font-medium.uppercase.tracking-wide Theme
      .theme-description.text-gray-800.text-sm.leading-relaxed.m-0(v-html="renderMarkdown(selectedTheme.description)")
    .no-selection.p-4.text-center.text-gray-600.italic(v-else)
      p Click on a theme or event node to view its description
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
  cornerRadius: 10,
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

const PRIMARY_COLOR = '#8863EB'

// #8863EB - Purple
// #E163EB - Pink/Magenta
// #636AEB - Blue-Purple
// #EB63AB - Pink
// #B463EB - Light Purple
// #D3B1EB - Very Light Purple

// Function to generate lighter variations of the primary color
function generateColorGradations(baseColor, count) {
  const colors = []
  
  // Convert hex to RGB
  const hex = baseColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  for (let i = 0; i < count; i++) {
    // Calculate opacity/lightness factor (from 1.0 to 0.3)
    const factor = 1 - (i * 0.7) / (count - 1)
    
    // Blend with white for lighter variations
    const newR = Math.round(r + (255 - r) * (1 - factor))
    const newG = Math.round(g + (255 - g) * (1 - factor))
    const newB = Math.round(b + (255 - b) * (1 - factor))
    
    colors.push(`rgb(${newR}, ${newG}, ${newB})`)
  }
  
  return colors
}

const COLORS = {
  primary: PRIMARY_COLOR,
  custom: generateColorGradations(PRIMARY_COLOR, 6), // Generate 6 gradations
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
const selectedTheme = ref(null)
const themesData = ref(null)

// ===== UTILITY FUNCTIONS =====
/**
 * Simple markdown renderer for basic formatting
 * Handles **bold** and *italic* text
 */
function renderMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

/**
 * Get theme color based on theme key
 * Uses the same color scheme as the diagram nodes
 */
function getThemeColor(themeKey) {
  if (!themesData.value) return COLORS.primary
  
  const themes = Object.keys(themesData.value)
  const themeIndex = themes.indexOf(themeKey)
  if (themeIndex === -1) return COLORS.primary
  
  return COLORS.custom[themeIndex % COLORS.custom.length]
}

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
 * Loads diagram configuration and JSON data from Prismic CMS or local mock data
 * Handles the initial data fetching and error states
 */
async function loadPrismicData() {
  try {
    loading.value = true
    error.value = null
    debugInfo.value = 'Loading data...'
    
    // First try to load from Prismic
    try {
      const { data } = await client.getByUID('diagram', route.params.uid)
      
      if (data && data.json_file?.url) {
        prismicData.value = data
        debugInfo.value = `Prismic data loaded: ${data.title}`
        await loadJSONData(data.json_file.url)
        return
      }
    } catch (prismicErr) {
      console.warn('Prismic data not available, falling back to mock data:', prismicErr)
    }
    
    // Fallback to local mock data for testing
    debugInfo.value = 'Loading mock data for testing...'
    await loadJSONData('/data/germany_mockdata.json')
    
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = err.message || 'Failed to load diagram data'
    debugInfo.value = `Data loading failed: ${err.message}`
    loading.value = false
  }
}

/**
 * Loads and processes JSON data from the provided URL
 * Extracts themes and transforms data for Sankey diagram
 */
async function loadJSONData(jsonUrl) {
  try {
    debugInfo.value = 'Loading JSON data...'
    
    const response = await fetch(jsonUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`)
    }
    
    const jsonData = await response.json()
    debugInfo.value = `JSON loaded: ${jsonData.events?.length || 0} events`
    
    if (!jsonData?.events?.length) throw new Error('JSON data was empty or invalid')
    if (!jsonData?.themes) throw new Error('JSON themes data missing')
    
    // Extract themes from the JSON structure
    const themes = Object.keys(jsonData.themes)
    
    // Store themes data for color mapping
    themesData.value = jsonData.themes
    
    debugInfo.value = `Found ${themes.length} unique themes and ${jsonData.events.length} events`
    
    const sankeyData = transformJSONToSankey(jsonData, themes)
    debugInfo.value = `JSON processed: ${sankeyData.nodes.length} nodes (${themes.length} themes + ${jsonData.events.length} events) with ${sankeyData.links.length} total connections`
    
    loading.value = false
    currentData.value = sankeyData
    createSankeyDiagram(sankeyData)
    
  } catch (err) {
    console.error('Error loading JSON data:', err)
    error.value = err.message || 'Failed to load JSON data'
    debugInfo.value = `JSON failed: ${err.message}`
    loading.value = false
  }
}

// ===== DATA TRANSFORMATION FUNCTIONS =====
/**
 * Transforms JSON data into Sankey diagram format
 * Creates nodes for themes and events, and links between them
 */
function transformJSONToSankey(jsonData, themes) {
  const sortedEvents = [...jsonData.events].sort((a, b) => {
    const yearDiff = a.year - b.year
    return yearDiff !== 0 ? yearDiff : a.title.localeCompare(b.title)
  })
  
  const nodes = [
    // Theme nodes (left side of diagram)
    ...themes.map((themeKey, index) => ({
      id: index,
      name: jsonData.themes[themeKey].name,
      type: 'theme',
      x_position: 0,
      themeKey: themeKey,
      themeDescription: jsonData.themes[themeKey].description
    })),
    // Event nodes (right side of diagram)
    ...sortedEvents.map((event, index) => ({
      id: themes.length + index,
      name: `${event.year} - ${event.title}`,
      type: 'event',
      x_position: 1,
      year: event.year,
      title: event.title,
      description: event.description,
      themes: event.themes
    }))
  ]
  
  // Create links for each theme-event combination
  const links = []
  sortedEvents.forEach((event, index) => {
    const eventIndex = themes.length + index
    
    event.themes.forEach(themeKey => {
      const themeIndex = themes.indexOf(themeKey)
      if (themeIndex !== -1) {
        links.push({
          source: themeIndex,
          target: eventIndex,
          value: 2, // Link weight for visual sizing
          description: event.title,
          fullDescription: event.description,
          year: event.year,
          theme: jsonData.themes[themeKey].name,
          themeDescription: jsonData.themes[themeKey].description
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
    .on("click", (event, d) => {
      event.stopPropagation()
      
      // Clear event selection
      selectedEvent.value = null
      
      // Remove previous selection from all nodes
      d3.selectAll(".node").classed("selected", false)
      d3.selectAll(".label").classed("selected", false)
      
      // Add selection to the clicked theme node
      d3.select(event.currentTarget).classed("selected", true)
      
      // Also highlight the corresponding theme label
      d3.selectAll(".label").filter(labelData => labelData === d).classed("selected", true)
      
      selectedTheme.value = {
        name: d.name,
        description: d.themeDescription,
        key: d.themeKey
      }
    })
  
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
    .attr("class", "label theme-label")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .on("click", (event, d) => {
      event.stopPropagation()
      
      // Clear event selection
      selectedEvent.value = null
      
      // Remove previous selection from all nodes and labels
      d3.selectAll(".node").classed("selected", false)
      d3.selectAll(".label").classed("selected", false)
      
      // Add selection to the clicked theme label
      d3.select(event.currentTarget).classed("selected", true)
      
      // Also highlight the corresponding theme node
      d3.selectAll(".node").filter(nodeData => nodeData === d).classed("selected", true)
      
      selectedTheme.value = {
        name: d.name,
        description: d.themeDescription,
        key: d.themeKey
      }
    })
    .on("mouseenter", function(event, d) {
      d3.select(this).style("fill", "#2E8B57").style("text-decoration", "underline")
    })
    .on("mouseleave", function(event, d) {
      d3.select(this).style("fill", COLORS.text.primary).style("text-decoration", "none")
    })
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
    .style("background", PRIMARY_COLOR)
    .style("border-radius", "1em")
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
      
      // Clear theme selection
      selectedTheme.value = null
      
      // Remove previous selection from all nodes and labels
      d3.selectAll(".node").classed("selected", false)
      d3.selectAll(".label").classed("selected", false)
      
      // Add selection to the corresponding node (if any exist for events)
      d3.selectAll(".node").filter(nodeData => nodeData === d).classed("selected", true)
      
      selectedEvent.value = {
        title: d.title,
        year: d.year,
        description: d.description,
        themes: d.themes.map(themeKey => ({
          key: themeKey,
          name: themesData.value[themeKey]?.name || themeKey,
          color: getThemeColor(themeKey)
        }))
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
      <div style="font-size: 10px; opacity: 0.8; margin-bottom: 6px; line-height: 1.3; font-style: italic;">${d.themeDescription || 'No theme description available'}</div>
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
    .text(prismicData.value?.title || "Germany Educational History")
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

/* Selected theme label styling */
:deep(.label.selected) {
  fill: #ff6b35 !important;
  font-weight: bold !important;
  text-decoration: underline !important;
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
