<template lang="pug">
.flex.flex-col.md_flex-row
  .diagram.flex.flex-col.h-3x4.md_h-screen.md_w-3x4
    .chart-container.flex-1.min-h-96.overflow-auto(ref="chartContainer")
    .loading.text-center.p-5.text-gray-600.italic(v-if="loading") Loading data...
    .error.text-center.p-5.text-red-600.bg-red-50.border.border-red-200.rounded.mx-2(v-if="error") {{ error }}
    //- .debug-info.text-center.p-2.text-gray-500.text-sm.mt-2
    //-   p Debug: {{ debugInfo }}
  .info-container.p-2.bg-purple-50.border-l.border-black.h-screen.overflow-y-auto.w-full.md_w-1x4
    .event-info.p-4.relative(v-if="selectedEvent")
      .close-button.absolute.top-2.right-2.cursor-pointer.hover_text-gray-700.text-xl(@click.stop="clearSelection") ×
      h3.event-title.text-lg.font-bold.leading-tight {{ selectedEvent.title }}
      .event-year.mb-4  {{ selectedEvent.year }}
      .event-themes.mb-6(v-if="selectedEventThemes.length")
        .theme-pills.flex.flex-wrap.gap-2
          .theme-pill.px-2.py-1.rounded-full.text-xs.font-medium.text-white(
            v-for="theme in selectedEventThemes" 
            :key="theme.name"
            :style="{ backgroundColor: theme.color }"
          ) {{ theme.name }}
      .event-description {{ selectedEvent.description }}
    .theme-info.p-4.relative(v-else-if="selectedTheme")
      .close-button.absolute.top-2.right-2.cursor-pointer.hover_text-gray-700.text-xl(@click.stop="clearSelection") ×
      h3.theme-title.text-lg.font-bold.mb-3.leading-tight {{ selectedTheme.name }}
      .theme-description {{ selectedTheme.description }}
    .no-selection.p-4(v-else)
      h2.text-lg.font-bold.mb-4.leading-snug Welcome to the Populist Genealogies Project
      p Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis vel sapien vitae eros consectetur malesuada. Lorem ipsum dolor sit amet, consectetur adipiscing elit. In vel dignissim velit. Nullam lobortis ipsum vitae lacus efficitur varius.
</template>

<script setup>
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

// ===== COMPOSITION API SETUP =====
const route = useRoute()
const { client } = usePrismic()

// ===== CONFIGURATION =====
const CHART_CONFIG = {
  margins: { top: 20, right: 300, bottom: 20, left: 20 },
  minWidth: 300,
  minHeight: 500,
  nodeWidth: 20,
  nodePadding: 24,
  cornerRadius: 10,
  themeNodeWidth: 20,
  yearNodeWidth: 40,
  defaultOpacity: 0.5,
  linkOpacityHover: 1,
  backgroundOpacity: 0.1,
  nodeOpacityHighlight: 0.9,
  fontSize: { base: 14, min: 18, max: 24, title: { min: 14, max: 22 } },
  tooltipOffset: 15
}

const PRIMARY_COLOR = '#8863EB'

// Generate color variations for themes
function generateColorGradations(baseColor, count) {
  const colors = []
  const hex = baseColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  for (let i = 0; i < count; i++) {
    const factor = 1 - (i * 0.7) / (count - 1)
    const newR = Math.round(r + (255 - r) * (1 - factor))
    const newG = Math.round(g + (255 - g) * (1 - factor))
    const newB = Math.round(b + (255 - b) * (1 - factor))
    colors.push(`rgb(${newR}, ${newG}, ${newB})`)
  }
  return colors
}

