import { test, expect } from '@playwright/test';

test.describe('Alchemy Bundler 集成测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Alchemy Bundler 选择器功能验证', async ({ page }) => {
    // 验证 Bundler 选择器存在
    await expect(page.locator('h3:has-text("🌐 Bundler 选择")')).toBeVisible();

    // 点击 Alchemy Bundler 选项
    const alchemyOption = page.locator('.bundler-option').nth(1);
    await expect(alchemyOption.locator('.bundler-name')).toContainText('Alchemy Bundler');
    await alchemyOption.click();

    // 验证 Alchemy 被选中
    await expect(alchemyOption).toHaveClass(/selected/);

    // 验证 EntryPoint v0.7 选项变为可用
    const entryPointV07 = page.locator('.entrypoint-option').nth(1);
    await expect(entryPointV07.locator('.entrypoint-name')).toContainText('EntryPoint v0.7');
    await entryPointV07.click();
    await expect(entryPointV07).toHaveClass(/selected/);
  });

  test('Alchemy Bundler 状态显示验证', async ({ page }) => {
    // 切换到 Alchemy Bundler
    const alchemyOption = page.locator('.bundler-option').nth(1);
    await alchemyOption.click();

    // 等待状态更新
    await page.waitForTimeout(1000);

    // 验证 Bundler Status 区域显示正确信息
    const statusSection = page.locator('section.status-section');
    await expect(statusSection.locator('h3')).toContainText('🔧 Bundler Status');

    // 验证显示 Alchemy SDK 类型
    await expect(statusSection).toContainText('Bundler Type');
    await expect(statusSection).toContainText('Alchemy SDK');

    // 验证显示 Alchemy 提供商链接
    await expect(statusSection).toContainText('Provider');
    await expect(statusSection).toContainText('Alchemy Bundler API');
  });

  test('Alchemy Bundler 转账按钮可用性验证', async ({ page }) => {
    // 切换到 Alchemy Bundler
    const alchemyOption = page.locator('.bundler-option').nth(1);
    await alchemyOption.click();

    // 等待服务初始化
    await page.waitForTimeout(2000);

    // 检查转账按钮
    const transferButton = page.locator('button:has-text("Transfer")');
    await expect(transferButton).toBeVisible();

    // 转账按钮应该是可用的（假设有私钥配置）
    const buttonText = await transferButton.textContent();
    console.log('转账按钮文本:', buttonText);

    // 验证按钮没有显示"需要连接 MetaMask"（说明有私钥配置）
    if (buttonText?.includes('需要连接 MetaMask')) {
      console.log('需要 MetaMask 连接或私钥配置');
    } else {
      // 如果有私钥配置，按钮应该可用
      const isDisabled = await transferButton.isDisabled();
      console.log('转账按钮是否禁用:', isDisabled);
    }
  });

  test('EntryPoint 版本动态切换验证', async ({ page }) => {
    // 默认应该是 Rundler + v0.6
    const rundlerOption = page.locator('.bundler-option').first();
    await expect(rundlerOption).toHaveClass(/selected/);

    const entryPointV06 = page.locator('.entrypoint-option').first();
    await expect(entryPointV06).toHaveClass(/selected/);

    // 切换到 Alchemy
    const alchemyOption = page.locator('.bundler-option').nth(1);
    await alchemyOption.click();

    // 验证可以切换到 v0.7
    const entryPointV07 = page.locator('.entrypoint-option').nth(1);
    await entryPointV07.click();
    await expect(entryPointV07).toHaveClass(/selected/);

    // 切换回 Rundler 应该自动回到 v0.6
    await rundlerOption.click();
    await expect(rundlerOption).toHaveClass(/selected/);
    await expect(entryPointV06).toHaveClass(/selected/);
  });

  test('网络切换时 Alchemy 配置保持', async ({ page }) => {
    // 切换到 Alchemy
    const alchemyOption = page.locator('.bundler-option').nth(1);
    await alchemyOption.click();

    // 切换网络
    const networkSelector = page.locator('select[data-testid="network-selector"]');
    await networkSelector.selectOption('opSepolia');
    await expect(networkSelector).toHaveValue('opSepolia');

    // 验证 Alchemy 选择保持
    await expect(alchemyOption).toHaveClass(/selected/);

    // 切换回 Sepolia
    await networkSelector.selectOption('sepolia');
    await expect(networkSelector).toHaveValue('sepolia');

    // Alchemy 选择应该仍然保持
    await expect(alchemyOption).toHaveClass(/selected/);
  });
});