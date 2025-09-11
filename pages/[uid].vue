<template lang="pug">
.flex.flex-col.md_flex-row
  .diagram.flex.flex-col.h-screen.w-full.md_w-3x4
    .chart-container.flex-1.min-h-96.overflow-auto(ref="chartContainer")
    .loading.text-center.p-5.text-gray-600.italic(v-if="loading") Loading data...
    .error.text-center.p-5.text-red-600.bg-red-50.border.border-red-200.rounded.mx-2(v-if="error") {{ error }}
    //- .debug-info.text-center.p-2.text-gray-500.text-sm.mt-2
    //-   p Debug: {{ debugInfo }}
  .info-container.p-2.bg-purple-50.border-l.border-black.h-screen.overflow-y-auto.w-full.md_w-1x4.hidden.md_block
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

  //- Mobile Modal
  .mobile-modal.fixed.bottom-0.left-0.right-0.bg-white.border-t-2.border-gray-200.shadow-lg.transform.transition-transform.duration-300.ease-in-out.z-50.md_hidden(
    :class="{ 'translate-y-0': selectedEvent || selectedTheme, 'translate-y-full': !selectedEvent && !selectedTheme }"
    v-if="selectedEvent || selectedTheme"
  )
    .modal-content.p-6.max-h-80.overflow-y-auto
      //- Event Info for Mobile
      .event-info-mobile(v-if="selectedEvent")
        .modal-header.flex.justify-between.items-start.mb-3
          .event-header
            h3.event-title.text-lg.font-bold.leading-tight.mb-1 {{ selectedEvent.title }}
            .event-year.text-sm.text-gray-600 {{ selectedEvent.year }}
          button.close-button.text-gray-500.hover_text-gray-700.text-2xl.leading-none.ml-4(@click.stop="clearSelection") ×
        
        .event-themes.mb-4(v-if="selectedEventThemes.length")
          .theme-pills.flex.flex-wrap.gap-2
            .theme-pill.px-2.py-1.rounded-full.text-xs.font-medium.text-white(
              v-for="theme in selectedEventThemes" 
              :key="theme.name"
              :style="{ backgroundColor: theme.color }"
            ) {{ theme.name }}
        
        .event-description
          .description-content
            p.text-sm.leading-relaxed(v-if="!showExpandedDescription && selectedEvent.shortened_description") 
              | {{ selectedEvent.shortened_description }}
            p.text-sm.leading-relaxed(v-else) 
              | {{ selectedEvent.description }}
          
          .more-button-container.mt-3(v-if="selectedEvent.shortened_description && selectedEvent.shortened_description !== selectedEvent.description")
            button.more-button.text-purple-600.hover_text-purple-800.text-sm.font-medium.underline(@click="showExpandedDescription = !showExpandedDescription")
              | {{ showExpandedDescription ? 'Less' : 'More' }}
      
      //- Theme Info for Mobile  
      .theme-info-mobile(v-else-if="selectedTheme")
        .modal-header.flex.justify-between.items-start.mb-3
          h3.theme-title.text-lg.font-bold.leading-tight {{ selectedTheme.name }}
          button.close-button.text-gray-500.hover_text-gray-700.text-2xl.leading-none.ml-4(@click.stop="clearSelection") ×
        .theme-description
          .description-content
            //- For themes, show full description (themes don't have shortened versions yet)
            p.text-sm.leading-relaxed {{ selectedTheme.description }}
          //- Future: Add More/Less functionality for themes if they get shortened descriptions
</template>

<script setup>
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'

// ===== COMPOSITION API SETUP =====
const route = useRoute()
const { client } = usePrismic()