const COLORS = {
  primary: PRIMARY_COLOR,
  custom: generateColorGradations(PRIMARY_COLOR, 6),
  text: { primary: '#111', white: '#fff' },
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
const highlightedThemeIndex = ref(null)
const highlightedEventIndex = ref(null)

// ===== COMPUTED PROPERTIES =====
const selectedEventThemes = computed(() => {
  if (!selectedEvent.value || !currentData.value) return []
  
  const eventIndex = currentData.value.nodes.findIndex(node => 
    node.type === 'event' && node.title === selectedEvent.value.title
  )
  
  if (eventIndex === -1) return []
  
  const connectedThemes = currentData.value.links
    .filter(link => link.target.index === eventIndex)
    .map(link => {
      const themeNode = currentData.value.nodes[link.source.index]
      return {
        name: themeNode.name.replace(/\b\w/g, l => l.toUpperCase()),
        color: COLORS.custom[link.source.index % COLORS.custom.length]
      }
    })
  
  return connectedThemes
})

// ===== SELECTION MANAGEMENT =====
const clearSelection = () => {
  selectedEvent.value = null
  selectedTheme.value = null
  highlightedThemeIndex.value = null
  highlightedEventIndex.value = null
  
  try {
    if (chartContainer.value) {
      const svg = d3.select(chartContainer.value).select("svg g")
      svg.selectAll(".link").style("opacity", CHART_CONFIG.defaultOpacity)
      svg.selectAll(".node").style("opacity", CHART_CONFIG.defaultOpacity)
      svg.selectAll(".label").style("opacity", 1)
      svg.selectAll("foreignObject").style("opacity", 1)
      svg.selectAll(".title-label").style("opacity", 1)
    }
  } catch (error) {
    console.warn('Could not clear D3 selections:', error)
  }
}

const highlightThemeConnections = (themeIndex) => {
  const svg = d3.select(chartContainer.value).select("svg g")
  const links = svg.selectAll(".link")
  const nodes = svg.selectAll(".node")
  const labels = svg.selectAll(".label")
  const yearLabels = svg.selectAll("foreignObject")
  const titleLabels = svg.selectAll(".title-label")
  
  highlightedThemeIndex.value = themeIndex
  highlightedEventIndex.value = null
  highlightThemeFlows(themeIndex, links, nodes, { themeLabels: labels, yearLabels, titleLabels }, chartContainer.value.getBoundingClientRect().width)
}

const highlightEventConnections = (eventIndex) => {
  const svg = d3.select(chartContainer.value).select("svg g")
  const links = svg.selectAll(".link")
  const nodes = svg.selectAll(".node")
  const labels = svg.selectAll(".label")
  const yearLabels = svg.selectAll("foreignObject")
  const titleLabels = svg.selectAll(".title-label")
  
  highlightedEventIndex.value = eventIndex
  highlightedThemeIndex.value = null
  highlightEventFlows(eventIndex, links, nodes, { themeLabels: labels, yearLabels, titleLabels }, chartContainer.value.getBoundingClientRect().width)
}

const restoreHighlighting = () => {
  if (highlightedThemeIndex.value !== null) {
    const svg = d3.select(chartContainer.value).select("svg g")
    const links = svg.selectAll(".link")
    const nodes = svg.selectAll(".node")
    const labels = svg.selectAll(".label")
    const yearLabels = svg.selectAll("foreignObject")
    const titleLabels = svg.selectAll(".title-label")
    
    highlightThemeFlows(highlightedThemeIndex.value, links, nodes, { themeLabels: labels, yearLabels, titleLabels }, chartContainer.value.getBoundingClientRect().width)
  }
  
  if (highlightedEventIndex.value !== null) {
    const svg = d3.select(chartContainer.value).select("svg g")
    const links = svg.selectAll(".link")
    const nodes = svg.selectAll(".node")
    const labels = svg.selectAll(".label")
    const yearLabels = svg.selectAll("foreignObject")
    const titleLabels = svg.selectAll(".title-label")
    
    highlightEventFlows(highlightedEventIndex.value, links, nodes, { themeLabels: labels, yearLabels, titleLabels }, chartContainer.value.getBoundingClientRect().width)
  }
}

// ===== LIFECYCLE =====
let resizeObserver = null

onMounted(async () => {
  debugInfo.value = 'Component mounted, starting Prismic data load...'
  await loadPrismicData()
  setupResizeObserver()
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

// ===== DATA LOADING =====
async function loadPrismicData() {
  try {
    loading.value = true
    error.value = null
    debugInfo.value = 'Loading Prismic data...'
    
    const { data } = await client.getByUID('diagram', route.params.uid)
    
    if (!data) {
      throw new Error('Diagram page not found')
    }
    
    prismicData.value = data
    debugInfo.value = `Prismic data loaded: ${data.title}`
    
    if (data.csv_file?.url) {
      await loadCSVData(data.csv_file.url)
    } else {
      console.warn('CSV file not found in Prismic, using local mock data')
      await loadCSVData('/data/germany_mockdata_with_theme_desc.csv')
    }
    
  } catch (err) {
    console.error('Error loading Prismic data:', err)
    error.value = err.message || 'Failed to load diagram data'
    debugInfo.value = `Prismic failed: ${err.message}`
    loading.value = false
  }
}

async function loadCSVData(csvUrl) {
  try {
    debugInfo.value = 'Loading CSV data from Prismic...'
    
    const csvData = await d3.dsv(';', csvUrl)
    debugInfo.value = `CSV loaded: ${csvData.length} rows`
    
    if (!csvData?.length) throw new Error('CSV data was empty')
    
    const allThemes = csvData.map(row => row.Theme || row.theme)
    const themes = [...new Set(allThemes.flatMap(themeString => 
      themeString.split(';').flatMap(themeGroup => 
        themeGroup.split(',').map(t => t.trim())
      )
    ))].sort()
    
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

// ===== DATA TRANSFORMATION =====
function transformCSVToSankey(csvData, themes) {
  const sortedData = [...csvData].sort((a, b) => {
    const yearDiff = parseInt(a.Year || a.year) - parseInt(b.Year || b.year)
    return yearDiff !== 0 ? yearDiff : (a.Theme || a.theme).localeCompare(b.Theme || b.theme)
  })
  
  const themeDescriptions = {}
  csvData.forEach(row => {
    const rowThemes = (row.Theme || row.theme).split(';').flatMap(themeGroup => 
      themeGroup.split(',').map(t => t.trim())
    )
    const themeDesc = row.Theme_Description || row.theme_description || ''
    const themeDescArray = themeDesc.split(',').map(d => d.trim())
    
    rowThemes.forEach((theme, index) => {
      if (theme && !themeDescriptions[theme]) {
        const description = themeDescArray[index] || themeDescArray[0] || themeDesc
        if (description) {
          themeDescriptions[theme] = description
        }
      }
    })
  })
  
  const nodes = [
    ...themes.map((theme, index) => ({
      id: index,
      name: theme,
      type: 'theme',
      x_position: 0,
      themeDescription: themeDescriptions[theme] || 'No description available'
    })),
    ...sortedData.map((row, index) => ({
      id: themes.length + index,
      name: `${row.Year || row.year} - ${row.Title || row.title}`,
      type: 'event',
      x_position: 1,
      year: parseInt(row.Year || row.year),
      title: row.Title || row.title,
      shortened_title: row.Shortened_Title || row.shortened_title || row.Title || row.title,
      description: row.Description || row.description
    }))
  ]
  
  const links = []
  sortedData.forEach((row, index) => {
    const eventIndex = themes.length + index
    const eventThemes = (row.Theme || row.theme).split(';').flatMap(themeGroup => 
      themeGroup.split(',').map(t => t.trim())
    )
    
    eventThemes.forEach(theme => {
      const themeIndex = themes.indexOf(theme)
      if (themeIndex !== -1) {
        links.push({
          source: themeIndex,
          target: eventIndex,
          value: 2,
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

// ===== RESIZE HANDLING =====
function setupResizeObserver() {
  if (!chartContainer.value) return
  
  resizeObserver = new ResizeObserver(() => {
    if (chartContainer.value && !loading.value && currentData.value) {
      createSankeyDiagram(currentData.value)
    }
  })
  resizeObserver.observe(chartContainer.value)
}

// ===== CHART CREATION =====
function createSankeyDiagram(data) {
  if (!data || !chartContainer.value) {
    console.warn('Cannot create Sankey diagram: missing data or container')
    return
  }
  
  try {
    const containerRect = chartContainer.value.getBoundingClientRect()
    const width = Math.max(containerRect.width - CHART_CONFIG.margins.left - CHART_CONFIG.margins.right, CHART_CONFIG.minWidth)
    const height = Math.max(containerRect.height - CHART_CONFIG.margins.top - CHART_CONFIG.margins.bottom, CHART_CONFIG.minHeight)

    d3.select(chartContainer.value).selectAll("*").remove()

    const svg = createSVGContainer(chartContainer.value, width, height, CHART_CONFIG.margins)
    const result = createSankeyLayout(data, width, height)
    const tooltip = createTooltip()

    const { links, nodes, labels } = createChartElements(svg, result, width, tooltip)
    
    addHoverInteractions(links, nodes, labels, width)
    restoreHighlighting()
  } catch (err) {
    console.error('Error creating Sankey diagram:', err)
    error.value = 'Failed to render diagram'
    debugInfo.value = `Chart creation failed: ${err.message}`
  }
}

function createSVGContainer(container, width, height, margin) {
  const svg = d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("cursor", "default")
    .on("click", (event) => {
      if (event.target === event.currentTarget) {
        clearSelection()
      }
    })
    
  svg.append("rect")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .on("click", () => {
      clearSelection()
    })
    
  return svg.append("g")
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
    .style("background", "#fff")
    .style("border", "1px solid #111")
    .style("color", "#111")
    .style("padding", ".5em")
    .style("border-radius", "3px")
    .style("font-size", "14px")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    // .style("box-shadow", "0 4px 8px rgba(0,0,0,0.3)")
    .style("max-width", "400px")
    .style("word-wrap", "break-word")
    .style("white-space", "normal")
}

function createChartElements(svg, result, width, tooltip) {
  const links = createLinks(svg, result, width, tooltip)
  const nodes = createNodes(svg, result, width)
  const labels = createLabels(svg, result, width)
  
  // Ensure proper z-index layering: links behind, nodes in middle, labels on top
  links.raise()
  nodes.raise()
  labels.themeLabels.raise()
  labels.yearLabels.raise()
  labels.titleLabels.raise()
  
  return { links, nodes, labels }
}

function createLinks(svg, result, width, tooltip) {
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
    .style("pointer-events", "stroke")
    .style("transition", "opacity 0.3s ease")
    .on("click", (event) => {
      event.stopPropagation()
    })
    .call(addTooltipEvents, tooltip)
}

function createNodes(svg, result, width) {
  return svg.append("g")
    .selectAll("path")
    .data(result.nodes.filter(d => d.x0 < width / 2))
    .enter().append("path")
    .attr("d", d => {
      const x = d.x0
      const y = d.y0
      const w = CHART_CONFIG.themeNodeWidth
      const h = Math.max(20, d.y1 - d.y0)
      const r = CHART_CONFIG.cornerRadius
      
      return `M ${x + r} ${y} 
              L ${x + w} ${y} 
              L ${x + w} ${y + h} 
              L ${x + r} ${y + h} 
              Q ${x} ${y + h} ${x} ${y + h - r} 
              L ${x} ${y + r} 
              Q ${x} ${y} ${x + r} ${y} Z`
    })
    .attr("fill", d => COLORS.custom[d.index % COLORS.custom.length])
    .attr("stroke", "none")
    .attr("class", "node theme-node")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .style("transition", "opacity 0.3s ease")
    .on("click", (event, d) => {
      event.stopPropagation()
      selectedEvent.value = null
      highlightThemeConnections(d.index)
      selectedTheme.value = {
        name: d.name.replace(/\b\w/g, l => l.toUpperCase()),
        description: d.themeDescription
      }
    })
}

function createLabels(svg, result, width) {
  const fontSize = Math.max(CHART_CONFIG.fontSize.min, Math.min(CHART_CONFIG.fontSize.max, width / 80))
  
  return {
    themeLabels: createThemeLabels(svg, result, width, fontSize),
    yearLabels: createYearLabels(svg, result, width, fontSize),
    titleLabels: createTitleLabels(svg, result, width, fontSize)
  }
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
    .text(d => d.name.replace(/\b\w/g, l => l.toUpperCase()))
    .attr("font-size", `${fontSize}px`)
    .attr("fill", COLORS.text.primary)
    .attr("font-weight", "normal")
    .attr("class", "label theme-label")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .on("click", (event, d) => {
      event.stopPropagation()
      selectedEvent.value = null
      highlightThemeConnections(d.index)
      selectedTheme.value = {
        name: d.name.replace(/\b\w/g, l => l.toUpperCase()),
        description: d.themeDescription
      }
    })
    .on("mouseenter", (event, d) => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        const svg = d3.select(event.currentTarget.closest('svg'))
        const links = svg.selectAll(".link")
        const nodes = svg.selectAll(".node")
        const labels = svg.selectAll(".label")
        const yearLabels = svg.selectAll("foreignObject")
        
        highlightThemeFlows(d.index, links, nodes, { themeLabels: labels, yearLabels, titleLabels: svg.selectAll(".title-label") }, width)
      }
    })
    .on("mouseleave", () => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        const svg = d3.select(event.currentTarget.closest('svg'))
        const links = svg.selectAll(".link")
        const nodes = svg.selectAll(".node")
        const labels = svg.selectAll(".label")
        const yearLabels = svg.selectAll("foreignObject")
        
        resetHighlighting(links, nodes, { themeLabels: labels, yearLabels, titleLabels: svg.selectAll(".title-label") })
      }
    })
}

function createYearLabels(svg, result, width, fontSize) {
  return svg.append("g")
    .selectAll("foreignObject")
    .data(result.nodes.filter(d => d.x0 >= width / 2))
    .enter().append("foreignObject")
    .attr("x", d => d.x0 - (CHART_CONFIG.yearNodeWidth - (d.x1 - d.x0)) / 2)
    .attr("y", d => (d.y1 + d.y0) / 2 - 12)
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
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        highlightYearFlows(d.index, svg, result, width)
      }
    })
    .on("mouseleave", function() {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        resetYearHighlighting(svg)
      }
    })
}

function createTitleLabels(svg, result, width, fontSize) {
  return svg.append("g")
    .selectAll("text")
    .data(result.nodes.filter(d => d.x0 >= width / 2))
    .enter().append("text")
    .attr("x", d => {
      const adjustedX = d.x0 - (CHART_CONFIG.yearNodeWidth - (d.x1 - d.x0)) / 2
      return adjustedX + CHART_CONFIG.yearNodeWidth + 6
    })
    .attr("y", d => (d.y1 + d.y0 - 5) / 2 + 5)
    .attr("dy", "0.35em")
    .attr("text-anchor", "start")
    .text(d => d.shortened_title || d.title)
    .attr("font-size", `${fontSize - 4}px`)
    .attr("fill", COLORS.text.primary)
    .attr("font-weight", "normal")
    .attr("class", "label title-label")
    .style("cursor", "pointer")
    .style("pointer-events", "all")
    .on("click", (event, d) => {
      event.stopPropagation()
      selectedTheme.value = null
      highlightEventConnections(d.index)
      selectedEvent.value = {
        title: d.title,
        year: d.year,
        description: d.description
      }
    })
    .on("mouseenter", (event, d) => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        const links = svg.selectAll(".link")
        const nodes = svg.selectAll(".node")
        const labels = svg.selectAll(".label")
        const yearLabels = svg.selectAll("foreignObject")
        
        highlightEventFlows(d.index, links, nodes, { themeLabels: labels, yearLabels, titleLabels: svg.selectAll(".title-label") }, width)
      }
    })
    .on("mouseleave", () => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        const links = svg.selectAll(".link")
        const nodes = svg.selectAll(".node")
        const labels = svg.selectAll(".label")
        const yearLabels = svg.selectAll("foreignObject")
        
        resetHighlighting(links, nodes, { themeLabels: labels, yearLabels, titleLabels: svg.selectAll(".title-label") })
      }
    })
}

// ===== INTERACTIONS =====
function addTooltipEvents(selection, tooltip) {
  selection
    .on("mouseenter", (event, d) => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        showTooltip(event, d, tooltip)
      }
    })
    .on("mousemove", (event) => updateTooltipPosition(event, tooltip))
    .on("mouseleave", function() {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        d3.select(this).style("opacity", CHART_CONFIG.defaultOpacity)
        tooltip.style("visibility", "hidden")
      }
    })
}

