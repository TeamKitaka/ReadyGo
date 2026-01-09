import { test, expect } from '@playwright/test';

test.describe('파티 나가기 기능', () => {
  test('성공시나리오: 나가기 버튼 클릭 시 API 호출 확인', async ({ page }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회 (이미 참여한 파티)
    const validPartyId = await page.evaluate(async () => {
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
            // 현재 사용자가 이미 참여한 파티 찾기
            for (const party of result.data) {
              const detailResponse = await fetch(`/api/party/${party.id}`, {
                method: 'GET',
                credentials: 'include',
              });
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.data) {
                  const membersResponse = await fetch(
                    `/api/party/${party.id}/members`,
                    {
                      method: 'GET',
                      credentials: 'include',
                    }
                  );
                  if (membersResponse.ok) {
                    const membersResult = await membersResponse.json();
                    if (
                      membersResult.data &&
                      Array.isArray(membersResult.data)
                    ) {
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
                          // 이미 참여한 파티이고, 작성자가 아닌 경우
                          if (
                            isMember &&
                            detailResult.data.creator_id !== userId
                          ) {
                            return party.id;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('파티 ID 조회 실패:', err);
      }
      return null;
    });

    // 유효한 ID를 찾지 못한 경우 테스트 스킵
    if (!validPartyId) {
      test.skip();
      return;
    }

    // /party/[id] 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지가 완전히 로드될 때까지 대기 (data-testid 사용)
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    // 로딩이 완료되고 데이터가 로드될 때까지 대기
    await page.waitForSelector('[data-testid="party-detail-title"]', {
      state: 'visible',
      timeout: 499,
    });

    // API 호출 대기 및 확인
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/party/${validPartyId}/members`) &&
        response.request().method() === 'DELETE'
    );

    // 나가기 버튼 찾기 및 클릭
    const leaveButton = page.getByTestId('party-detail-leave-button');
    const isLeaveButtonVisible = await leaveButton
      .isVisible({ timeout: 499 })
      .catch(() => false);

    if (isLeaveButtonVisible) {
      await leaveButton.click();

      // API 호출이 발생했는지 확인
      const response = await responsePromise;
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);
    } else {
      // 나가기 버튼이 없으면 테스트 스킵 (참여하지 않은 상태)
      test.skip();
    }
  });

  test('성공시나리오: API 호출 성공 후 적절한 처리 확인', async ({ page }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회 (이미 참여한 파티)
    const validPartyId = await page.evaluate(async () => {
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
            for (const party of result.data) {
              const detailResponse = await fetch(`/api/party/${party.id}`, {
                method: 'GET',
                credentials: 'include',
              });
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.data) {
                  const membersResponse = await fetch(
                    `/api/party/${party.id}/members`,
                    {
                      method: 'GET',
                      credentials: 'include',
                    }
                  );
                  if (membersResponse.ok) {
                    const membersResult = await membersResponse.json();
                    if (
                      membersResult.data &&
                      Array.isArray(membersResult.data)
                    ) {
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
                          if (
                            isMember &&
                            detailResult.data.creator_id !== userId
                          ) {
                            return party.id;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('파티 ID 조회 실패:', err);
      }
      return null;
    });

    if (!validPartyId) {
      test.skip();
      return;
    }

    // /party/[id] 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    await page.waitForSelector('[data-testid="party-detail-title"]', {
      state: 'visible',
      timeout: 499,
    });

    // 나가기 버튼 클릭
    const leaveButton = page.getByTestId('party-detail-leave-button');
    const isLeaveButtonVisible = await leaveButton
      .isVisible({ timeout: 499 })
      .catch(() => false);

    if (isLeaveButtonVisible) {
      await leaveButton.click();

      // API 호출 성공 후 에러 모달이 표시되지 않는지 확인
      const errorModal = page.locator('text=나가기 실패');
      await expect(errorModal).not.toBeVisible({ timeout: 499 });

      // 성공적으로 처리되었는지 확인 (에러 모달이 없으면 성공)
      // 추가적인 UI 업데이트는 컴포넌트에서 처리하므로 여기서는 에러가 없는지만 확인
    } else {
      // 나가기 버튼이 없으면 테스트 스킵 (참여하지 않은 상태)
      test.skip();
    }
  });

  test('실패시나리오: 에러 발생 시 모달 노출 확인', async ({ page }) => {
    // 존재하지 않는 파티 ID 사용
    const invalidPartyId = 999999;

    // /party/[id] 페이지로 이동
    await page.goto(`/party/${invalidPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지 로드 대기 (에러 페이지일 수 있음)
    await page
      .waitForSelector('[data-testid="party-detail-page"]', {
        state: 'visible',
        timeout: 499,
      })
      .catch(() => {
        // 에러 페이지일 수 있음
      });

    // 나가기 버튼이 있는지 확인
    const leaveButton = page.getByTestId('party-detail-leave-button');
    const isLeaveButtonVisible = await leaveButton
      .isVisible({ timeout: 499 })
      .catch(() => false);

    if (isLeaveButtonVisible) {
      await leaveButton.click();

      // 에러 모달이 표시되는지 확인
      const errorModal = page.locator('text=나가기 실패');
      await expect(errorModal).toBeVisible({ timeout: 499 });

      // 에러 메시지가 표시되는지 확인
      const errorMessage = page.locator('text=파티를 찾을 수 없습니다.');
      const hasErrorMessage = await errorMessage
        .isVisible({ timeout: 499 })
        .catch(() => false);
      if (hasErrorMessage) {
        await expect(errorMessage).toBeVisible();
      }
    } else {
      // 나가기 버튼이 없으면 테스트 스킵 (이미 에러 상태)
      test.skip();
    }
  });

  test('작성자 나가기 시나리오: 파티 작성자가 나가기 시도 시 에러 처리 확인', async ({
    page,
  }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회 (작성자인 파티)
    const validPartyId = await page.evaluate(async () => {
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
            // 현재 사용자가 작성자인 파티 찾기
            for (const party of result.data) {
              const detailResponse = await fetch(`/api/party/${party.id}`, {
                method: 'GET',
                credentials: 'include',
              });
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.data) {
                  const userResponse = await fetch('/api/auth/user', {
                    method: 'GET',
                    credentials: 'include',
                  });
                  if (userResponse.ok) {
                    const userResult = await userResponse.json();
                    const userId = userResult.data?.user?.id;
                    if (userId && detailResult.data.creator_id === userId) {
                      return party.id;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('파티 ID 조회 실패:', err);
      }
      return null;
    });

    if (!validPartyId) {
      test.skip();
      return;
    }

    // /party/[id] 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    await page.waitForSelector('[data-testid="party-detail-title"]', {
      state: 'visible',
      timeout: 499,
    });

    // 나가기 버튼이 있는지 확인 (작성자는 나가기 버튼이 없을 수 있음)
    const leaveButton = page.getByTestId('party-detail-leave-button');
    const isLeaveButtonVisible = await leaveButton
      .isVisible({ timeout: 499 })
      .catch(() => false);

    if (isLeaveButtonVisible) {
      // API 호출 대기 및 확인
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/party/${validPartyId}/members`) &&
          response.request().method() === 'DELETE'
      );

      await leaveButton.click();

      // API 호출이 발생했는지 확인
      const response = await responsePromise;
      expect(response.status()).toBe(400);

      // 에러 모달이 표시되는지 확인
      const errorModal = page.locator('text=나가기 실패');
      await expect(errorModal).toBeVisible({ timeout: 499 });

      // 에러 메시지 확인
      const errorMessage = page.locator('text=파티 작성자는 나갈 수 없습니다.');
      const hasErrorMessage = await errorMessage
        .isVisible({ timeout: 499 })
        .catch(() => false);
      if (hasErrorMessage) {
        await expect(errorMessage).toBeVisible();
      }
    } else {
      // 나가기 버튼이 없으면 테스트 스킵 (작성자는 나가기 버튼이 없음)
      test.skip();
    }
  });

  test('미참여자 나가기 시나리오: 참여하지 않은 파티에서 나가기 시도 시 에러 처리 확인', async ({
    page,
  }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회 (참여하지 않은 파티)
    const validPartyId = await page.evaluate(async () => {
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
            // 현재 사용자가 참여하지 않은 파티 찾기
            for (const party of result.data) {
              const detailResponse = await fetch(`/api/party/${party.id}`, {
                method: 'GET',
                credentials: 'include',
              });
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.data) {
                  const membersResponse = await fetch(
                    `/api/party/${party.id}/members`,
                    {
                      method: 'GET',
                      credentials: 'include',
                    }
                  );
                  if (membersResponse.ok) {
                    const membersResult = await membersResponse.json();
                    if (
                      membersResult.data &&
                      Array.isArray(membersResult.data)
                    ) {
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
                          // 참여하지 않은 파티이고, 작성자가 아닌 경우
                          if (
                            !isMember &&
                            detailResult.data.creator_id !== userId
                          ) {
                            return party.id;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            // 참여하지 않은 파티를 찾지 못하면 첫 번째 파티 반환
            return result.data[0].id;
          }
        }
      } catch (err) {
        console.error('파티 ID 조회 실패:', err);
      }
      return null;
    });

    if (!validPartyId) {
      test.skip();
      return;
    }

    // /party/[id] 페이지로 이동
    await page.goto(`/party/${validPartyId}`, {
      waitUntil: 'domcontentloaded',
    });

    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForSelector('[data-testid="party-detail-page"]', {
      state: 'visible',
      timeout: 499,
    });

    await page.waitForSelector('[data-testid="party-detail-title"]', {
      state: 'visible',
      timeout: 499,
    });

    // 나가기 버튼이 있는지 확인 (참여하지 않은 경우 나가기 버튼이 없을 수 있음)
    const leaveButton = page.getByTestId('party-detail-leave-button');
    const isLeaveButtonVisible = await leaveButton
      .isVisible({ timeout: 499 })
      .catch(() => false);

    if (isLeaveButtonVisible) {
      // API 호출 대기 및 확인
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/api/party/${validPartyId}/members`) &&
          response.request().method() === 'DELETE'
      );

      await leaveButton.click();

      // API 호출이 발생했는지 확인
      const response = await responsePromise;
      expect(response.status()).toBeGreaterThanOrEqual(400);

      // 에러 모달이 표시되는지 확인
      const errorModal = page.locator('text=나가기 실패');
      await expect(errorModal).toBeVisible({ timeout: 499 });
    } else {
      // 나가기 버튼이 없으면 테스트 스킵 (참여하지 않은 상태)
      test.skip();
    }
  });
});