// ===== CONFIGURATION =====
const CHART_CONFIG = {
  margins: { top: 40, right: 300, bottom: 40, left: 20 }, // Increased top/bottom margins for consistency
  minWidth: 300,
  minHeight: 500,
  nodeWidth: 20,
  nodePadding: 25, // Increased for better spacing
  cornerRadius: 10,
  themeNodeWidth: 20,
  yearNodeWidth: 40,
  defaultOpacity: 0.4,
  linkOpacityHover: 1,
  backgroundOpacity: 0.1,
  nodeOpacityHighlight: 0.9,
  fontSize: { base: 14, min: 18, max: 24, title: { min: 14, max: 22 } },
  tooltipOffset: 15,
  // New consistent spacing configuration
  standardNodeHeight: 25,
  maxNodeHeight: 300, // Increased to allow for themes with many connections
  connectionHeightMultiplier: 6
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
const hoverTimeout = ref(null)
const showExpandedDescription = ref(false)
const isTouchDevice = ref(false)

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
  showExpandedDescription.value = false
  
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
  
  // Detect touch device
  isTouchDevice.value = (('ontouchstart' in window) || 
                        (navigator.maxTouchPoints > 0) || 
                        (navigator.msMaxTouchPoints > 0) ||
                        window.matchMedia("(hover: none)").matches)
  
  await loadPrismicData()
  setupResizeObserver()
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  // Clean up any remaining tooltips and body event listeners (only if tooltips were created)
  if (!isTouchDevice.value) {
    d3.selectAll(".sankey-tooltip").remove()
    d3.select("body").on("mouseleave.tooltip", null)
  }
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
      description: row.Description || row.description,
      shortened_description: row.Shortened_Description || row.shortened_description || row.Description || row.description
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
          shortDescription: row.Shortened_Description || row.shortened_description || row.Description || row.description,
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
      
      // Use smaller margins on mobile for more diagram space
      const margins = window.innerWidth <= 768
        ? { top: 20, right: 140, bottom: 20, left: 5 }  // Increased right margin for event titles
        : CHART_CONFIG.margins
      
      const width = Math.max(containerRect.width - margins.left - margins.right, CHART_CONFIG.minWidth)
      const height = Math.max(containerRect.height - margins.top - margins.bottom, CHART_CONFIG.minHeight)

      d3.select(chartContainer.value).selectAll("*").remove()

      const svg = createSVGContainer(chartContainer.value, width, height, margins)
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
  // Calculate consistent node padding based on available space and number of nodes
  const themeCount = data.nodes.filter(n => n.type === 'theme').length
  const eventCount = data.nodes.filter(n => n.type === 'event').length
  const maxNodes = Math.max(themeCount, eventCount)
  
  // Use a fixed minimum padding that ensures consistent spacing regardless of data size
  const minPadding = 25 // Minimum space between nodes
  const availableHeight = height - 40 // Leave some margin at top/bottom
  const calculatedPadding = Math.max(minPadding, (availableHeight - (maxNodes * 20)) / (maxNodes - 1))
  const consistentPadding = Math.min(calculatedPadding, 50) // Cap maximum padding
  
  const sankeyLayout = sankey()
    .nodeWidth(CHART_CONFIG.nodeWidth)
    .nodePadding(consistentPadding)
    .nodeSort((a, b) => {
      if (a.x_position !== b.x_position) return a.x_position - b.x_position
      if (a.x_position === 1) return a.year - b.year
      return 0
    })
    .extent([[0, 0], [width, height]])
  
  const result = sankeyLayout(data)
  
  // Post-process to ensure consistent vertical positioning
  normalizeNodePositions(result, height, themeCount, eventCount)
  
  return result
}