function showTooltip(event, d, tooltip) {
  d3.select(event.currentTarget)
    .style("opacity", CHART_CONFIG.linkOpacityHover)
    .style("stroke", COLORS.custom[d.source.index % COLORS.custom.length])
  
  tooltip.style("visibility", "visible")
    .html(`
      <div class="text-sm">
        <div class="font-bold leading-tight">${d.description}</div>
        <div class="mb-2">${d.year}</div>
        <div class="word-wrap-break-word leading-snug">${d.fullDescription}</div>
      </div>
    `)
    .style("left", (event.clientX + CHART_CONFIG.tooltipOffset) + "px")
    .style("top", (event.clientY - CHART_CONFIG.tooltipOffset) + "px")
}

function updateTooltipPosition(event, tooltip) {
  tooltip
    .style("left", (event.clientX + CHART_CONFIG.tooltipOffset) + "px")
    .style("top", (event.clientY - CHART_CONFIG.tooltipOffset) + "px")
}


function addHoverInteractions(links, nodes, labels, width) {
  const isThemeNode = d => d.x0 < width / 2
  
  nodes.filter(isThemeNode)
    .on("mouseenter", (event, d) => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        highlightThemeFlows(d.index, links, nodes, labels, width)
      }
    })
    .on("mouseleave", () => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        resetHighlighting(links, nodes, labels)
      }
    })

  nodes.filter(d => !isThemeNode(d))
    .on("mouseenter", (event, d) => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        highlightEventFlows(d.index, links, nodes, labels, width)
      }
    })
    .on("mouseleave", () => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        resetHighlighting(links, nodes, labels)
      }
    })
}

