'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';

function WhatsAppIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function ViberIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.162 4.32.535 7.01.463 10.348c-.07 3.339-.154 9.601 5.875 11.27h.005l-.005 2.586s-.038.97.603 1.167c.775.238 1.232-.498 1.974-1.296.406-.44.967-1.083 1.388-1.572 3.829.32 6.771-.414 7.107-.522.773-.25 5.149-.812 5.863-6.616.735-5.979-.358-9.755-2.328-11.47 0 0-1.494-1.545-5.362-1.78a18.98 18.98 0 00-3.18-.113zm.09 1.601c.924-.002 1.714.086 2.41.203 3.271.539 4.482 1.878 4.482 1.878 1.655 1.427 2.59 4.8 1.97 9.886-.6 4.895-4.089 5.197-4.731 5.405-.279.09-2.905.735-6.224.534l-2.198 2.44s-.176.194-.372.246c-.097.026-.303.038-.293-.43v-.012l.012-3.75c-5.11-1.31-4.83-6.614-4.77-9.482.062-2.87.573-5.162 2.07-6.626 1.926-1.75 5.48-1.954 7.644-1.292z"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

const CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/959979333333?text=Hi%20Lion%20Jobs!%20I%20am%20looking%20for%20a%20job.',
    bg: '#25D366',
    icon: WhatsAppIcon,
  },
  {
    id: 'viber',
    label: 'Viber',
    href: 'viber://chat?number=%2B959979333333',
    bg: '#7360F2',
    icon: ViberIcon,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    href: 'https://t.me/+959979333333',
    bg: '#229ED9',
    icon: TelegramIcon,
  },
];

export function SocialFloatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-print fixed bottom-6 right-5 z-50 flex flex-col items-end gap-3 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            key="channels"
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-col items-end gap-2"
          >
            {CHANNELS.map(({ id, label, href, bg, icon: Icon }) => (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 active:opacity-80"
                style={{ backgroundColor: bg }}
              >
                <Icon />
                {label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close contact menu' : 'Contact us on social media'}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30 transition-colors hover:bg-brand-700"
      >
        <motion.div animate={{ rotate: open ? 135 : 0 }} transition={{ duration: 0.2 }}>
          {open ? <X size={22} /> : <MessageSquare size={22} />}
        </motion.div>
      </motion.button>
    </div>
  );
}
