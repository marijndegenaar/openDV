<template lang="pug">
#About
  PrismicRichText(:field="aboutData.data.content")
</template>

<script setup>
const { client } = usePrismic();
const route = useRoute();

const { data: aboutData } = await useAsyncData("about", () =>
  client.getSingle("about")
);


</script>
<style lang="sass" scoped>
:deep(p) 
  margin-bottom: 1rem
</style>