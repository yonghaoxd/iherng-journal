'use client';

import { useState } from 'react';
import { Share2, Check, MessageCircle } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  url?: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return url || '';
    return url || window.location.href;
  };

  const handleCopy = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard access (an insecure origin, or permission denied): let the reader copy it.
      window.prompt('Copy this link:', shareUrl);
    }
  };

  const handleWhatsApp = () => {
    const shareUrl = getShareUrl();
    const text = encodeURIComponent(`${title} — ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleTwitter = () => {
    const shareUrl = getShareUrl();
    const text = encodeURIComponent(`Reading: ${title} via @iherng Journal`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="share-bar" aria-label="Share this story">
      <span className="share-label">SHARE STORY</span>
      <div className="share-actions">
        <button
          type="button"
          onClick={handleCopy}
          className="share-btn copy-btn"
          aria-label={copied ? 'Link copied to clipboard' : 'Copy link to article'}
          title={copied ? 'Copied!' : 'Copy Link'}
        >
          {copied ? <Check size={14} className="text-success" /> : <Share2 size={14} />}
          <span>{copied ? 'Copied!' : 'Copy link'}</span>
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="share-btn whatsapp-btn"
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
        >
          <MessageCircle size={14} />
          <span>WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={handleTwitter}
          className="share-btn twitter-btn"
          aria-label="Share on X"
          title="Share on X"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Post</span>
        </button>
      </div>
    </div>
  );
}