function normalizeNodePositions(sankeyResult, height, themeCount, eventCount) {
  // Use responsive margins - smaller on mobile but not too small
  const isMobile = window.innerWidth <= 768
  const margin = isMobile ? 15 : CHART_CONFIG.margins.top
  const availableHeight = height - (2 * margin)
  
  // Separate theme and event nodes
  const themeNodes = sankeyResult.nodes.filter(n => n.type === 'theme')
  const eventNodes = sankeyResult.nodes.filter(n => n.type === 'event')
  
  // First, calculate proper node heights based on link spacing requirements
  calculateOptimalNodeHeights(sankeyResult, themeNodes, eventNodes)
  
  // Then distribute theme nodes evenly in available vertical space
  if (themeNodes.length > 1) {
    // On mobile, use more compact spacing for themes to allow closer horizontal positioning
    if (isMobile) {
      const compactHeight = availableHeight * 0.7 // Use only 70% of height for themes on mobile
      const startY = margin + (availableHeight - compactHeight) / 2 // Center the compact group
      const themeSpacing = compactHeight / (themeNodes.length - 1)
      themeNodes.forEach((node, index) => {
        const newY = startY + (index * themeSpacing)
        const nodeHeight = node.calculatedHeight || CHART_CONFIG.standardNodeHeight
        node.y0 = newY - (nodeHeight / 2)
        node.y1 = newY + (nodeHeight / 2)
      })
    } else {
      // Desktop logic
      const themeSpacing = availableHeight / (themeNodes.length - 1)
      themeNodes.forEach((node, index) => {
        const newY = margin + (index * themeSpacing)
        const nodeHeight = node.calculatedHeight || CHART_CONFIG.standardNodeHeight
        
        // Debug logging to see if heights are being calculated correctly
        console.log(`Theme node ${node.name}: connections=${node.connectionCount}, height=${nodeHeight}`)
        
        node.y0 = newY - (nodeHeight / 2) // Center around the calculated position
        node.y1 = newY + (nodeHeight / 2)
      })
    }
  } else if (themeNodes.length === 1) {
    // Center single theme node
    const nodeHeight = themeNodes[0].calculatedHeight || CHART_CONFIG.standardNodeHeight
    
    // Debug logging to see if heights are being calculated correctly
    console.log(`Single theme node ${themeNodes[0].name}: connections=${themeNodes[0].connectionCount}, height=${nodeHeight}`)
    
    themeNodes[0].y0 = (height - nodeHeight) / 2
    themeNodes[0].y1 = themeNodes[0].y0 + nodeHeight
  }
  
  // Distribute event nodes evenly in available vertical space
  if (eventNodes.length > 1) {
    // On mobile, use simple full-height distribution
    if (isMobile) {
      const eventSpacing = availableHeight / (eventNodes.length - 1)
      eventNodes.forEach((node, index) => {
        const newY = margin + (index * eventSpacing)
        const nodeHeight = node.calculatedHeight || CHART_CONFIG.standardNodeHeight
        node.y0 = newY - (nodeHeight / 2)
        node.y1 = newY + (nodeHeight / 2)
      })
    } else {
      // Desktop logic
      const eventSpacing = availableHeight / (eventNodes.length - 1)
      eventNodes.forEach((node, index) => {
        const newY = margin + (index * eventSpacing)
        const nodeHeight = node.calculatedHeight || CHART_CONFIG.standardNodeHeight
        node.y0 = newY - (nodeHeight / 2) // Center around the calculated position  
        node.y1 = newY + (nodeHeight / 2)
      })
    }
  } else if (eventNodes.length === 1) {
    // Center single event node
    const nodeHeight = eventNodes[0].calculatedHeight || CHART_CONFIG.standardNodeHeight
    eventNodes[0].y0 = (height - nodeHeight) / 2
    eventNodes[0].y1 = eventNodes[0].y0 + nodeHeight
  }
  
  // Update link positions to match new node positions with consistent spacing
  normalizeLinksForConsistentSpacing(sankeyResult, themeNodes, eventNodes)
}

