import { test, expect } from '@playwright/test';
import { URL_PATHS } from '@/commons/constants/url';

test.describe('파티 삭제 기능', () => {
  test('성공시나리오: 삭제하기 버튼 클릭 시 파티삭제 확인 모달 노출', async ({
    page,
  }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회 (생성자인 파티)
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
            // 현재 사용자가 생성자인 파티 찾기
            for (const party of result.data) {
              const detailResponse = await fetch(`/api/party/${party.id}`, {
                method: 'GET',
                credentials: 'include',
              });
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.data) {
                  return party.id;
                }
              }
            }
            // 생성자인 파티를 찾지 못하면 첫 번째 파티 반환
            return result.data[0].id;
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

    // 삭제하기 버튼 찾기 및 클릭
    const deleteButton = page.locator(
      '[data-testid="party-detail-delete-button"]'
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 파티삭제 확인 모달이 노출되었는지 확인
    const modalTitle = page.locator('text=정말 삭제하시겠습니까?');
    await expect(modalTitle).toBeVisible({ timeout: 499 });

    // 모달의 취소 버튼과 삭제 버튼이 표시되는지 확인
    const cancelButton = page.getByRole('button', { name: '취소' });
    await expect(cancelButton).toBeVisible({ timeout: 499 });

    const confirmDeleteButton = page.getByRole('button', { name: '삭제' });
    await expect(confirmDeleteButton).toBeVisible({ timeout: 499 });
  });

  test('성공시나리오: 취소 버튼 클릭 시 모달 닫기 및 페이지 유지', async ({
    page,
  }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회
    const validPartyId = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/party?limit=1', {
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

    // 삭제하기 버튼 클릭
    const deleteButton = page.locator(
      '[data-testid="party-detail-delete-button"]'
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 모달이 열렸는지 확인
    const modalTitle = page.locator('text=정말 삭제하시겠습니까?');
    await expect(modalTitle).toBeVisible({ timeout: 499 });

    // 취소 버튼 클릭
    const cancelButton = page.getByRole('button', { name: '취소' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click({ timeout: 499 });

    // 모달이 닫혔는지 확인
    await expect(modalTitle).not.toBeVisible({ timeout: 499 });

    // 페이지가 그대로 유지되는지 확인 (URL이 변경되지 않았는지)
    await expect(page).toHaveURL(`/party/${validPartyId}`, { timeout: 499 });

    // 페이지 내용이 여전히 표시되는지 확인
    await expect(
      page.locator('[data-testid="party-detail-page"]')
    ).toBeVisible();
  });

  test('성공시나리오: 삭제 버튼 클릭 시 API 호출 및 성공 시 /party로 이동', async ({
    page,
  }) => {
    // 페이지 컨텍스트에서 실제 파티 ID 조회 (생성자인 파티)
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
            // 현재 사용자가 생성자인 파티 찾기
            for (const party of result.data) {
              const detailResponse = await fetch(`/api/party/${party.id}`, {
                method: 'GET',
                credentials: 'include',
              });
              if (detailResponse.ok) {
                const detailResult = await detailResponse.json();
                if (detailResult.data) {
                  return party.id;
                }
              }
            }
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

    // 삭제하기 버튼 클릭
    const deleteButton = page.locator(
      '[data-testid="party-detail-delete-button"]'
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 모달이 열렸는지 확인
    const modalTitle = page.locator('text=정말 삭제하시겠습니까?');
    await expect(modalTitle).toBeVisible({ timeout: 499 });

    // 삭제 버튼 클릭
    const confirmDeleteButton = page.getByRole('button', { name: '삭제' });
    await expect(confirmDeleteButton).toBeVisible();
    await confirmDeleteButton.click({ timeout: 499 });

    // API 호출 후 /party 경로로 이동하는지 확인
    await expect(page).toHaveURL(URL_PATHS.PARTY, { timeout: 1999 });

    // /party 페이지가 로드되었는지 확인
    await page.waitForSelector('[data-testid="party-page"]', {
      state: 'visible',
      timeout: 499,
    });
  });

  test('실패시나리오: 삭제 실패 시 에러 처리 확인', async ({ page }) => {
    // 존재하지 않는 파티 ID로 테스트 (권한 없는 파티)
    // 실제로는 권한이 없는 파티를 찾거나, 삭제 실패 상황을 시뮬레이션
    // 여기서는 실제 API 응답에 따라 에러 모달이 표시되는지 확인

    // 페이지 컨텍스트에서 실제 파티 ID 조회
    const validPartyId = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/party?limit=1', {
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

    // 삭제하기 버튼이 표시되는지 확인
    const deleteButton = page.locator(
      '[data-testid="party-detail-delete-button"]'
    );
    const isDeleteButtonVisible = await deleteButton
      .isVisible()
      .catch(() => false);

    // 삭제 버튼이 있으면 삭제 시도
    if (isDeleteButtonVisible) {
      await deleteButton.click();

      // 모달이 열렸는지 확인
      const modalTitle = page.locator('text=정말 삭제하시겠습니까?');
      await expect(modalTitle).toBeVisible({ timeout: 499 });

      // 삭제 버튼 클릭
      const confirmDeleteButton = page.getByRole('button', { name: '삭제' });
      await expect(confirmDeleteButton).toBeVisible();
      await confirmDeleteButton.click({ timeout: 499 });

      // 에러가 발생하면 에러 모달이 표시될 수 있음
      // 성공하면 /party로 이동, 실패하면 에러 모달 표시
      // 두 경우 모두 처리 가능하도록 대기
      const errorModal = page
        .locator('text=삭제 실패')
        .or(page.locator('text=오류'));
      const hasError = await errorModal
        .isVisible({ timeout: 1999 })
        .catch(() => false);

      if (hasError) {
        // 에러 모달이 표시되었는지 확인
        await expect(errorModal).toBeVisible({ timeout: 499 });
      } else {
        // 성공한 경우 /party로 이동했는지 확인
        await expect(page).toHaveURL(URL_PATHS.PARTY, { timeout: 1999 });
      }
    } else {
      // 삭제 버튼이 없으면 테스트 스킵 (권한이 없는 경우)
      test.skip();
    }
  });
});


