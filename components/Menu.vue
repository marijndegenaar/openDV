<template lang="pug">
#menu-wrap
  #mobile_menu.right-1.fixed.text-sm(v-if="isMobileMenuVisible" @click="toggleMenu") 🍔
  #menu.text-right.md_text-left.fixed.md_relative.right-1(v-if="!isMobileMenuVisible" @click="toggleMenu")
    .menu-items.flex-col.flex.md_block
      nuxt-link.md_mr-8.mb-2(
        v-for="item in menu" 
        :key="item.slug" 
        :to="item.slug"
        @mouseenter="$emit('menuHover', item.slug)"
        @mouseleave="$emit('menuHover', '')"
      ) 
        span {{ item.name }}
</template>
<script setup>
import autoAnimate from "@formkit/auto-animate";
import { ref, onMounted, onBeforeUnmount } from 'vue';

const menu = [
{ name: "GFX Feed", slug: "/graphicdesign" },  
{ name: "Projects", slug: "/projects" },
  // { name: "Exhibitions", slug: "/exhibitions" },
  { name: "About", slug: "/about" },
  
];

//get current route
const route = ref(useRoute().path);
//get slug from route
const slug = ref(route.value.split("/")[1]);

watchEffect(() => {
  //update slug when route changes
  slug.value = useRoute().path.split("/")[1];
});

defineEmits(['menuHover'])

const isMobileMenuVisible = ref(false);

const handleScroll = () => {
  if (window.innerWidth <= 767) { // Check if the screen width is mobile size
    isMobileMenuVisible.value = window.scrollY > 50;
  }
};

const toggleMenu = () => {
  if (window.innerWidth <= 767) {
    isMobileMenuVisible.value = !isMobileMenuVisible.value;
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
<style lang="sass" scoped>
.logo
  font-family: "P"
  // transform: scaleX(.8)
  transform-origin: left
  // letter-spacing: 0.2
  &:hover
    transform: scale(1, .4)
    // transform: scaleY(0.4)

a
    transition: all 200ms ease-in-out

a:hover, .router-link-active, #mobile_menu
  font-variation-settings: "EXPO" -60
  // text-decoration: underline
  // text-decoration-thickness: 1.5px
  // text-underline-offset: 4px

@media (max-width: 767px)
  .menu-items 
    a
      span
          background: #fff
          border-radius: .4em
          padding: 0 0.2em
          

// @media (max-width: 767px)
//   .menu-items 
//     a
//       &::after
//         content: ', '
//       &:last-child::after
//         content: ''
</style>
