import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import posthog from 'posthog-js'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'

// Paleta Bling Green — paleta oficial aprovada, base #00F070
const blingGreen = {
  50:  '#EDFFF5',
  100: '#D1FFD1',   // ← Bling Green II (#D1FFD1)
  200: '#9AFFB8',
  300: '#55FF90',
  400: '#1AFF78',
  500: '#00F070',   // ← Bling Green hero (#00F070)
  600: '#00C05A',
  700: '#008F42',
  800: '#006830',
  900: '#00451E',
  950: '#002510',
}

const BlingTheme = definePreset(Aura, {
  primitive: {
    green: blingGreen,
  },
  semantic: {
    primary: blingGreen,
    colorScheme: {
      light: {
        primary: {
          color:        blingGreen[700],
          inverseColor: '#ffffff',
          hoverColor:   blingGreen[600],
          activeColor:  blingGreen[800],
        },
      },
      dark: {
        primary: {
          color:        blingGreen[700],
          inverseColor: '#ffffff',
          hoverColor:   blingGreen[600],
          activeColor:  blingGreen[800],
        },
      },
    },
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(PrimeVue, {
  theme: {
    preset: BlingTheme,
    options: {
      darkModeSelector: '.dark-mode'
    }
  }
})
app.use(ToastService)
app.use(ConfirmationService)
app.directive('tooltip', Tooltip)

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    session_recording: {
      recordCrossOriginIframes: true,
    },
  })
}

app.mount('#app')
