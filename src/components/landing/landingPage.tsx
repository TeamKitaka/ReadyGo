'use client';

import { HeaderSection } from './ui/header/HeaderSection';
import { HeroSection } from './ui/hero/HeroSection';
import { ServiceSection } from './ui/service/ServiceSection';
import { FeaturesSection } from './ui/features/FeaturesSection';
import { MoreSection } from './ui/more/MoreSection';
import { FooterSection } from './ui/footer/FooterSection';
import { useLandingSections } from './hooks/useLandingSections';
import styles from './styles.module.css';

export const LandingPage = () => {
  const { aboutRef, featuresRef, contactRef, scrollTo } = useLandingSections();

  return (
    <div className={styles.page}>
      <HeaderSection onNavClick={scrollTo} />

      <main className={styles.main}>
        <HeroSection />
        <ServiceSection sectionRef={aboutRef} />
        <FeaturesSection sectionRef={featuresRef} />
        <MoreSection sectionRef={contactRef} />
      </main>

      <FooterSection />
    </div>
  );
};
