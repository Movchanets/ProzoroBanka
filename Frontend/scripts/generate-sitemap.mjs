import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const outputFile = path.join(publicDir, "sitemap-public-pages.xml");

const apiBaseUrl = process.env.SITEMAP_API_URL || process.env.VITE_API_URL;
const siteBaseUrl = (
  process.env.SITEMAP_SITE_URL || "https://prozorobanka.pp.ua"
).replace(/\/$/, "");

if (!apiBaseUrl) {
  console.error(
    "SITEMAP_API_URL or VITE_API_URL is required to generate dynamic sitemap.",
  );
  process.exit(1);
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function apiGet(relativePath) {
  const response = await fetch(`${apiBaseUrl}${relativePath}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${relativePath} (${response.status})`);
  }

  return response.json();
}

async function getAllOrganizations() {
  const pageSize = 100;
  const firstPage = await apiGet(
    `/api/public/organizations?page=1&pageSize=${pageSize}`,
  );

  const items = [...(firstPage.items ?? [])];
  const totalCount = Number(firstPage.totalCount ?? items.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  for (let page = 2; page <= totalPages; page += 1) {
    const pageResult = await apiGet(
      `/api/public/organizations?page=${page}&pageSize=${pageSize}`,
    );
    items.push(...(pageResult.items ?? []));
  }

  return items;
}

async function getOrganizationCampaigns(slug) {
  const pageSize = 100;
  const firstPage = await apiGet(
    `/api/public/organizations/${encodeURIComponent(slug)}/campaigns?page=1&pageSize=${pageSize}`,
  );

  const items = [...(firstPage.items ?? [])];
  const totalCount = Number(firstPage.totalCount ?? items.length);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  for (let page = 2; page <= totalPages; page += 1) {
    const pageResult = await apiGet(
      `/api/public/organizations/${encodeURIComponent(slug)}/campaigns?page=${page}&pageSize=${pageSize}`,
    );
    items.push(...(pageResult.items ?? []));
  }

  return items;
}

function buildSitemapXml(paths) {
  const uniquePaths = Array.from(new Set(paths)).sort();
  const today = new Date().toISOString().slice(0, 10);

  const urls = uniquePaths
    .map((itemPath) => {
      const absoluteUrl = `${siteBaseUrl}${itemPath.startsWith("/") ? itemPath : `/${itemPath}`}`;
      return `  <url>\n    <loc>${escapeXml(absoluteUrl)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const organizations = await getAllOrganizations();

  const paths = [];
  for (const organization of organizations) {
    if (!organization?.slug) {
      continue;
    }

    paths.push(`/o/${organization.slug}`);

    const campaigns = await getOrganizationCampaigns(organization.slug);
    for (const campaign of campaigns) {
      if (campaign?.id) {
        paths.push(`/c/${campaign.id}`);
      }
    }
  }

  const xml = buildSitemapXml(paths);
  await writeFile(outputFile, xml, "utf8");
  console.log(
    `Generated sitemap with ${new Set(paths).size} dynamic public URLs: ${outputFile}`,
  );
}

main().catch((error) => {
  console.error("Failed to generate dynamic sitemap:", error.message);
  process.exit(1);
});
