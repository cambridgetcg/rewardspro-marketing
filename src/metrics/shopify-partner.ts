/**
 * Shopify Partner API — App Install Metrics
 *
 * Fetches real install count for Rewards Pro from the Shopify Partner GraphQL API.
 * Used as the primary feedback signal for wave advancement.
 *
 * Setup: Generate a Partner API token at partners.shopify.com → Settings → Partner API
 */

import axios from "axios";

const PARTNER_API_URL = `https://partners.shopify.com/${process.env.SHOPIFY_PARTNER_ORG_ID}/api/2024-04/graphql.json`;
const APP_GID = `gid://partners/App/${process.env.SHOPIFY_APP_ID}`;

export interface InstallMetrics {
  totalInstalls: number;
  activeInstalls: number;
  installVelocity: number;   // installs in the last 7 days
  uninstalls: number;
  fetchedAt: string;
}

const APP_STATS_QUERY = `
  query AppStats($appId: ID!, $since: DateTime!) {
    app(id: $appId) {
      name
      installations: installs(from: $since) {
        edges {
          node {
            createdAt
          }
        }
      }
    }
  }
`;

/**
 * Fetch install metrics from Shopify Partner API.
 * Returns null if the token is not configured — caller falls back to cached data.
 */
export async function fetchInstallMetrics(): Promise<InstallMetrics | null> {
  const token = process.env.SHOPIFY_PARTNER_TOKEN;
  if (!token) {
    console.warn("[Metrics] SHOPIFY_PARTNER_TOKEN not set — skipping live fetch");
    return null;
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  try {
    const response = await axios.post(
      PARTNER_API_URL,
      {
        query: APP_STATS_QUERY,
        variables: { appId: APP_GID, since: since.toISOString() },
      },
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );

    const data = response.data?.data;
    if (!data?.app) {
      console.error("[Metrics] Unexpected response:", JSON.stringify(response.data));
      return null;
    }

    const recentInstalls = data.app.installations?.edges?.length ?? 0;

    return {
      totalInstalls: 0,        // Partner API only gives windowed data — augment from cache
      activeInstalls: 0,
      installVelocity: recentInstalls,
      uninstalls: 0,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[Metrics] Shopify Partner API error:", err.message);
    return null;
  }
}
