<template lang="pug">
#header.px-4.py-4.flex.justify-between.items-center
    .logo
      h1.text-sm.font-bold.text-green-600.tracking-wide OPEN DV
  
    .flex.items-center.space-x-6
      .flex.space-x-4
        NuxtLink(
          v-for="diagram in diagrams" 
          :key="diagram.uid"
          :to="`/${diagram.uid}`"
          class=""
          :class="{ 'bg-green-600.text-white': $route.params.uid === diagram.uid }"
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