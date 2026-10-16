import { useEffect, useRef, useState } from 'react';
import { createSignedSpotImageUrl } from '../lib/supabase';

interface SignedSpotImageProps {
  imagePath?: string | null;
  imageUrl?: string | null;
  alt: string;
  className: string;
}

export function SignedSpotImage({
  imagePath,
  imageUrl,
  alt,
  className,
}: SignedSpotImageProps) {
  const [src, setSrc] = useState(imageUrl ?? null);
  const retriedRef = useRef(false);

  useEffect(() => {
    setSrc(imageUrl ?? null);
    retriedRef.current = false;
  }, [imagePath, imageUrl]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (!imagePath || retriedRef.current) {
          setSrc(null);
          return;
        }

        retriedRef.current = true;
        void createSignedSpotImageUrl(imagePath)
          .then(setSrc)
          .catch(() => setSrc(null));
      }}
    />
  );
}
