'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import { DatePicker } from '@/components/ui/date-picker';
import styles from './styles.module.css';
import Searchbar from '@/commons/components/searchbar';
import Input from '@/commons/components/input';
import Selectbox, { SelectboxItem } from '@/commons/components/selectbox';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import { usePartySubmit } from './hooks/index.submit.hook';
import { useLinkModalClose } from './hooks/index.link.modal.close.hook';

interface PartySubmitProps {
  onClose?: () => void;
  isEdit?: boolean;
  partyId?: number;
  onRefetch?: () => Promise<void>;
}

export default function PartySubmit({
  onClose,
  isEdit = false,
  partyId,
  onRefetch,
}: PartySubmitProps) {
  const { form, onSubmit, isSubmitting, isValid, errors, isLoadingPartyData } =
    usePartySubmit({
      isEdit,
      partyId,
      onRefetch,
    });
  const { control, setValue } = form;
  const { openCancelModal } = useLinkModalClose();
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [isGameOptionsOpen, setIsGameOptionsOpen] = useState(false);
  const [gameList, setGameList] = useState<SelectboxItem[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);
  const gameSearchRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 폼 값 감시
  // watch()를 인자 없이 호출하면 모든 필드를 감시하고 리렌더링을 트리거함
  const watchedValues = form.watch();
  const maxMembers = watchedValues.max_members || 4;
  const voiceChat = watchedValues.voice_chat;
  const description = watchedValues.description || '';

  // game_title이 변경될 때 gameSearchQuery 동기화
  useEffect(() => {
    if (watchedValues.game_title) {
      setGameSearchQuery(watchedValues.game_title);
    }
  }, [watchedValues.game_title]);

  // 게임 목록 조회 함수 (검색어 옵션 포함)
  const fetchGames = async (search?: string) => {
    setIsLoadingGames(true);
    setGameLoadError(null);

    try {
      const url = new URL('/api/steam/games', window.location.origin);
      if (search && search.trim()) {
        url.searchParams.set('search', search.trim());
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || errorData.detail || response.statusText;
        console.error('게임 목록 조회 실패:', errorMessage);

        // 인증 오류인 경우 특별 처리
        if (response.status === 401) {
          setGameLoadError('로그인이 필요합니다.');
        } else {
          setGameLoadError('게임 목록을 불러올 수 없습니다.');
        }

        // 에러 발생 시 빈 배열로 설정하여 UI가 깨지지 않도록 함
        setGameList([]);
        return;
      }

      const result = await response.json();

      // data가 없거나 빈 배열인 경우도 처리
      setGameList(result.data || []);
      setGameLoadError(null); // 성공 시 에러 메시지 초기화
    } catch (error) {
      console.error('게임 목록 조회 중 오류 발생:', error);
      setGameLoadError('게임 목록을 불러오는 중 오류가 발생했습니다.');
      // 에러 발생 시 빈 배열로 설정하여 UI가 깨지지 않도록 함
      setGameList([]);
    } finally {
      setIsLoadingGames(false);
    }
  };

  // 초기 로드 시 전체 게임 목록 가져오기
  useEffect(() => {
    fetchGames();
  }, []);

  // 검색어 변경 시 서버에서 검색 (debounce 적용)
  useEffect(() => {
    // 기존 타이머 클리어
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 검색어가 있을 때만 서버 검색 (초기 로드는 위의 useEffect에서 처리)
    if (gameSearchQuery.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchGames(gameSearchQuery);
      }, 300); // 300ms debounce
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameSearchQuery]);

  // 폼 유효성 확인
  const isFormValid = isValid;

  // 서버에서 이미 필터링된 결과를 사용 (검색어가 없을 때는 전체 목록)
  const filteredGames = gameList;

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        gameSearchRef.current &&
        !gameSearchRef.current.contains(event.target as Node)
      ) {
        setIsGameOptionsOpen(false);
      }
    };

    if (isGameOptionsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isGameOptionsOpen]);

  // 게임 검색어 변경 핸들러 (작성 모드에서만 동작)
  const handleGameSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEdit) {
      return; // 수정 모드에서는 변경 불가
    }
    const { value } = e.target;
    setGameSearchQuery(value);

    // 검색어가 있고 게임 목록이 로드되었을 때만 옵션 표시
    // 서버에서 이미 필터링된 결과를 받으므로 gameList를 그대로 사용
    if (value.length > 0 && !isLoadingGames) {
      setIsGameOptionsOpen(gameList.length > 0);
    } else {
      setIsGameOptionsOpen(false);
    }
  };

  // 게임 선택 핸들러 (작성 모드에서만 동작)
  const handleGameSelect = (game: SelectboxItem) => {
    if (isEdit) {
      return; // 수정 모드에서는 변경 불가
    }
    setValue('game_title', game.value, { shouldValidate: true });
    setGameSearchQuery(game.value);
    setIsGameOptionsOpen(false);
  };

  // 컨트롤 수준 옵션
  const controlLevelOptions: SelectboxItem[] = [
    { id: 'beginner', value: '미숙' },
    { id: 'intermediate', value: '반숙' },
    { id: 'advanced', value: '완숙' },
    { id: 'expert', value: '빡숙' },
    { id: 'master', value: '장인' },
  ];

  // 난이도 옵션
  const difficultyOptions: SelectboxItem[] = [
    { id: 'undefined', value: '미정' },
    { id: 'flexible', value: '유동' },
    { id: 'easy', value: '이지' },
    { id: 'normal', value: '노멀' },
    { id: 'hard', value: '하드' },
    { id: 'hell', value: '지옥' },
  ];

  // 시간 옵션 (30분 간격)
  const timeOptions: SelectboxItem[] = Array.from({ length: 24 }, (_, hour) =>
    Array.from({ length: 2 }, (_, minuteIndex) => {
      const minute = minuteIndex * 30;
      const period = hour < 12 ? '오전' : '오후';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      const timeString = `${period} ${displayHour}:${displayMinute}`;
      const timeId = `${hour.toString().padStart(2, '0')}:${displayMinute}`;
      return { id: timeId, value: timeString };
    })
  ).flat();

  const handlePartyCountDecrease = () => {
    if (maxMembers > 1) {
      setValue('max_members', maxMembers - 1, { shouldValidate: true });
    }
  };

  const handlePartyCountIncrease = () => {
    if (maxMembers < 8) {
      setValue('max_members', maxMembers + 1, { shouldValidate: true });
    }
  };

  const handleVoiceChatToggle = (value: 'required' | 'optional') => {
    const newValue = voiceChat === value ? null : value;
    setValue('voice_chat', newValue, { shouldValidate: true });
  };

  // 날짜 제한: 과거 날짜 선택 차단
  const disabledDate = (date: Date) => {
    return dayjs(date).isBefore(dayjs().startOf('day'));
  };

  return (
    <div className={styles.container} data-testid="party-submit-modal">
      {/* 헤더 영역 */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerText}>
            <h1 className={styles.title} data-testid="party-submit-modal-title">
              {isEdit ? '파티 수정하기' : '새 파티 만들기'}
            </h1>
            <p className={styles.subtitle}>
              {isEdit
                ? '파티 정보를 수정하고 저장하세요'
                : '파티 정보를 입력하고 멤버를 모집하세요'}
            </p>
          </div>
          <button
            className={styles.closeButton}
            type="button"
            onClick={onClose}
            data-testid="party-submit-close-button"
          >
            <Icon name="x" size={24} />
          </button>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className={styles.body} ref={bodyRef}>
        {isLoadingPartyData ? (
          <div className={styles.loadingContainer}>
            <p data-testid="party-submit-loading">
              파티 데이터를 불러오는 중...
            </p>
          </div>
        ) : (
          <>
            {/* 파티 정보 섹션 */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>파티 정보</h2>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  게임
                  <span className={styles.required}>*</span>
                </label>
                {isEdit ? (
                  <Controller
                    name="game_title"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        {...field}
                        label=""
                        size="l"
                        placeholder="게임"
                        readOnly
                        state={fieldState.error ? 'error' : 'Default'}
                        additionalInfo={fieldState.error?.message}
                        data-testid="party-submit-game-title"
                      />
                    )}
                  />
                ) : (
                  <div className={styles.gameSearchWrapper} ref={gameSearchRef}>
                    <Searchbar
                      size="l"
                      icon="right"
                      placeholder="게임 검색"
                      value={gameSearchQuery}
                      onChange={handleGameSearchChange}
                      onFocus={() => {
                        if (
                          gameSearchQuery.length > 0 &&
                          !isLoadingGames &&
                          filteredGames.length > 0
                        ) {
                          setIsGameOptionsOpen(true);
                        }
                      }}
                    />
                    {isGameOptionsOpen && filteredGames.length > 0 && (
                      <div className={styles.gameOptionsGroup}>
                        {filteredGames.map((game) => {
                          const isSelected =
                            watchedValues.game_title === game.value;
                          return (
                            <div
                              key={game.id}
                              className={`${styles.gameOptionItem} ${
                                isSelected ? styles.selected : ''
                              }`}
                              onClick={() => handleGameSelect(game)}
                              role="option"
                              aria-selected={isSelected}
                            >
                              {isSelected && (
                                <span className={styles.checkIcon}>
                                  <Icon name="check" size={20} />
                                </span>
                              )}
                              <span className={styles.gameOptionValue}>
                                {game.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {gameLoadError && (
                      <span className={styles.errorMessage}>
                        {gameLoadError}
                      </span>
                    )}
                    {errors?.game_title && (
                      <span className={styles.errorMessage}>
                        {errors.game_title.message}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <Controller
                  name="party_title"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      label="파티 제목"
                      required
                      size="l"
                      placeholder="파티 제목을 입력해 주세요."
                      state={fieldState.error ? 'error' : 'Default'}
                      additionalInfo={fieldState.error?.message}
                      data-testid="party-submit-party-title"
                    />
                  )}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <div className={styles.formGroup}>
                    <Controller
                      name="start_date"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <label className={styles.label}>
                            시작일
                            <span className={styles.required}>*</span>
                          </label>
                          <DatePicker
                            value={field.value}
                            onChange={(date) => {
                              field.onChange(date);
                            }}
                            disabledDate={disabledDate}
                            state={fieldState.error ? 'error' : 'default'}
                            placeholder="날짜 선택"
                          />
                          {fieldState.error && (
                            <span className={styles.errorMessage}>
                              {fieldState.error.message}
                            </span>
                          )}
                        </>
                      )}
                    />
                  </div>
                </div>
                <div className={styles.col}>
                  <Controller
                    name="start_time"
                    control={control}
                    render={({ field, fieldState }) => {
                      const selectedTimeItem = timeOptions.find(
                        (item) => item.value === field.value
                      );
                      return (
                        <>
                          <Selectbox
                            label="시작시간"
                            size="l"
                            required
                            placeholder="시간 선택"
                            items={timeOptions}
                            selectedId={selectedTimeItem?.id || undefined}
                            onSelect={(item) => {
                              field.onChange(item.value); // value를 저장 ("오전 09:00" 형식)
                            }}
                            onOpen={(isOpen) => {
                              if (isOpen && bodyRef.current) {
                                // body 스크롤을 50% 지점으로 이동
                                const bodyElement = bodyRef.current;
                                const { scrollHeight, clientHeight } =
                                  bodyElement;
                                const scrollTop =
                                  (scrollHeight - clientHeight) * 0.5;
                                bodyElement.scrollTop = scrollTop;
                              }
                            }}
                            state={fieldState.error ? 'error' : 'default'}
                          />
                          {fieldState.error && (
                            <span className={styles.errorMessage}>
                              {fieldState.error.message}
                            </span>
                          )}
                        </>
                      );
                    }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        label="설명"
                        required
                        size="l"
                        placeholder="파티 모집과 관련된 상세 내용을 입력해 주세요."
                        state={fieldState.error ? 'error' : 'Default'}
                        additionalInfo={fieldState.error?.message}
                        data-testid="party-submit-description"
                      />
                      <div className={styles.charCount}>
                        {description.length}/100
                      </div>
                    </>
                  )}
                />
              </div>
            </div>

            {/* 파티 조건 섹션 */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>파티 조건</h2>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  파티 인원
                  <span className={styles.required}>*</span>
                </label>
                <div className={styles.partyCountInput}>
                  <div className={styles.partyCountInputField}>
                    <span className={styles.partyCountLabel}>최대 인원</span>
                    <div className={styles.partyCountControls}>
                      <button
                        type="button"
                        className={styles.countButton}
                        onClick={handlePartyCountDecrease}
                      >
                        <Icon name="minus" size={16} />
                      </button>
                      <span
                        className={styles.countValue}
                        data-testid="party-submit-max-members"
                      >
                        {maxMembers}
                      </span>
                      <button
                        type="button"
                        className={styles.countButton}
                        onClick={handlePartyCountIncrease}
                      >
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.col}>
                  <Controller
                    name="control_level"
                    control={control}
                    render={({ field, fieldState }) => {
                      const selectedItem = controlLevelOptions.find(
                        (item) => item.value === field.value
                      );
                      return (
                        <>
                          <Selectbox
                            size="l"
                            label="컨트롤 수준"
                            required
                            placeholder="옵션 선택"
                            items={controlLevelOptions}
                            selectedId={selectedItem?.id || undefined}
                            onSelect={(item) => {
                              field.onChange(item.value);
                            }}
                            state={fieldState.error ? 'error' : 'default'}
                          />
                          {fieldState.error && (
                            <span className={styles.errorMessage}>
                              {fieldState.error.message}
                            </span>
                          )}
                        </>
                      );
                    }}
                  />
                </div>
                <div className={styles.col}>
                  <Controller
                    name="difficulty"
                    control={control}
                    render={({ field, fieldState }) => {
                      const selectedItem = difficultyOptions.find(
                        (item) => item.value === field.value
                      );
                      return (
                        <>
                          <Selectbox
                            size="l"
                            label="난이도"
                            required
                            placeholder="난이도 선택"
                            items={difficultyOptions}
                            selectedId={selectedItem?.id || undefined}
                            onSelect={(item) => {
                              field.onChange(item.value);
                            }}
                            state={fieldState.error ? 'error' : 'default'}
                          />
                          {fieldState.error && (
                            <span className={styles.errorMessage}>
                              {fieldState.error.message}
                            </span>
                          )}
                        </>
                      );
                    }}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>보이스챗 사용</label>
                <div className={styles.voiceChatGroup}>
                  <button
                    type="button"
                    className={`${styles.voiceChatButton} ${
                      voiceChat === 'required' ? styles.active : ''
                    }`}
                    onClick={() => handleVoiceChatToggle('required')}
                  >
                    필수 사용
                  </button>
                  <button
                    type="button"
                    className={`${styles.voiceChatButton} ${
                      voiceChat === 'optional' ? styles.active : ''
                    }`}
                    onClick={() => handleVoiceChatToggle('optional')}
                  >
                    선택적 사용
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <Controller
                  name="tags"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      label="태그"
                      size="l"
                      placeholder="#태그 입력"
                      state={fieldState.error ? 'error' : 'Default'}
                      additionalInfo={fieldState.error?.message}
                    />
                  )}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      <div className={styles.footer}>
        <Button
          variant="secondary"
          shape="rectangle"
          className={styles.cancelButton}
          onClick={openCancelModal}
        >
          취소
        </Button>
        <Button
          variant="primary"
          shape="rectangle"
          className={styles.submitButton}
          onClick={onSubmit}
          disabled={!isFormValid || isSubmitting}
          data-testid="party-submit-button"
        >
          {isEdit ? '수정하기' : '파티 만들기'}
        </Button>
      </div>
    </div>
  );
}
