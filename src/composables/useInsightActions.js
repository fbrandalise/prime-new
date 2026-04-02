import { ref } from 'vue'

// Estado compartilhado singleton — sidebar escreve, view consome
export const pendingInsightAction = ref(null)

export function triggerInsightAction(action) {
  pendingInsightAction.value = action
}
