
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T extends DefineComponent> = T & DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>>
type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = (T & DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }>)
interface _GlobalComponents {
      'AudioPlayer': typeof import("../components/AudioPlayer.vue")['default']
    'Embla': typeof import("../components/Embla.vue")['default']
    'Footer': typeof import("../components/Footer.vue")['default']
    'Gallery': typeof import("../components/Gallery.vue")['default']
    'GifCloud': typeof import("../components/GifCloud.vue")['default']
    'Header': typeof import("../components/Header.vue")['default']
    'ImageResizer': typeof import("../components/ImageResizer.vue")['default']
    'IndexList': typeof import("../components/IndexList.vue")['default']
    'Menu': typeof import("../components/Menu.vue")['default']
    'RichTextWithAudio': typeof import("../components/RichTextWithAudio.vue")['default']
    'NuxtWelcome': typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
    'NuxtLayout': typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
    'NuxtErrorBoundary': typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary")['default']
    'ClientOnly': typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
    'DevOnly': typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
    'ServerPlaceholder': typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
    'NuxtLink': typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
    'NuxtLoadingIndicator': typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
    'NuxtRouteAnnouncer': typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
    'NuxtImg': typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']
    'NuxtPicture': typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']
    'PrismicEmbed': typeof import("@prismicio/vue")['PrismicEmbed']
    'PrismicImage': typeof import("@prismicio/vue")['PrismicImage']
    'PrismicLink': typeof import("@prismicio/vue")['PrismicLink']
    'PrismicText': typeof import("@prismicio/vue")['PrismicText']
    'PrismicRichText': typeof import("@prismicio/vue")['PrismicRichText']
    'SliceZone': typeof import("@prismicio/vue")['SliceZone']
    'Carousel': typeof import("vue3-carousel/dist/carousel")['Carousel']
    'Slide': typeof import("vue3-carousel/dist/carousel")['Slide']
    'Pagination': typeof import("vue3-carousel/dist/carousel")['Pagination']
    'Navigation': typeof import("vue3-carousel/dist/carousel")['Navigation']
    'NuxtPage': typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
    'NoScript': typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
    'Link': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
    'Base': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
    'Title': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
    'Meta': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
    'Style': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
    'Head': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
    'Html': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
    'Body': typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
    'NuxtIsland': typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
    'NuxtRouteAnnouncer': IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
      'LazyAudioPlayer': LazyComponent<typeof import("../components/AudioPlayer.vue")['default']>
    'LazyEmbla': LazyComponent<typeof import("../components/Embla.vue")['default']>
    'LazyFooter': LazyComponent<typeof import("../components/Footer.vue")['default']>
    'LazyGallery': LazyComponent<typeof import("../components/Gallery.vue")['default']>
    'LazyGifCloud': LazyComponent<typeof import("../components/GifCloud.vue")['default']>
    'LazyHeader': LazyComponent<typeof import("../components/Header.vue")['default']>
    'LazyImageResizer': LazyComponent<typeof import("../components/ImageResizer.vue")['default']>
    'LazyIndexList': LazyComponent<typeof import("../components/IndexList.vue")['default']>
    'LazyMenu': LazyComponent<typeof import("../components/Menu.vue")['default']>
    'LazyRichTextWithAudio': LazyComponent<typeof import("../components/RichTextWithAudio.vue")['default']>
    'LazyNuxtWelcome': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
    'LazyNuxtLayout': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
    'LazyNuxtErrorBoundary': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary")['default']>
    'LazyClientOnly': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
    'LazyDevOnly': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
    'LazyServerPlaceholder': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
    'LazyNuxtLink': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
    'LazyNuxtLoadingIndicator': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
    'LazyNuxtRouteAnnouncer': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
    'LazyNuxtImg': LazyComponent<typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']>
    'LazyNuxtPicture': LazyComponent<typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']>
    'LazyPrismicEmbed': LazyComponent<typeof import("@prismicio/vue")['PrismicEmbed']>
    'LazyPrismicImage': LazyComponent<typeof import("@prismicio/vue")['PrismicImage']>
    'LazyPrismicLink': LazyComponent<typeof import("@prismicio/vue")['PrismicLink']>
    'LazyPrismicText': LazyComponent<typeof import("@prismicio/vue")['PrismicText']>
    'LazyPrismicRichText': LazyComponent<typeof import("@prismicio/vue")['PrismicRichText']>
    'LazySliceZone': LazyComponent<typeof import("@prismicio/vue")['SliceZone']>
    'LazyCarousel': LazyComponent<typeof import("vue3-carousel/dist/carousel")['Carousel']>
    'LazySlide': LazyComponent<typeof import("vue3-carousel/dist/carousel")['Slide']>
    'LazyPagination': LazyComponent<typeof import("vue3-carousel/dist/carousel")['Pagination']>
    'LazyNavigation': LazyComponent<typeof import("vue3-carousel/dist/carousel")['Navigation']>
    'LazyNuxtPage': LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
    'LazyNoScript': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
    'LazyLink': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
    'LazyBase': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
    'LazyTitle': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
    'LazyMeta': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
    'LazyStyle': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
    'LazyHead': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
    'LazyHtml': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
    'LazyBody': LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
    'LazyNuxtIsland': LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
    'LazyNuxtRouteAnnouncer': LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>
}

