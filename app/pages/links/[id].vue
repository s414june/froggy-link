<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id || ''))
</script>

<template>
  <CollectionView :key="id" :detail-id="id" />
</template>
