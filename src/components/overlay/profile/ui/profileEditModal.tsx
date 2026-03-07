'use client';

import { useMemo, useState, type ComponentType } from 'react';
import Avatar from '@/commons/components/avatar';
import Button from '@/commons/components/button';
import Icon from '@/commons/components/icon';
import { useModal } from '@/commons/providers/modal';
import { generateNickname } from '@/lib/nickname/generateNickname';
import ProfileAvatarEditModal from './profileAvatarEditModal';
import styles from './profileEditModal.module.css';

interface ProfileEditModalProps {
  onClose?: () => void;
  currentNickname: string;
  avatarImagePath: string;
}

const MAX_NICKNAME_LENGTH = 8;

const getCharLength = (value: string) => Array.from(value).length;

export default function ProfileEditModal({
  onClose,
  currentNickname,
  avatarImagePath,
}: ProfileEditModalProps) {
  const { openModal } = useModal();
  const [nickname, setNickname] = useState(currentNickname.trim());
  const [selectedAvatarImagePath, setSelectedAvatarImagePath] =
    useState(avatarImagePath);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedNickname = nickname.trim();
  const nicknameLength = getCharLength(trimmedNickname);
  const isNicknameChanged = trimmedNickname !== currentNickname.trim();
  const isAvatarChanged = selectedAvatarImagePath !== avatarImagePath;
  const isLengthValid =
    nicknameLength > 0 && nicknameLength <= MAX_NICKNAME_LENGTH;
  const canSave =
    (isNicknameChanged || isAvatarChanged) && isLengthValid && !isSaving;

  const helperText = useMemo(() => {
    if (!trimmedNickname) {
      return '닉네임을 입력해 주세요';
    }
    if (nicknameLength > MAX_NICKNAME_LENGTH) {
      return `닉네임은 최대 ${MAX_NICKNAME_LENGTH}자까지 입력할 수 있어요`;
    }
    return `${nicknameLength}/${MAX_NICKNAME_LENGTH}`;
  }, [trimmedNickname, nicknameLength]);

  const handleClose = () => {
    if (isSaving) {
      return;
    }
    onClose?.();
  };

  const handleRandomNickname = () => {
    if (isSaving) {
      return;
    }
    setNickname(generateNickname(MAX_NICKNAME_LENGTH));
  };

  const handleOpenAvatarModal = () => {
    if (isSaving) {
      return;
    }

    openModal({
      component: ProfileAvatarEditModal as unknown as ComponentType<
        Record<string, unknown>
      >,
      componentProps: {
        currentAvatarImagePath: selectedAvatarImagePath,
        onSelectAvatar: (nextAvatarImagePath: string) => {
          setSelectedAvatarImagePath(nextAvatarImagePath);
        },
      },
    });
  };

  const handleSaveProfile = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile/me/nickname', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: trimmedNickname,
          avatarUrl: selectedAvatarImagePath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || '프로필 저장 중 문제가 발생했습니다.'
        );
      }

      onClose?.();
    } catch (error) {
      console.error('프로필 저장 실패:', error);
      alert('프로필 저장 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="프로필 수정 모달 닫기"
      >
        <Icon name="x" size={16} />
      </button>

      <div className={styles.avatarFrame}>
        <button
          type="button"
          className={styles.avatarButton}
          aria-label="프로필 이미지 수정"
          onClick={handleOpenAvatarModal}
        >
          <Avatar
            imageUrl={selectedAvatarImagePath}
            size="L"
            showStatus={false}
          />
          <div className={styles.avatarEditOverlay}>
            <Icon name="pencil" size={32} />
          </div>
        </button>
      </div>

      <div className={styles.formArea}>
        <div className={styles.fieldBlock}>
          <label htmlFor="profile-nickname" className={styles.label}>
            닉네임
          </label>

          <div className={styles.nicknameRow}>
            <input
              id="profile-nickname"
              type="text"
              className={styles.input}
              value={nickname}
              maxLength={MAX_NICKNAME_LENGTH}
              readOnly
              aria-readonly="true"
              disabled={isSaving}
            />

            <button
              type="button"
              className={styles.randomButton}
              onClick={handleRandomNickname}
              disabled={isSaving}
            >
              <Icon name="dice" size={20} />
              <span>랜덤</span>
            </button>
          </div>

          <p className={styles.helperText}>{helperText}</p>
        </div>

        <Button
          variant="primary"
          size="m"
          shape="rectangle"
          onClick={handleSaveProfile}
          disabled={!canSave}
          className={styles.saveButton}
        >
          저장하기
        </Button>
      </div>
    </div>
  );
}
