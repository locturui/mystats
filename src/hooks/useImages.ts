'use client';

import { useState, useEffect } from 'react';

export function useImages(keys: string[]): Map<string, string> {
  const [images, setImages] = useState(new Map<string, string>());
  const keyStr = keys.join(',');

  useEffect(() => {
    if (!keyStr) return;
    fetch(`/api/images?keys=${encodeURIComponent(keyStr)}`)
      .then((r) => r.json())
      .then((data: Record<string, string | null>) => {
        const map = new Map<string, string>();
        for (const [key, url] of Object.entries(data)) {
          if (url) map.set(key, url);
        }
        setImages(map);
      })
      .catch(() => {});
  }, [keyStr]);

  return images;
}