function calculateOptimalNodeHeights(sankeyResult, themeNodes, eventNodes) {
  const linkHeight = 8 // Height of each link/connection
  const linkPadding = 2 // Reduced padding between links for tighter spacing
  const minNodePadding = 10 // Minimum padding at top/bottom of node
  
  // Calculate theme node heights based on number of connections
  themeNodes.forEach(node => {
    const connectionCount = sankeyResult.links.filter(link => link.source.id === node.id).length
    node.connectionCount = connectionCount
    
    if (connectionCount === 0) {
      node.calculatedHeight = CHART_CONFIG.standardNodeHeight
    } else {
      // Height should match exactly the space needed for links with minimal padding
      const linksHeight = connectionCount * linkHeight
      const gapsHeight = Math.max(0, connectionCount - 1) * linkPadding
      // Reduce padding to just cover the link stack height
      const topPadding = 2 // Minimal top padding
      const bottomPadding = 2 // Minimal bottom padding
      node.calculatedHeight = topPadding + linksHeight + gapsHeight + bottomPadding
    }
    
    // Debug logging before capping
    console.log(`Theme node ${node.name}: connections=${connectionCount}, calculated height=${node.calculatedHeight}`)
    
    // Cap the height to maximum
    node.calculatedHeight = Math.min(node.calculatedHeight, CHART_CONFIG.maxNodeHeight)
    
    // Debug logging after capping
    console.log(`Theme node ${node.name}: final height=${node.calculatedHeight} (max=${CHART_CONFIG.maxNodeHeight})`)
  })
  
  // Calculate event node heights based on number of connections
  eventNodes.forEach(node => {
    const connectionCount = sankeyResult.links.filter(link => link.target.id === node.id).length
    node.connectionCount = connectionCount
    
    if (connectionCount === 0) {
      node.calculatedHeight = CHART_CONFIG.standardNodeHeight
    } else {
      // Height = top padding + (links * linkHeight) + (gaps * linkPadding) + bottom padding
      const linksHeight = connectionCount * linkHeight
      const gapsHeight = Math.max(0, connectionCount - 1) * linkPadding
      node.calculatedHeight = (2 * minNodePadding) + linksHeight + gapsHeight
    }
    
    // Cap the height to maximum
    node.calculatedHeight = Math.min(node.calculatedHeight, CHART_CONFIG.maxNodeHeight)
  })
}

function normalizeLinksForConsistentSpacing(sankeyResult, themeNodes, eventNodes) {
  const linkHeight = 8 // Height of each link (must match stroke-width)
  const linkPadding = 2 // Reduced padding between links for tighter spacing
  const minNodePadding = 2 // Reduced padding to match node height calculation
  
  // Group links by source (theme) node
  const linksByTheme = new Map()
  sankeyResult.links.forEach(link => {
    const themeId = link.source.id
    if (!linksByTheme.has(themeId)) {
      linksByTheme.set(themeId, [])
    }
    linksByTheme.get(themeId).push(link)
  })
  
  // Position links with consistent spacing within each theme node
  themeNodes.forEach(themeNode => {
    const themeLinks = linksByTheme.get(themeNode.id) || []
    
    if (themeLinks.length === 0) return
    
    // Sort links by target year to maintain chronological order
    themeLinks.sort((a, b) => {
      if (a.target.year && b.target.year) {
        return a.target.year - b.target.year
      }
      return a.target.id - b.target.id
    })
    
    themeLinks.forEach((link, index) => {
      // Stack links with consistent spacing from top of node
      const linkY = themeNode.y0 + minNodePadding + (index * (linkHeight + linkPadding)) + (linkHeight / 2)
      link.y0 = linkY
      
      // Set consistent link width regardless of dataset
      link.width = linkHeight // Use the same value for visual consistency
      
      // Debug logging
      console.log(`Link ${index} for theme ${themeNode.name}: y=${linkY}, linkHeight=${linkHeight}`)
    })
  })
  
  // Group links by target (event) node and distribute them evenly
  const linksByEvent = new Map()
  sankeyResult.links.forEach(link => {
    const eventId = link.target.id
    if (!linksByEvent.has(eventId)) {
      linksByEvent.set(eventId, [])
    }
    linksByEvent.get(eventId).push(link)
  })
  
  eventNodes.forEach(eventNode => {
    const eventLinks = linksByEvent.get(eventNode.id) || []
    
    if (eventLinks.length === 0) return
    
    // All links should connect to the center of the event node where the year pill is positioned
    const yearPillCenterY = (eventNode.y1 + eventNode.y0) / 2
    
    eventLinks.forEach((link, index) => {
      // Connect all links to the center where the year pill is located
      link.y1 = yearPillCenterY
    })
  })
}

