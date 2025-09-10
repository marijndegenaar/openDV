<template lang="pug">
#header.flex.justify-between.items-center.border-b.border-black
    .logo.px-4.py-2
      h1.text-sm.font-bold OPEN DV
  
    .flex.items-center
      .flex
        NuxtLink.border-l.border-black.px-6.py-2(
          v-for="diagram in diagrams" 
          :key="diagram.uid"
          :to="`/${diagram.uid}`"
          class=""
          :class="{ 'bg-purple-50 text-black font-bold': $route.params.uid === diagram.uid }"
        ) {{ diagram.data.title }}
</template>
  
<script setup>
const { client } = usePrismic()

// ===== REACTIVE STATE =====
const diagrams = ref([])

// ===== LIFECYCLE HOOKS =====
onMounted(async () => {
  await loadDiagrams()
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

</script>

<style scoped>
/* No custom styles needed - using Tailwind */
</style>