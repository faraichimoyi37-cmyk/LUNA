import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd'
import App from './App'
import { useThemeStore } from './store/theme'
import { useI18nStore } from './store/i18n'
import './index.css'

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

function Root() {
  const dark = useThemeStore((state) => state.dark)
  const lang = useI18nStore((state) => state.lang)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.lang = lang
  }, [dark, lang])

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#6C63FF',
          colorInfo: '#00D4FF',
          colorSuccess: '#00E5A8',
          colorWarning: '#FFB020',
          colorError: '#FF4D6D',
          borderRadius: 10,
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        },
        components: {
          Layout: { siderBg: 'transparent', bodyBg: 'transparent', headerBg: 'transparent' },
          Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            itemBorderRadius: 10,
            itemSelectedBg: 'rgba(108, 99, 255, 0.16)',
            itemSelectedColor: '#6C63FF',
          },
          Modal: { borderRadiusLG: 16 },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
)
