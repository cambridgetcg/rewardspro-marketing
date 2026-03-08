/**
 * Shopify Partner API — App Install Metrics
 *
 * Fetches real install count for Rewards Pro from the Shopify Partner GraphQL API.
 * Used as the primary feedback signal for wave advancement.
 *
 * Setup: Generate a Partner API token at partners.shopify.com → Settings → Partner API
 */

import axios from "axios";

// Partner API endpoint: https://partners.shopify.com/{org-id}/api/{version}/graphql.json
// Available fields on App: apiKey, events, id, name
// Install events are type RELATIONSHIP_INSTALLED; uninstalls are RELATIONSHIP_UNINSTALLED
const PARTNER_API_URL = `https://partners.shopify.com/${process.env.SHOPIFY_PARTNER_ORG_ID}/api/2026-01/graphql.json`;
const APP_GID = `gid://partners/App/${process.env.SHOPIFY_APP_ID}`;

export interface InstallMetrics {
  totalInstalls: number;
  activeInstalls: number;
  installVelocity: number;   // installs in the last 7 days
  uninstalls: number;
  fetchedAt: string;
}

// Fetch all install + uninstall events; derive counts from event history
const APP_EVENTS_QUERY = `
  query AppEvents($appId: ID!) {
    app(id: $appId) {
      name
      installs: events(types: [RELATIONSHIP_INSTALLED]) {
        edges { node { type occurredAt shop { myshopifyDomain } } }
      }
      uninstalls: events(types: [RELATIONSHIP_UNINSTALLED]) {
        edges { node { type occurredAt shop { myshopifyDomain } } }
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

  try {
    const response = await axios.post(
      PARTNER_API_URL,
      { query: APP_EVENTS_QUERY, variables: { appId: APP_GID } },
      {
        headers: {
          "X-Shopify-Access-Token": token,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );

    const app = response.data?.data?.app;
    if (!app) {
      console.error("[Metrics] Unexpected response:", JSON.stringify(response.data));
      return null;
    }

    const installEdges: any[] = app.installs?.edges ?? [];
    const uninstallEdges: any[] = app.uninstalls?.edges ?? [];

    const totalInstalls = installEdges.length;
    const totalUninstalls = uninstallEdges.length;

    // Active = installed shops minus those that later uninstalled
    const installedShops = new Set(installEdges.map((e: any) => e.node.shop.myshopifyDomain));
    const uninstalledShops = new Set(uninstallEdges.map((e: any) => e.node.shop.myshopifyDomain));
    const activeInstalls = [...installedShops].filter(s => !uninstalledShops.has(s)).length;

    // Velocity: installs in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const installVelocity = installEdges.filter(
      (e: any) => new Date(e.node.occurredAt) > weekAgo
    ).length;

    return {
      totalInstalls,
      activeInstalls,
      installVelocity,
      uninstalls: totalUninstalls,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[Metrics] Shopify Partner API error:", err.message);
    return null;
  }
}
