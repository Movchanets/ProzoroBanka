import { type Page, type Locator } from '@playwright/test';

export class ReceiptPublicPage {
  readonly page: Page;
  readonly receiptPage: Locator;
  readonly image: Locator;
  readonly itemsCard: Locator;
  readonly photosGrid: Locator;
  readonly photoItemDescription: Locator;

  constructor(page: Page) {
    this.page = page;
    this.receiptPage = page.getByTestId('public-receipt-page');
    this.image = page.getByTestId('public-receipt-image');
    this.itemsCard = page.getByTestId('public-receipt-items-card');
    this.photosGrid = page.getByTestId('public-receipt-item-photos-grid');
    this.photoItemDescription = page.getByTestId('public-receipt-item-photo-link-0');
  }

  async goto(id: string) {
    await this.page.goto(`/receipt/${id}`);
  }
}
