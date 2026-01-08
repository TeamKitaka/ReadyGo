'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { URL_PATHS } from '@/commons/constants/url';
import { useModal } from '@/commons/providers/modal';
import { useAuth } from '@/commons/providers/auth/auth.provider';

// Zod 스키마 정의
const signupSchema = z
  .object({
    email: z
      .string()
      .email('올바른 이메일 형식이 아닙니다.')
      .refine((val) => val.includes('@'), {
        message: '이메일에는 @가 포함되어야 합니다.',
      }),
    password: z
      .string()
      .min(8, '비밀번호는 8자리 이상이어야 합니다.')
      .refine(
        (val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val),
        '비밀번호는 영문과 숫자를 포함해야 합니다.'
      ),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export const useSignupForm = () => {
  const router = useRouter();
  const { openModal, closeAllModals } = useModal();
  const { syncSession } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasShownErrorModalRef = useRef(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      passwordConfirm: '',
    },
  });

  const { handleSubmit, formState } = form;
  const { errors, isValid } = formState;

  // watch를 사용하여 폼 값 변경 시 리렌더링 트리거
  // watch()를 인자 없이 호출하면 모든 필드를 감시하고 리렌더링을 트리거함
  const watchedValues = form.watch();

  // 모든 필드가 입력되었는지 확인
  const email = watchedValues.email?.trim() || '';
  const password = watchedValues.password?.trim() || '';
  const passwordConfirm = watchedValues.passwordConfirm?.trim() || '';
  const allFieldsFilled =
    Boolean(email) && Boolean(password) && Boolean(passwordConfirm);

  // zod 검증을 통과하고 모든 필드가 채워져 있어야 버튼 활성화
  // isValid는 zod 스키마 검증을 통과했는지 확인
  const isFormValid = isValid && allFieldsFilled;

  const onSubmit = handleSubmit(async (data) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    hasShownErrorModalRef.current = false;

    try {
      // 1. 회원가입 API 호출 (회원가입 + 프로필 생성 + 세션 설정)
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(signupData.error || '회원가입에 실패했습니다.');
      }

      // 2. 세션 동기화 (회원가입 API에서 세션이 자동으로 설정되었으므로 동기화만 수행)
      await syncSession();

      // 3. 홈 페이지로 직접 이동
      router.push(URL_PATHS.HOME);
    } catch (error) {
      // 에러 모달 표시 (한 번만)
      if (!hasShownErrorModalRef.current) {
        hasShownErrorModalRef.current = true;
        openModal({
          variant: 'single',
          title: '가입실패',
          description:
            error instanceof Error ? error.message : '회원가입에 실패했습니다.',
          confirmText: '확인',
          onConfirm: () => {
            closeAllModals();
          },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return {
    form,
    onSubmit,
    isFormValid,
    isSubmitting,
    errors,
  };
};
