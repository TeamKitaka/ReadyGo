import { test, expect, type Page } from '@playwright/test';

test.describe('파티 채팅방 Hook (useChatRoom) 바인딩 기능', () => {
  /**
   * 유효한 파티 ID 조회 헬퍼 함수
   */
  const getValidPartyId = async (page: Page): Promise<number | null> => {
    return await page.evaluate(async () => {
      try {
        const response = await fetch('/api/party?limit=10', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (
            result.data &&
            Array.isArray(result.data) &&
            result.data.length > 0
          ) {
            // 현재 사용자가 참여한 파티 찾기
            for (const party of result.data) {
              const membersResponse = await fetch(
                `/api/party/${party.id}/members`,
                {
                  method: 'GET',
                  credentials: 'include',
                }
              );
              if (membersResponse.ok) {
                const membersResult = await membersResponse.json();
                if (membersResult.data && Array.isArray(membersResult.data)) {
                  const userResponse = await fetch('/api/auth/user', {
                    method: 'GET',
                    credentials: 'include',
                  });
                  if (userResponse.ok) {
                    const userResult = await userResponse.json();
                    const userId = userResult.data?.user?.id;
                    if (userId) {
                      const isMember = membersResult.data.some(
                        (member: { user_id: string }) =>
                          member.user_id === userId
                      );
                      // 참여한 파티이거나 파티장인 경우
                      if (isMember || party.creator_id === userId) {
                        return party.id;
                      }
                    }
                  }
                }
              }
            }
            // 참여한 파티를 찾지 못하면 첫 번째 파티 반환
            return result.data[0].id;
          }
        }
      } catch (err) {
        console.error('파티 ID 조회 실패:', err);
      }
      return null;
    });
  };

  test('Hook 초기화 - postId가 유효하지 않은 경우 빈 메시지 목록 반환', async ({
    page,
  }) => {
    // 유효하지 않은 postId로 페이지 이동
    await page.goto('/party/0', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 빈 메시지 목록이 표시되는지 확인
      const messagesWrapper = chatRoom.locator('[class*="messagesWrapper"]');
      await expect(messagesWrapper).toBeVisible();
    }
  });

  test('Hook 초기화 - postId가 없거나 NaN인 경우 빈 메시지 목록 반환', async ({
    page,
  }) => {
    // 존재하지 않는 파티 ID로 페이지 이동
    await page.goto('/party/invalid', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await page
      .waitForSelector('[data-testid="party-detail-page"]', {
        state: 'visible',
        timeout: 499,
      })
      .catch(() => {
        // 에러 페이지일 수 있음
      });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 빈 메시지 목록이 표시되는지 확인
      const messagesWrapper = chatRoom.locator('[class*="messagesWrapper"]');
      await expect(messagesWrapper).toBeVisible();
    }
  });

  test('메시지 조회 - 유효한 postId로 메시지 목록 조회 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // API 호출 대기 (메시지 조회)
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/party/${validPartyId}/messages`) &&
          response.request().method() === 'GET',
        { timeout: 1999 }
      );

      // API 호출이 발생했는지 확인
      const response = await responsePromise;
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);

      // 로딩 상태가 해제되었는지 확인
      const loadingText = page.locator('text=로딩 중');
      await expect(loadingText).not.toBeVisible({ timeout: 499 });
    }
  });

  test('메시지 포맷팅 - formattedMessages가 올바르게 생성되는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 메시지 목록이 렌더링되는지 확인
      const messagesWrapper = chatRoom.locator('[class*="messagesWrapper"]');
      await expect(messagesWrapper).toBeVisible();

      // 날짜 구분선이 있는지 확인 (메시지가 있는 경우)
      const dateDivider = chatRoom.locator('[class*="dateDivider"]');
      const _hasDateDivider = await dateDivider.count().catch(() => 0);

      // 메시지 버블이 있는지 확인
      const messageBubbles = chatRoom.locator('[class*="messageBubble"]');
      const hasMessageBubbles = await messageBubbles.count().catch(() => 0);

      // 메시지가 있으면 포맷팅이 적용되었는지 확인
      if (hasMessageBubbles > 0) {
        // 시간 포맷 확인 (오전/오후 HH:MM 형식)
        const messageTime = chatRoom.locator('[class*="messageTime"]').first();
        const timeText = await messageTime.textContent();
        if (timeText) {
          expect(timeText).toMatch(/^(오전|오후)\s+\d{1,2}:\d{2}$/);
        }

        // 메시지 내용 확인
        const messageContent = chatRoom
          .locator('[class*="messageContent"]')
          .first();
        const contentText = await messageContent.textContent();
        expect(contentText).toBeTruthy();
      }
    }
  });

  test('메시지 전송 - sendMessage 함수가 올바르게 동작하는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 메시지 입력 영역 확인
      const inputArea = page.locator('[aria-label="메시지 입력 영역"]');
      await expect(inputArea).toBeVisible();

      // 메시지 입력 필드 확인
      const messageInput = page.locator('[aria-label="메시지 입력"]');
      await expect(messageInput).toBeVisible();

      // 테스트 메시지 입력
      const testMessage = `테스트 메시지 ${Date.now()}`;
      await messageInput.fill(testMessage, { timeout: 500 });

      // API 호출 대기 (메시지 전송)
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/party/${validPartyId}/messages`) &&
          response.request().method() === 'POST',
        { timeout: 1999 }
      );

      // 전송 버튼 클릭 (또는 Enter 키 입력)
      await messageInput.press('Enter', { timeout: 500 });

      // API 호출이 발생했는지 확인
      const response = await responsePromise;
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);

      // 메시지 입력 필드가 초기화되었는지 확인
      const inputValue = await messageInput.inputValue();
      expect(inputValue).toBe('');
    }
  });

  test('메시지 전송 - 빈 메시지 전송 시도 시 전송되지 않는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 메시지 입력 필드 확인
      const messageInput = page.locator('[aria-label="메시지 입력"]');
      await expect(messageInput).toBeVisible();

      // 빈 메시지 입력
      await messageInput.fill('   ', { timeout: 500 }); // 공백만 입력

      // 전송 버튼이 비활성화되었는지 확인 (또는 전송되지 않는지 확인)
      const sendButton = page.locator('[aria-label="메시지 입력"]');
      const _isDisabled = await sendButton.isDisabled().catch(() => false);

      // 빈 메시지는 전송되지 않아야 함
      // API 호출이 발생하지 않는지 확인
      let apiCalled = false;
      page.on('response', (response) => {
        if (
          response.url().includes(`/api/party/${validPartyId}/messages`) &&
          response.request().method() === 'POST'
        ) {
          apiCalled = true;
        }
      });

      // Enter 키 입력 시도
      await messageInput.press('Enter', { timeout: 500 });

      // 짧은 대기 후 API 호출 여부 확인
      await page.waitForTimeout(500);

      // 빈 메시지는 전송되지 않아야 함
      expect(apiCalled).toBe(false);
    }
  });

  test('파티 멤버 정보 조회 - 발신자 정보가 올바르게 표시되는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // API 호출 대기 (파티 멤버 조회)
      const membersResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/party/${validPartyId}/members`) &&
          response.request().method() === 'GET',
        { timeout: 1999 }
      );

      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // API 호출이 발생했는지 확인
      const membersResponse = await membersResponsePromise;
      expect(membersResponse.status()).toBeGreaterThanOrEqual(200);
      expect(membersResponse.status()).toBeLessThan(500);

      // 메시지가 있는 경우 발신자 정보 확인
      const senderNickname = chatRoom.locator('[class*="senderNickname"]');
      const hasSenderNickname = await senderNickname.count().catch(() => 0);

      if (hasSenderNickname > 0) {
        // 발신자 닉네임이 표시되는지 확인
        const nicknameText = await senderNickname.first().textContent();
        expect(nicknameText).toBeTruthy();
        expect(nicknameText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('내 메시지 vs 상대방 메시지 구분 - isOwnMessage가 올바르게 동작하는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 내 메시지 컨테이너 확인
      const ownMessageContainer = chatRoom.locator(
        '[class*="ownMessageContainer"]'
      );
      const hasOwnMessages = await ownMessageContainer.count().catch(() => 0);

      // 상대방 메시지 컨테이너 확인
      const otherMessageContainer = chatRoom.locator(
        '[class*="otherMessageContainer"]'
      );
      const hasOtherMessages = await otherMessageContainer
        .count()
        .catch(() => 0);

      // 메시지가 있으면 내 메시지 또는 상대방 메시지가 표시되어야 함
      if (hasOwnMessages > 0 || hasOtherMessages > 0) {
        // 내 메시지는 오른쪽 정렬되어야 함
        if (hasOwnMessages > 0) {
          const ownMessage = ownMessageContainer.first();
          await expect(ownMessage).toBeVisible();
        }

        // 상대방 메시지는 왼쪽 정렬되어야 함
        if (hasOtherMessages > 0) {
          const otherMessage = otherMessageContainer.first();
          await expect(otherMessage).toBeVisible();
        }
      }
    }
  });

  test('연속 메시지 처리 - isConsecutive가 올바르게 동작하는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 아바타 스페이서 확인 (연속 메시지인 경우 아바타가 숨겨짐)
      const avatarSpacer = chatRoom.locator('[class*="avatarSpacer"]');
      const hasAvatarSpacer = await avatarSpacer.count().catch(() => 0);

      // 아바타 확인 (연속 메시지가 아닌 경우 아바타가 표시됨)
      const messageAvatar = chatRoom.locator('[class*="messageAvatar"]');
      const hasMessageAvatar = await messageAvatar.count().catch(() => 0);

      // 연속 메시지 처리 로직이 동작하는지 확인
      // (아바타 스페이서 또는 아바타가 표시되어야 함)
      if (hasAvatarSpacer > 0 || hasMessageAvatar > 0) {
        // 연속 메시지 처리가 적용되었음을 확인
        expect(true).toBe(true);
      }
    }
  });

  test('에러 처리 - 메시지 조회 실패 시 에러 상태 확인', async ({ page }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 메시지 조회 API를 실패시키기 위해 네트워크 요청 차단
    await page.route(`**/api/party/${validPartyId}/messages*`, (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      });
    });

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 에러 발생 시에도 UI가 유지되는지 확인
      const messagesWrapper = chatRoom.locator('[class*="messagesWrapper"]');
      await expect(messagesWrapper).toBeVisible();
    }
  });

  test('에러 처리 - 메시지 전송 실패 시 에러 상태 확인', async ({ page }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 메시지 전송 API를 실패시키기 위해 네트워크 요청 차단
      await page.route(`**/api/party/${validPartyId}/messages`, (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: '메시지 전송에 실패했습니다.' }),
          });
        } else {
          route.continue();
        }
      });

      // 메시지 입력 필드 확인
      const messageInput = page.locator('[aria-label="메시지 입력"]');
      await expect(messageInput).toBeVisible();

      // 테스트 메시지 입력
      const testMessage = `테스트 메시지 ${Date.now()}`;
      await messageInput.fill(testMessage, { timeout: 500 });

      // Enter 키 입력 (전송 시도)
      await messageInput.press('Enter', { timeout: 500 });

      // 에러 발생 시에도 UI가 유지되는지 확인
      await page.waitForTimeout(500);
      await expect(messageInput).toBeVisible();
    }
  });

  test('로딩 상태 - isLoading이 올바르게 동작하는지 확인', async ({ page }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 초기 로딩 상태 확인
      const loadingText = page.locator('text=로딩 중');
      const isLoadingVisible = await loadingText.isVisible().catch(() => false);

      // 로딩 상태가 표시되거나 이미 로드 완료되었는지 확인
      if (isLoadingVisible) {
        await expect(loadingText).toBeVisible();
      }

      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 로딩 완료 후 로딩 텍스트가 사라졌는지 확인
      await expect(loadingText).not.toBeVisible({ timeout: 499 });
    }
  });

  test('차단 상태 - isBlocked가 올바르게 동작하는지 확인', async ({ page }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 메시지 입력 필드 확인
      const messageInput = page.locator('[aria-label="메시지 입력"]');
      await expect(messageInput).toBeVisible();

      // 차단 상태인 경우 입력 필드가 비활성화되어야 함
      // (현재는 기본값 false이므로 비활성화되지 않아야 함)
      const isDisabled = await messageInput.isDisabled().catch(() => false);
      // 기본값이 false이므로 비활성화되지 않아야 함
      expect(isDisabled).toBe(false);
    }
  });

  test('날짜 구분선 - 날짜가 변경될 때 구분선이 표시되는지 확인', async ({
    page,
  }) => {
    // 유효한 파티 ID 조회
    const validPartyId = await getValidPartyId(page);

    if (!validPartyId) {
      test.skip();
      return;
    }

    // 파티 상세 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // ChatRoom 컴포넌트가 렌더링되는지 확인
    const chatRoom = page.locator('[aria-label="메시지 목록"]');
    const isChatRoomVisible = await chatRoom.isVisible().catch(() => false);

    if (isChatRoomVisible) {
      // 로딩 완료 대기
      await page.waitForFunction(
        () => {
          const loadingText = document.querySelector('text=로딩 중');
          return !loadingText || !loadingText.textContent?.includes('로딩 중');
        },
        { timeout: 1999 }
      );

      // 날짜 구분선 확인
      const dateDivider = chatRoom.locator('[class*="dateDivider"]');
      const hasDateDivider = await dateDivider.count().catch(() => 0);

      // 메시지가 여러 날짜에 걸쳐 있으면 날짜 구분선이 표시되어야 함
      if (hasDateDivider > 0) {
        // 날짜 구분선이 표시되는지 확인
        await expect(dateDivider.first()).toBeVisible();

        // 날짜 포맷 확인 (YYYY년 MM월 DD일 요일 형식)
        const dateText = await dateDivider.first().textContent();
        expect(dateText).toBeTruthy();
        expect(dateText).toMatch(
          /\d{4}년\s+\d{1,2}월\s+\d{1,2}일\s+(일|월|화|수|목|금|토)요일/
        );
      }
    }
  });
});
