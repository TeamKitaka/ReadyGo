'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Result from './ui/result/result';
import { AnimalType } from '@/commons/constants/animal';
import { RadarChartData } from '@/commons/components/radar-chart';
import { URL_PATHS } from '@/commons/constants/url';
import styles from './styles.module.css';

export interface TraitsResultPageProps {
  animalType: AnimalType;
  nickname: string;
  radarData: RadarChartData[];
  mainRole: {
    label: string;
    description: string;
  };
  subRole: {
    label: string;
    description: string;
  };
  matchTypes: string[];
  characteristics: string[];
  isSteamConnected: boolean;
}

export default function TraitsResultPage({
  animalType,
  nickname,
  radarData,
  mainRole,
  subRole,
  matchTypes,
  characteristics,
  isSteamConnected,
}: TraitsResultPageProps) {
  const router = useRouter();

  const handlePrevious = () => {
    router.push(URL_PATHS.TRAITS);
  };

  const handleComplete = () => {
    router.push(URL_PATHS.HOME);
  };

  return (
    <div className={styles.page}>
      <Result
        animalType={animalType}
        nickname={nickname}
        radarData={radarData}
        mainRole={mainRole}
        subRole={subRole}
        matchTypes={matchTypes}
        characteristics={characteristics}
        isSteamConnected={isSteamConnected}
        onPrevious={handlePrevious}
        onComplete={handleComplete}
      />
    </div>
  );
}
