import type { Page } from '@playwright/test';

const orgPayload = {
  id: 'org-1',
  name: 'Фонд Промінь',
  slug: 'promin',
  description: 'Допомога військовим і медикам.',
  logoUrl: '',
  isVerified: true,
  website: 'https://example.org',
  memberCount: 8,
  activeCampaignCount: 1,
  totalRaised: 275000,
  teamMembers: [
    { userId: 'u1', firstName: 'Ірина', lastName: 'Коваль', avatarUrl: '' },
    { userId: 'u2', firstName: 'Тарас', lastName: 'Мельник', avatarUrl: '' },
  ],
};

const campaignPayload = {
  id: 'camp-1',
  titleUk: 'Тепловізори для евакуаційної бригади',
  titleEn: 'Thermal imagers for evacuation crew',
  description: 'Збираємо на 3 тепловізори для екіпажів.',
  coverImageUrl: 'https://cdn.example.com/campaign-cover.png',
  sendUrl: 'https://send.monobank.ua/jar/mock',
  goalAmount: 300000,
  currentAmount: 180000,
  documentedAmount: 144000,
  documentationPercent: 48,
  status: 1,
  startDate: null,
  deadline: null,
  progressPercentage: 60,
  daysRemaining: 12,
  organizationId: 'org-1',
  organizationName: 'Фонд Промінь',
  organizationSlug: 'promin',
  categories: [
    {
      id: 'cat-thermal',
      nameUk: 'Тепловізори',
      nameEn: 'Thermal',
      slug: 'thermal',
    },
  ],
  latestReceipts: [
    { id: 'r1', merchantName: 'Епіцентр', totalAmount: 54000, transactionDate: '2026-03-20T00:00:00Z', addedByName: 'Ірина Коваль' },
  ],
  posts: [
    {
      id: 'post-1',
      postContentJson: JSON.stringify({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Оновлення по закупівлі для тестування галереї' }] },
        ],
      }),
      createdAt: '2026-03-21T10:00:00Z',
      images: [
        {
          id: 'post-1-img-1',
          imageUrl: 'https://cdn.example.com/post-1-image-1.png',
          originalFileName: 'post-1-image-1.png',
          sortOrder: 0,
        },
        {
          id: 'post-1-img-2',
          imageUrl: 'https://cdn.example.com/post-1-image-2.png',
          originalFileName: 'post-1-image-2.png',
          sortOrder: 1,
        },
        {
          id: 'post-1-img-3',
          imageUrl: 'https://cdn.example.com/post-1-image-3.png',
          originalFileName: 'post-1-image-3.png',
          sortOrder: 2,
        },
      ],
    },
  ],
};

const campaignListItem = {
  id: campaignPayload.id,
  titleUk: campaignPayload.titleUk,
  titleEn: campaignPayload.titleEn,
  description: campaignPayload.description,
  coverImageUrl: campaignPayload.coverImageUrl,
  sendUrl: campaignPayload.sendUrl,
  goalAmount: campaignPayload.goalAmount,
  currentAmount: campaignPayload.currentAmount,
  documentedAmount: campaignPayload.documentedAmount,
  documentationPercent: campaignPayload.documentationPercent,
  status: 1,
  startDate: null,
  deadline: null,
  receiptCount: 1,
  organizationName: orgPayload.name,
  organizationSlug: orgPayload.slug,
  organizationVerified: true,
  categories: campaignPayload.categories,
};

const campaignCategoriesPayload = [
  {
    id: 'cat-thermal',
    nameUk: 'Тепловізори',
    nameEn: 'Thermal',
    slug: 'thermal',
  },
  {
    id: 'cat-medicine',
    nameUk: 'Медицина',
    nameEn: 'Medicine',
    slug: 'medicine',
  },
];

const receiptsPayload = {
  items: [
    { id: 'r1', merchantName: 'Епіцентр', totalAmount: 54000, transactionDate: '2026-03-20T00:00:00Z', addedByName: 'Ірина Коваль' },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
};

const receiptDetailPayload = {
  id: 'r1',
  merchantName: 'Епіцентр',
  totalAmount: 54000,
  transactionDate: '2026-03-20T00:00:00Z',
  status: 'Verified',
  imageUrl: 'https://cdn.example.com/receipt-r1.png',
  structuredOutputJson: JSON.stringify({
    fiscalNumber: 'FN-123456',
    receiptCode: 'RC-123456',
    items: [
      { name: 'Тепловізійний модуль', quantity: 1, price: 54000 },
    ],
  }),
  items: [
    {
      id: 'ri-1',
      name: 'Тепловізійний модуль',
      quantity: 1,
      unitPrice: 54000,
      totalPrice: 54000,
      barcode: '482000000001',
      vatRate: 20,
      vatAmount: 9000,
      sortOrder: 0,
    },
  ],
  itemPhotos: [
    {
      id: 'rip-1',
      receiptItemId: 'ri-1',
      originalFileName: 'thermal-module.jpg',
      photoUrl: 'https://cdn.example.com/item-photo-r1.jpg',
      sortOrder: 0,
    },
  ],
  addedByName: 'Ірина Коваль',
  campaignId: 'camp-1',
  campaignTitle: 'Тепловізори для евакуаційної бригади',
  organizationName: 'Фонд Промінь',
  organizationSlug: 'promin',
};

export async function setupPublicPagesMocks(page: Page): Promise<void> {
  await page.route('**/api/public/organizations?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [orgPayload],
        page: 1,
        pageSize: 12,
        totalCount: 1,
      }),
    });
  });

  await page.route('**/api/public/organizations/promin', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orgPayload) });
  });

  await page.route('**/api/public/campaigns/search?**', async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const categorySlug = (url.searchParams.get('categorySlug') ?? '').toLowerCase();
    const status = url.searchParams.get('status');
    const verifiedOnly = url.searchParams.get('verifiedOnly');
    const matchesSearch = !query
      || campaignListItem.titleUk.toLowerCase().includes(query)
      || campaignListItem.titleEn.toLowerCase().includes(query)
      || (campaignListItem.description?.toLowerCase().includes(query) ?? false)
      || campaignListItem.organizationName.toLowerCase().includes(query);
    const matchesCategory = !categorySlug
      || campaignListItem.categories.some((category) => category.slug === categorySlug);
    const matchesStatus = !status || status === String(campaignListItem.status);
    const matchesVerified = verifiedOnly !== 'true' || campaignListItem.organizationVerified;
    const items = matchesSearch && matchesCategory && matchesStatus && matchesVerified ? [campaignListItem] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items,
        page: 1,
        pageSize: 24,
        totalCount: items.length,
      }),
    });
  });

  await page.route('**/api/public/campaign-categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(campaignCategoriesPayload),
    });
  });

  await page.route('**/api/public/organizations/promin/campaigns**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [campaignListItem],
        page: 1,
        pageSize: 12,
        totalCount: 1,
      }),
    });
  });

  await page.route('**/api/public/organizations/promin/transparency', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalSpent: 188000,
        categories: [
          { name: 'Електроніка', amount: 120000, percentage: 64 },
          { name: 'Логістика', amount: 68000, percentage: 36 },
        ],
        monthlySpendings: [
          { month: '2026-02', amount: 88000 },
          { month: '2026-03', amount: 100000 },
        ],
        receiptCount: 12,
        verifiedReceiptCount: 12,
      }),
    });
  });

  await page.route('**/api/public/campaigns/camp-1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(campaignPayload) });
  });

  await page.route('**/api/public/campaigns/camp-1/receipts**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(receiptsPayload) });
  });

  await page.route('**/api/public/receipts/r1', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(receiptDetailPayload) });
  });
}
