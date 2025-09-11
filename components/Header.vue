<template lang="pug">
#header.flex.justify-between.items-center.border-b.border-black.relative
    .logo.px-4.py-2
      h1.text-sm.font-bold OPEN DV
  
    // Desktop Menu
    .desktop-menu.flex.items-center
      .flex
        NuxtLink.border-l.border-black.px-6.py-2(
          v-for="diagram in diagrams" 
          :key="diagram.uid"
          :to="`/${diagram.uid}`"
          class=""
          :class="{ 'bg-purple-50 text-black font-bold': $route.params.uid === diagram.uid }"
        ) {{ diagram.data.title }}
    
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
        NuxtLink.mobile-menu-item.block.px-4.py-3.border-b.border-gray-200(
          v-for="diagram in diagrams" 
          :key="diagram.uid"
          :to="`/${diagram.uid}`"
          @click="closeMobileMenu"
          :class="{ 'active': $route.params.uid === diagram.uid }"
        ) {{ diagram.data.title }}
</template>
  
<script setup>
const { client } = usePrismic()

// ===== REACTIVE STATE =====
const diagrams = ref([])
const isMobileMenuOpen = ref(false)

// ===== LIFECYCLE HOOKS =====
onMounted(async () => {
  await loadDiagrams()
  // Close mobile menu when clicking outside
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// ===== DATA LOADING =====
async function loadDiagrams() {
  try {
    const response = await client.getAllByType('diagram')
    diagrams.value = response
    console.log('Loaded diagrams:', diagrams.value)
  } catch (error) {
    console.error('Error loading diagrams:', error)
  }
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

// Close menu on route change
watch(() => useRoute().path, () => {
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
  border-top: none;
  z-index: 50;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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