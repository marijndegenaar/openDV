<template>
  <SliceSimulator #default="{ slices }">
    <SliceZone :slices="slices" :components="components" />
  </SliceSimulator>
</template>

<script setup lang="ts">
import { SliceSimulator } from "@slicemachine/adapter-nuxt/simulator";

// Empty components object since we're not using slices
const components = {}
</script>
