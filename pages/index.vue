<template lang="pug">
#home
	h1 this is the index page
</template>

<script setup>

const { client } = usePrismic()
// get content from 'homepage'
const { data: homepageData } = await useAsyncData("homepage", () =>
	client.getSingle("homepage")
);

</script>

<style lang="sass" scoped>

</style>