import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as service from '@/services/clientesService'

export const useClientesStore = defineStore('clientes', () => {
  const items   = ref([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      const data = await service.getAll()
      items.value = data
    } finally {
      loading.value = false
    }
  }

  async function create(formData) {
    const payload = {
      nome: formData.nome.trim(),
      cnpj: formData.cnpj?.trim() || null,
    }
    const raw = await service.create(payload)
    items.value.push(raw)
    items.value.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return raw
  }

  return { items, loading, fetchAll, create }
})
