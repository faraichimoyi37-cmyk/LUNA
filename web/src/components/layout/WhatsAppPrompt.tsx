import { useEffect, useState } from 'react'
import { Button, Modal } from 'antd'
import { ExternalLink, MessageCircle, X } from 'lucide-react'
import { useSiteConfig } from '../../hooks/queries'

const FLAG_KEY = 'wa_prompt_shown'

export default function WhatsAppPrompt() {
  const { data: config } = useSiteConfig()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!config?.whatsappUrl || sessionStorage.getItem(FLAG_KEY)) return
    setOpen(true)
    sessionStorage.setItem(FLAG_KEY, '1')
  }, [config?.whatsappUrl])

  const close = () => setOpen(false)

  return (
    <Modal
      open={open}
      onCancel={close}
      footer={null}
      width={420}
      closable
      closeIcon={<X size={18} />}
      styles={{
        content: { background: 'var(--surface)', borderRadius: 20, padding: '28px 28px 20px' },
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
          <MessageCircle size={30} />
        </div>
        <h2 className="mb-1 text-lg font-bold text-ink">Join our WhatsApp channel</h2>
        <p className="mb-6 text-sm text-ink2">Join our WhatsApp channel for new updates, announcements and exclusive offers.</p>
        <div className="flex w-full flex-col gap-2.5">
          <Button
            type="primary"
            size="large"
            block
            className="brand-gradient border-none font-semibold"
            icon={<ExternalLink size={16} />}
            href={config?.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            Join channel
          </Button>
          <Button size="large" block onClick={close}>
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  )
}
