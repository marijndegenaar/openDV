<template lang="pug">
.page-wrap(v-if="page")
  .page-header.border-b.border-black.px-6.py-8
    h1.text-xl.font-bold {{ page.data.title }}
  .page-content.px-6.py-8.max-w-3xl
    PrismicRichText(:field="page.data.content")
</template>

<script setup>
const route = useRoute()
const { client } = usePrismic()

const { data: page } = await useAsyncData(`page-${route.params.uid}`, () =>
  client.getByUID('page', route.params.uid)
)

useHead({
  title: computed(() => page.value?.data.meta_title || page.value?.data.title || 'OPEN DV'),
  meta: [
    { name: 'description', content: computed(() => page.value?.data.meta_description || '') }
  ]
})
</script>

<style lang="sass" scoped>
.page-content
  :deep(h2)
    font-size: 1.25rem
    font-weight: bold
    margin-top: 2rem
    margin-bottom: 0.75rem

  :deep(p)
    margin-bottom: 1rem
    line-height: 1.6

  :deep(ul), :deep(ol)
    margin-bottom: 1rem
    padding-left: 1.5rem

  :deep(li)
    margin-bottom: 0.25rem

  :deep(a)
    text-decoration: underline
    text-underline-offset: 3px

  :deep(strong)
    font-weight: bold

  :deep(em)
    font-style: italic
</style>
