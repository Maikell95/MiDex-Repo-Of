import { useEffect, useState } from 'react';
import { getFormatsForGen, type FormatInfo } from './api/competitive';

// Estado compartido del selector de generación + formato (lista competitiva, speed tiers…).
export function useFormats(defaultGen = 9) {
  const [gen, setGen] = useState(defaultGen);
  const [formats, setFormats] = useState<FormatInfo[]>([]);
  const [format, setFormat] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFormatsForGen(gen).then((fs) => {
      if (cancelled) return;
      setFormats(fs);
      setFormat(fs[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [gen]);

  return { gen, setGen, formats, format, setFormat };
}