function createTooltip() {
  // Don't create tooltips on touch devices
  if (isTouchDevice.value) {
    return null
  }
  
  // Remove any existing tooltips first to prevent duplicates/stuck tooltips
  d3.selectAll(".sankey-tooltip").remove()
  
  const tooltip = d3.select("body").append("div")
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
  
  // Add a global body mouseleave to ensure tooltip is hidden when cursor leaves the page
  d3.select("body").on("mouseleave.tooltip", () => {
    tooltip.style("visibility", "hidden")
  })
  
  return tooltip
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
    .attr("stroke-width", d => d.width || 8) // Use consistent width from normalization
    .attr("fill", "none")
    .attr("opacity", CHART_CONFIG.defaultOpacity)
    .attr("class", "link")
    .style("cursor", "pointer")
    .style("pointer-events", "stroke")
    .style("transition", "opacity 0.3s ease")
    .on("click", (event) => {
      event.stopPropagation()
    })
    .call(addTooltipEvents, tooltip, svg, width)
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
      const h = d.y1 - d.y0 // Use the calculated height directly
      const r = CHART_CONFIG.cornerRadius
      
      // Debug logging to verify node rendering
      console.log(`Rendering theme node ${d.name}: height=${h}, y0=${y}, y1=${d.y1}`)
      
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
  const isMobile = window.innerWidth <= 768
  const labelGroup = svg.append("g")
  
  const labels = labelGroup
    .selectAll("g")
    .data(result.nodes.filter(d => d.x0 < width / 2))
    .enter().append("g")
    .attr("class", "theme-label-group")
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
  
  // Add text with wrapping for mobile
  labels.each(function(d) {
    const group = d3.select(this)
    const themeName = d.name.replace(/\b\w/g, l => l.toUpperCase())
    const x = d.x1 + 6
    const y = (d.y1 + d.y0) / 2
    const textFontSize = isMobile ? fontSize - 2 : fontSize
    
    if (isMobile && themeName.length > 12) {
      // Split long theme names into multiple lines on mobile
      const words = themeName.split(' ')
      const maxWidth = 80 // Reduced width for more compact theme labels on mobile
      let lines = []
      let currentLine = ''
      
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (testLine.length * (textFontSize * 0.6) > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      })
      if (currentLine) lines.push(currentLine)
      
      // Add each line as a separate tspan
      lines.forEach((line, index) => {
        group.append("text")
          .attr("x", x)
          .attr("y", y + (index - (lines.length - 1) / 2) * (textFontSize + 2))
          .attr("text-anchor", "start")
          .attr("font-size", `${textFontSize}px`)
          .attr("fill", COLORS.text.primary)
          .attr("font-weight", "normal")
          .attr("class", "label theme-label")
          .text(line)
      })
    } else {
      // Single line for desktop or short names
      group.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .attr("font-size", `${textFontSize}px`)
        .attr("fill", COLORS.text.primary)
        .attr("font-weight", "normal")
        .attr("class", "label theme-label")
        .text(themeName)
    }
  })
  
  // Only add hover events on non-touch devices
  if (!isTouchDevice.value) {
    labels
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
  
  return labels
}

function createYearLabels(svg, result, width, fontSize) {
  const yearLabels = svg.append("g")
    .selectAll("foreignObject")
    .data(result.nodes.filter(d => d.x0 >= width / 2))
    .enter().append("foreignObject")
    .attr("x", d => d.x0 - (CHART_CONFIG.yearNodeWidth - (d.x1 - d.x0)) / 2)
    .attr("y", d => (d.y1 + d.y0) / 2 - 12)
    .attr("width", CHART_CONFIG.yearNodeWidth)
    .attr("height", 24)
  
  const yearDivs = yearLabels.append("xhtml:div")
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
  
  // Only add hover events on non-touch devices
  if (!isTouchDevice.value) {
    yearDivs
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
  
  return yearLabels
}

function createTitleLabels(svg, result, width, fontSize) {
  const labels = svg.append("g")
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
    .text(d => {
      const title = d.shortened_title || d.title
      // Truncate to 20 characters on mobile/touch devices only
      // Use window.innerWidth as a more reliable mobile detection
      if (window.innerWidth <= 768 && title.length > 20) {
        return title.substring(0, 20) + '...'
      }
      return title
    })
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
        description: d.description,
        shortened_description: d.shortened_description
      }
    })
  
  // Only add hover events on non-touch devices
  if (!isTouchDevice.value) {
    labels
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
  
  return labels
}

