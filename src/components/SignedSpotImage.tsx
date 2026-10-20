import { useEffect, useRef, useState } from 'react';
import { createPublicSpotImageUrl } from '../lib/supabase';

interface SignedSpotImageProps {
  imagePath?: string | null;
  imageUrl?: string | null;
  alt: string;
  className: string;
  onUnavailable?: (message: string) => void;
}

export function SignedSpotImage({
  imagePath,
  imageUrl,
  alt,
  className,
  onUnavailable,
}: SignedSpotImageProps) {
  const [src, setSrc] = useState(imageUrl ?? null);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    onUnavailableRef.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    setSrc(imageUrl ?? null);

    if (!imagePath) return;

    try {
      setSrc(createPublicSpotImageUrl(imagePath));
    } catch (error) {
      setSrc(null);
      onUnavailableRef.current?.(
        error instanceof Error ? error.message : 'Invalid public image path.',
      );
    }
  }, [imagePath, imageUrl]);

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        setSrc(null);
        onUnavailableRef.current?.(
          `The public image URL could not be loaded for ${imagePath ?? 'the supplied image URL'}.`,
        );
      }}
    />
  );
}