function highlightThemeFlows(themeIndex, links, nodes, labels, width) {
  links.style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight all links from this theme
  links.filter(link => link.source.index === themeIndex)
    .style("opacity", CHART_CONFIG.nodeOpacityHighlight)
    .style("stroke", COLORS.custom[themeIndex % COLORS.custom.length])
  
  // Fade out other theme nodes
  nodes.filter(node => node.x0 < width / 2 && node.index !== themeIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Fade out other theme labels
  labels.themeLabels.filter(label => label.index !== themeIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight connected event nodes and fade out unconnected ones
  const connectedEventIndices = new Set()
  links.filter(link => link.source.index === themeIndex)
    .each(function(d) {
      connectedEventIndices.add(d.target.index)
    })
  
  nodes.filter(node => node.x0 >= width / 2)
    .style("opacity", d => connectedEventIndices.has(d.index) ? CHART_CONFIG.nodeOpacityHighlight : CHART_CONFIG.backgroundOpacity)
  
  // Highlight connected year labels and fade out unconnected ones
  labels.yearLabels
    .style("opacity", d => connectedEventIndices.has(d.index) ? 1 : CHART_CONFIG.backgroundOpacity)
  
  // Highlight connected title labels and fade out unconnected ones
  labels.titleLabels
    .style("opacity", d => connectedEventIndices.has(d.index) ? 1 : CHART_CONFIG.backgroundOpacity)
}

function highlightEventFlows(eventIndex, links, nodes, labels, width) {
  links.style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight all links connected to this event
  links.filter(link => link.target.index === eventIndex)
    .style("opacity", CHART_CONFIG.nodeOpacityHighlight)
  
  // Fade out other event nodes
  nodes.filter(node => node.x0 >= width / 2 && node.index !== eventIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Fade out all theme nodes
  nodes.filter(node => node.x0 < width / 2)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Fade out all theme labels
  labels.themeLabels
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  // Highlight the selected event's year and title labels, fade out others
  labels.yearLabels
    .style("opacity", d => d.index === eventIndex ? 1 : CHART_CONFIG.backgroundOpacity)
  
  labels.titleLabels
    .style("opacity", d => d.index === eventIndex ? 1 : CHART_CONFIG.backgroundOpacity)
}

function highlightYearFlows(yearIndex, svg, result, width) {
  const links = svg.selectAll(".link")
  const nodes = svg.selectAll(".node")
  const themeLabels = svg.selectAll(".label")
  const yearLabels = svg.selectAll("foreignObject")
  
  links.style("opacity", CHART_CONFIG.backgroundOpacity)
  
  links.filter(d => d.target.index === yearIndex)
    .style("opacity", CHART_CONFIG.nodeOpacityHighlight)
  
  const connectedThemeIndices = result.links
    .filter(link => link.target.index === yearIndex)
    .map(link => link.source.index)
  
  nodes.filter(d => d.x0 < width / 2 && !connectedThemeIndices.includes(d.index))
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  themeLabels.filter(d => d.x0 < width / 2 && !connectedThemeIndices.includes(d.index))
    .style("opacity", CHART_CONFIG.backgroundOpacity)
  
  yearLabels.filter(d => d.index !== yearIndex)
    .style("opacity", CHART_CONFIG.backgroundOpacity)
}

function resetYearHighlighting(svg) {
  svg.selectAll(".link").style("opacity", CHART_CONFIG.defaultOpacity)
  svg.selectAll(".node").style("opacity", CHART_CONFIG.defaultOpacity)
  svg.selectAll(".label").style("opacity", 1)
  svg.selectAll("foreignObject").style("opacity", 1)
}

function resetHighlighting(links, nodes, labels) {
  links.style("opacity", CHART_CONFIG.defaultOpacity)
  nodes.style("opacity", CHART_CONFIG.defaultOpacity)
  labels.themeLabels.style("opacity", 1)
  labels.yearLabels.style("opacity", 1)
  labels.titleLabels.style("opacity", 1)
}
</script>

<style scoped>
.h-3x4 {
  @media (max-width: 767px) {
    height: 75vh;
  }
}

:deep(.node) {
  opacity: 1 !important;
  filter: none !important;
}

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