declare module 'vue' {
  export interface GlobalComponents extends _GlobalComponents { }
}

export const AudioPlayer: typeof import("../components/AudioPlayer.vue")['default']
export const Embla: typeof import("../components/Embla.vue")['default']
export const Footer: typeof import("../components/Footer.vue")['default']
export const Gallery: typeof import("../components/Gallery.vue")['default']
export const GifCloud: typeof import("../components/GifCloud.vue")['default']
export const Header: typeof import("../components/Header.vue")['default']
export const ImageResizer: typeof import("../components/ImageResizer.vue")['default']
export const IndexList: typeof import("../components/IndexList.vue")['default']
export const Menu: typeof import("../components/Menu.vue")['default']
export const RichTextWithAudio: typeof import("../components/RichTextWithAudio.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']
export const NuxtPicture: typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']
export const PrismicEmbed: typeof import("@prismicio/vue")['PrismicEmbed']
export const PrismicImage: typeof import("@prismicio/vue")['PrismicImage']
export const PrismicLink: typeof import("@prismicio/vue")['PrismicLink']
export const PrismicText: typeof import("@prismicio/vue")['PrismicText']
export const PrismicRichText: typeof import("@prismicio/vue")['PrismicRichText']
export const SliceZone: typeof import("@prismicio/vue")['SliceZone']
export const Carousel: typeof import("vue3-carousel/dist/carousel")['Carousel']
export const Slide: typeof import("vue3-carousel/dist/carousel")['Slide']
export const Pagination: typeof import("vue3-carousel/dist/carousel")['Pagination']
export const Navigation: typeof import("vue3-carousel/dist/carousel")['Navigation']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const NuxtRouteAnnouncer: IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyAudioPlayer: LazyComponent<typeof import("../components/AudioPlayer.vue")['default']>
export const LazyEmbla: LazyComponent<typeof import("../components/Embla.vue")['default']>
export const LazyFooter: LazyComponent<typeof import("../components/Footer.vue")['default']>
export const LazyGallery: LazyComponent<typeof import("../components/Gallery.vue")['default']>
export const LazyGifCloud: LazyComponent<typeof import("../components/GifCloud.vue")['default']>
export const LazyHeader: LazyComponent<typeof import("../components/Header.vue")['default']>
export const LazyImageResizer: LazyComponent<typeof import("../components/ImageResizer.vue")['default']>
export const LazyIndexList: LazyComponent<typeof import("../components/IndexList.vue")['default']>
export const LazyMenu: LazyComponent<typeof import("../components/Menu.vue")['default']>
export const LazyRichTextWithAudio: LazyComponent<typeof import("../components/RichTextWithAudio.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtImg.vue")['default']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/@nuxt/image/dist/runtime/components/NuxtPicture.vue")['default']>
export const LazyPrismicEmbed: LazyComponent<typeof import("@prismicio/vue")['PrismicEmbed']>
export const LazyPrismicImage: LazyComponent<typeof import("@prismicio/vue")['PrismicImage']>
export const LazyPrismicLink: LazyComponent<typeof import("@prismicio/vue")['PrismicLink']>
export const LazyPrismicText: LazyComponent<typeof import("@prismicio/vue")['PrismicText']>
export const LazyPrismicRichText: LazyComponent<typeof import("@prismicio/vue")['PrismicRichText']>
export const LazySliceZone: LazyComponent<typeof import("@prismicio/vue")['SliceZone']>
export const LazyCarousel: LazyComponent<typeof import("vue3-carousel/dist/carousel")['Carousel']>
export const LazySlide: LazyComponent<typeof import("vue3-carousel/dist/carousel")['Slide']>
export const LazyPagination: LazyComponent<typeof import("vue3-carousel/dist/carousel")['Pagination']>
export const LazyNavigation: LazyComponent<typeof import("vue3-carousel/dist/carousel")['Navigation']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<IslandComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>>

export const componentNames: string[]
