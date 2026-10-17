'use client';

import { useEffect, useState } from 'react';
import type { CurrentLotResponse } from '@/app/api/lots/current/route';
import { DEFAULT_LOT, LotLabels } from '@/lib/lots/labels';

export type { LotLabels };

export function useCurrentLot(): LotLabels {
  const [lot, setLot] = useState<LotLabels>(DEFAULT_LOT);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/lots/current')
      .then((res) => res.json() as Promise<CurrentLotResponse>)
      .then((json) => {
        if (!cancelled && json.success && json.data) setLot(json.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return lot;
}
