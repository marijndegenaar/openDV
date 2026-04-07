<template lang="pug">
#header.flex.justify-between.items-center.border-b.border-black.relative
    .logo.px-4.py-2
      h1.text-sm.font-bold 
        NuxtLink(to="/") OPEN DV

    // Desktop Menu
    .desktop-menu.flex.items-center

      // Case Studies dropdown
      .nav-dropdown.border-l.border-black(
        @mouseenter="openDropdown('caseStudies')"
        @mouseleave="closeDropdown('caseStudies')"
      )
        .nav-dropdown-trigger.px-6.py-2.cursor-default(
          :class="{ 'bg-purple-50 font-bold': isCaseStudiesActive }"
        ) Case Studies
        .nav-dropdown-menu(v-if="openDropdowns.caseStudies")
          NuxtLink.nav-dropdown-item(
            v-for="diagram in diagrams"
            :key="diagram.uid"
            :to="`/${diagram.uid}`"
            :class="{ 'active': $route.params.uid === diagram.uid }"
          ) {{ diagram.data.title }}

      // Pages dropdown
      .nav-dropdown.border-l.border-black(
        v-if="pages.length"
        @mouseenter="openDropdown('pages')"
        @mouseleave="closeDropdown('pages')"
      )
        .nav-dropdown-trigger.px-6.py-2.cursor-default(
          :class="{ 'bg-purple-50 font-bold': isPagesActive }"
        ) Pages
        .nav-dropdown-menu(v-if="openDropdowns.pages")
          NuxtLink.nav-dropdown-item(
            v-for="page in pages"
            :key="page.uid"
            :to="`/p/${page.uid}`"
            :class="{ 'active': $route.params.uid === page.uid }"
          ) {{ page.data.title }}

    // Mobile Menu Button
    .mobile-menu-btn.px-4.py-2.relative(@click="toggleMobileMenu")
      .hamburger(:class="{ 'active': isMobileMenuOpen }")
        span
        span
        span

      // Mobile Dropdown Menu
      .mobile-dropdown(
        v-if="isMobileMenuOpen"
        @click.stop
      )
        .mobile-group-label.px-4.py-2.text-xs.uppercase.tracking-widest.text-gray-400 Case Studies
        NuxtLink.mobile-menu-item.block.px-4.py-3.border-b.border-gray-200(
          v-for="diagram in diagrams"
          :key="diagram.uid"
          :to="`/${diagram.uid}`"
          @click="closeMobileMenu"
          :class="{ 'active': $route.params.uid === diagram.uid }"
        ) {{ diagram.data.title }}
        template(v-if="pages.length")
          .mobile-group-label.px-4.py-2.text-xs.uppercase.tracking-widest.text-gray-400 Pages
          NuxtLink.mobile-menu-item.block.px-4.py-3.border-b.border-gray-200(
            v-for="page in pages"
            :key="page.uid"
            :to="`/p/${page.uid}`"
            @click="closeMobileMenu"
            :class="{ 'active': $route.params.uid === page.uid }"
          ) {{ page.data.title }}
</template>

<script setup>
const { client } = usePrismic()
const route = useRoute()

// ===== REACTIVE STATE =====
const diagrams = ref([])
const pages = ref([])
const isMobileMenuOpen = ref(false)
const openDropdowns = reactive({ caseStudies: false, pages: false })

// ===== COMPUTED =====
const isCaseStudiesActive = computed(() =>
  diagrams.value.some(d => d.uid === route.params.uid)
)
const isPagesActive = computed(() =>
  pages.value.some(p => p.uid === route.params.uid)
)

// ===== LIFECYCLE HOOKS =====
onMounted(async () => {
  await Promise.all([loadDiagrams(), loadPages()])
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// ===== DATA LOADING =====
async function loadDiagrams() {
  try {
    diagrams.value = await client.getAllByType('diagram')
  } catch (error) {
    console.error('Error loading diagrams:', error)
  }
}

async function loadPages() {
  try {
    pages.value = await client.getAllByType('page')
  } catch (error) {
    console.error('Error loading pages:', error)
  }
}

// ===== DROPDOWN FUNCTIONS =====
function openDropdown(key) {
  openDropdowns[key] = true
}

function closeDropdown(key) {
  openDropdowns[key] = false
}

// ===== MOBILE MENU FUNCTIONS =====
function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function handleClickOutside(event) {
  const mobileMenuBtn = event.target.closest('.mobile-menu-btn')
  if (!mobileMenuBtn && isMobileMenuOpen.value) {
    closeMobileMenu()
  }
}

watch(() => route.path, () => {
  closeMobileMenu()
})
</script>

<style scoped>
/* Responsive Design */
.desktop-menu {
  display: flex;
}

.mobile-menu-btn {
  display: none;
}

@media (max-width: 767px) {
  .desktop-menu {
    display: none;
  }

  .mobile-menu-btn {
    display: block;
  }
}

/* Desktop Dropdowns */
.nav-dropdown {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.nav-dropdown-trigger {
  height: 100%;
  display: flex;
  align-items: center;
  user-select: none;
  transition: background-color 0.15s ease;
}

.nav-dropdown:hover .nav-dropdown-trigger {
  background-color: #faf5ff;
}

.nav-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 200px;
  background-color: white;
  border: 1px solid black;
  z-index: 50;
}

.nav-dropdown-item {
  display: block;
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  color: black;
  text-decoration: none;
  line-height: 1.3;
  transition: background-color 0.15s ease;
}

.nav-dropdown-item:last-child {
  border-bottom: none;
}

.nav-dropdown-item:hover {
  background-color: #faf5ff;
}

.nav-dropdown-item.active {
  background-color: #faf5ff;
  font-weight: bold;
}

/* Hamburger Button */
.hamburger {
  width: 24px;
  height: 18px;
  position: relative;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background-color: black;
  transition: all 0.3s ease;
  transform-origin: center;
}

.hamburger.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* Mobile Dropdown */
.mobile-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 200px;
  background-color: white;
  border: 1px solid black;
  z-index: 50;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.mobile-group-label {
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.mobile-menu-item {
  color: black;
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.mobile-menu-item:hover {
  background-color: #faf5ff;
}

.mobile-menu-item.active {
  background-color: #faf5ff;
  font-weight: bold;
}
</style>
