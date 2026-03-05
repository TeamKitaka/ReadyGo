'use client';

import { useRef } from 'react';

type LandingSectionKey = 'about' | 'features' | 'contact';

export const useLandingSections = () => {
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);

  const scrollTo = (section: LandingSectionKey) => {
    const targetMap: Record<LandingSectionKey, React.RefObject<HTMLDivElement>> =
      {
        about: aboutRef,
        features: featuresRef,
        contact: contactRef,
      };

    const ref = targetMap[section];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return {
    aboutRef,
    featuresRef,
    contactRef,
    scrollTo,
  };
};

