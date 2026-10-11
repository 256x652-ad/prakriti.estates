import { test, expect } from "@playwright/test";

/**
 * CRITICAL E2E JOURNEY: Long-Term Rental Booking Flow
 * Simulates:
 * 1. User Authentication (Login / Session bootstrap)
 * 2. Map-based Search via URL parameters
 * 3. Selecting a target property
 * 4. Completing the Token Payment via Escrow
 * 5. Verifying the UI reflects the "Locked" status badge
 */
test.describe("Long-Term Rental Booking Flow", () => {
  const TEST_USER = {
    phone: "9876543210",
    otp: "123456",
  };

  test("should complete rental booking from search to token lock", async ({ page }) => {
    // -------------------------------------------------------------
    // Step 1: User Authentication
    // -------------------------------------------------------------
    await page.goto("/auth/signin");

    // Fill phone number and trigger OTP
    const phoneInput = page.locator('input[name="phoneNumber"], input[type="tel"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(TEST_USER.phone);
      await page.click('button:has-text("Send OTP"), button[type="submit"]');

      // Fill OTP verification code
      const otpInput = page.locator('input[name="otp"]');
      await expect(otpInput).toBeVisible();
      await otpInput.fill(TEST_USER.otp);
      await page.click('button:has-text("Verify"), button:has-text("Sign In")');
    }

    // Assert redirected to home or dashboard
    await expect(page).toHaveURL(/\/(dashboard|search|$)/);

    // -------------------------------------------------------------
    // Step 2: Map Search via URL Parameters
    // -------------------------------------------------------------
    // Navigate with geospatial bounding box and property type filters
    const searchUrl = "/search?type=RENT&minPrice=15000&maxPrice=60000&swLng=77.10&swLat=28.40&neLng=77.30&neLat=28.60";
    await page.goto(searchUrl);

    // Ensure listings grid or map rendered
    await page.waitForSelector('[data-testid="property-card"], article, .property-item');
    const propertyCards = page.locator('[data-testid="property-card"], article, a[href^="/property/"]');
    await expect(propertyCards.first()).toBeVisible();

    // -------------------------------------------------------------
    // Step 3: Selecting a Property Listing
    // -------------------------------------------------------------
    const targetPropertyLink = propertyCards.first();
    const propertyTitle = await targetPropertyLink.locator("h2, h3, h1").first().textContent();
    await targetPropertyLink.click();

    // Verify dynamic property page URL loaded
    await expect(page).toHaveURL(/\/property\/[a-zA-Z0-9_-]+/);
    await expect(page.locator("h1")).toBeVisible();

    // Check availability badge initially AVAILABLE
    const statusBadge = page.locator("text=AVAILABLE, text=Available");
    await expect(statusBadge).toBeVisible();

    // -------------------------------------------------------------
    // Step 4: Completing Token Booking & Payment
    // -------------------------------------------------------------
    const bookButton = page.locator('button:has-text("Book with Token"), button:has-text("Lock Property")');
    await expect(bookButton).toBeVisible();
    await bookButton.click();

    // Handle token modal confirmation
    const confirmModal = page.locator('[role="dialog"], .modal-content, [data-testid="token-modal"]');
    if (await confirmModal.isVisible()) {
      // Confirm Token Escrow agreement
      const agreeCheckbox = confirmModal.locator('input[type="checkbox"]');
      if (await agreeCheckbox.isVisible()) {
        await agreeCheckbox.check();
      }
      await confirmModal.locator('button:has-text("Pay Token Deposit"), button:has-text("Confirm Booking")').click();
    }

    // Simulate mock payment gateway completion (e.g. Razorpay modal or redirect)
    // In CI test mode, MockPaymentProvider returns immediate success
    await page.waitForResponse((response) =>
      response.url().includes("/api/") && response.status() === 200
    );

    // -------------------------------------------------------------
    // Step 5: Verify UI Reflects "LOCKED" Status
    // -------------------------------------------------------------
    // Re-verify that page displays the new locked status and disabled booking CTA
    const lockedBadge = page.locator("text=LOCKED, text=[Under Token Lock]");
    await expect(lockedBadge).toBeVisible({ timeout: 10000 });

    // The primary action should now reflect that property is locked in Escrow
    const postBookingCta = page.locator('button:has-text("Book with Token")');
    await expect(postBookingCta).not.toBeAttached();
  });
});