// ===== INTERACTIONS =====
function addTooltipEvents(selection, tooltip, svg, width) {
  // Skip hover events on touch devices or if tooltip is null
  if (isTouchDevice.value || !tooltip) {
    return
  }
  
  selection
    .on("mouseenter", (event, d) => {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        // Clear any existing timeout
        if (hoverTimeout.value) {
          clearTimeout(hoverTimeout.value)
          hoverTimeout.value = null
        }
        
        showTooltip(event, d, tooltip)
        
        // Add a small delay before highlighting to prevent jitter
        hoverTimeout.value = setTimeout(() => {
          // Highlight the connected theme when hovering over a link
          const links = svg.selectAll(".link")
          const nodes = svg.selectAll(".node")
          const labels = svg.selectAll(".label")
          const yearLabels = svg.selectAll("foreignObject")
          const titleLabels = svg.selectAll(".title-label")
          
          highlightThemeFlows(d.source.index, links, nodes, { themeLabels: labels, yearLabels, titleLabels }, width)
        }, 600) // 600ms delay to prevent jitter
      }
    })
    .on("mousemove", (event) => updateTooltipPosition(event, tooltip))
    .on("mouseleave", function() {
      if (highlightedThemeIndex.value === null && highlightedEventIndex.value === null) {
        // Clear any pending highlight timeout
        if (hoverTimeout.value) {
          clearTimeout(hoverTimeout.value)
          hoverTimeout.value = null
        }
        
        d3.select(this).style("opacity", CHART_CONFIG.defaultOpacity)
        tooltip.style("visibility", "hidden")
        
        // Add a small delay before resetting to allow smooth transitions between links
        setTimeout(() => {
          // Only reset if we're not hovering over another element
          if (!hoverTimeout.value) {
            const links = svg.selectAll(".link")
            const nodes = svg.selectAll(".node")
            const labels = svg.selectAll(".label")
            const yearLabels = svg.selectAll("foreignObject")
            const titleLabels = svg.selectAll(".title-label")
            
            resetHighlighting(links, nodes, { themeLabels: labels, yearLabels, titleLabels })
          }
        }, 50) // Shorter delay for reset to feel responsive
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
        <div class="word-wrap-break-word leading-snug">${d.shortDescription}</div>
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
  // Skip hover events on touch devices
  if (isTouchDevice.value) {
    return
  }
  
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
/* Removed conflicting height rule - now using full screen height */

:deep(.node) {
  opacity: 1 !important;
  filter: none !important;
}

@media (max-width: 768px) {
  .diagram { 
    padding: 10px; 
  }
  .chart-container { 
    min-height: 70vh; /* Much larger minimum height for mobile */
  }
}

@media (max-width: 480px) {
  .diagram { 
    padding: 5px; 
  }
  .chart-container { 
    min-height: 65vh; /* Larger minimum height for small mobile screens */
  }
}

/* Mobile Modal Styles */
.mobile-modal {
  backdrop-filter: blur(2px);
}

.mobile-modal .modal-content {
  border-radius: 1rem 1rem 0 0;
}

@media (max-width: 768px) {
  .diagram {
    height: calc(100vh - 80px); /* Leave minimal space for potential modal but keep diagram large */
  }
  
  .mobile-modal {
    max-height: 50vh;
  }
  
  .mobile-modal .modal-content {
    max-height: calc(50vh - 3rem);
  }
  
  /* Increase spacing in mobile modal */
  .mobile-modal .event-header {
    margin-bottom: 0.75rem;
  }
  
  .mobile-modal .event-themes {
    margin-bottom: 1.25rem;
  }
  
  .mobile-modal .theme-pills {
    gap: 0.75rem;
  }
  
  .mobile-modal .description-content {
    margin-bottom: 0.5rem;
  }
  
  .mobile-modal .more-button-container {
    margin-top: 1rem;
  }
  
  .mobile-modal .theme-description {
    margin-top: 0.5rem;
  }
}

@media (max-width: 480px) {
  .mobile-modal {
    max-height: 60vh;
  }
  
  .mobile-modal .modal-content {
    max-height: calc(60vh - 3rem);
  }
}
</style>
