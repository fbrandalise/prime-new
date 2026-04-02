import { ref, watch } from 'vue'

const STORAGE_KEY = 'bling_gmail_auth_v1'
const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}

// Singleton module state
const stored   = load()
const clientId = ref(stored.clientId  || '')
const token    = ref(stored.token     || null)
const userEmail= ref(stored.userEmail || null)

watch([clientId, token, userEmail], () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    clientId: clientId.value,
    token: token.value,
    userEmail: userEmail.value,
  }))
})

export function useGmailAuth() {
  const connecting   = ref(false)
  const connectError = ref(null)

  // ── OAuth2 implicit flow via popup ─────────────────────────────────────────
  async function connect() {
    if (!clientId.value?.trim()) {
      connectError.value = 'Informe o Client ID do Google antes de conectar.'
      return
    }
    connectError.value = null
    connecting.value   = true

    const redirectUri = window.location.origin + '/oauth-callback.html'
    const params = new URLSearchParams({
      client_id:     clientId.value.trim(),
      redirect_uri:  redirectUri,
      response_type: 'token',
      scope:         SCOPES,
      prompt:        'select_account',
    })

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'gmail-auth',
      'width=520,height=640,scrollbars=yes,resizable=yes'
    )

    await new Promise((resolve) => {
      let settled = false

      function cleanup() {
        window.removeEventListener('message', onMsg)
        window.removeEventListener('focus',   onFocus)
      }

      function settle(fn) {
        if (settled) return
        settled = true
        cleanup()
        fn()
        connecting.value = false
        resolve()
      }

      function onMsg(e) {
        if (e.origin !== window.location.origin) return
        if (e.data?.type === 'gmail-oauth-token') {
          const t = e.data.token
          token.value = t
          fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
            headers: { Authorization: `Bearer ${t}` },
          })
            .then(r => r.json())
            .then(info => { userEmail.value = info.email || null })
            .catch(() => {})
            .finally(() => settle(() => {}))
        } else if (e.data?.type === 'gmail-oauth-error') {
          const msg = e.data.error
          settle(() => {
            if (msg && msg !== 'cancelled') connectError.value = `Erro: ${msg}`
          })
        }
      }

      // Quando o popup fecha, o foco volta à janela principal.
      // Aguarda 600ms para dar tempo ao postMessage chegar antes de declarar cancelamento.
      function onFocus() {
        setTimeout(() => {
          settle(() => {
            if (!token.value) connectError.value = 'Autenticação cancelada.'
          })
        }, 600)
      }

      window.addEventListener('message', onMsg)
      window.addEventListener('focus',   onFocus)
    })
  }

  function disconnect() {
    token.value     = null
    userEmail.value = null
  }

  // ── Envio via Gmail API ────────────────────────────────────────────────────
  async function sendEmail({ to, subject, body, from }) {
    if (!token.value) throw new Error('Gmail não conectado. Conecte sua conta na configuração do nó de e-mail.')
    if (!to)          throw new Error('Destinatário não informado.')

    // Monta RFC 2822 com suporte a UTF-8
    const lines = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject || '(sem assunto)')))}?=`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body || '',
    ]
    const raw = lines.join('\r\n')

    // Base64url encode
    const encoded = btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.value}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      if (err?.error?.code === 401) {
        token.value     = null
        userEmail.value = null
        throw new Error('Token expirado. Reconecte o Gmail.')
      }
      throw new Error(err?.error?.message || `Gmail API error ${resp.status}`)
    }

    return resp.json()
  }

  return {
    clientId,
    token,
    userEmail,
    connecting,
    connectError,
    connect,
    disconnect,
    sendEmail,
  }
}
