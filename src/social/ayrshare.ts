/**
 * Ayrshare API Client
 *
 * Unified social posting to Twitter/X, LinkedIn, Instagram, Facebook,
 * TikTok, Threads, Bluesky, and Reddit via a single API key.
 *
 * Docs: https://www.ayrshare.com/docs
 * Setup: After registering at ayrshare.com, get API key from Settings → API Key
 *        Connect social accounts in the Ayrshare dashboard
 */

import axios from "axios";

const BASE_URL = "https://app.ayrshare.com/api";

export interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

export interface PostOptions {
  text: string;
  platforms: string[];       // ["twitter", "linkedin", "instagram", "facebook", "threads", "bluesky"]
  scheduleDate?: Date;       // If omitted, posts immediately
  mediaUrls?: string[];      // Optional image/video URLs
  hashtags?: string[];       // Auto-appended to text
  profileKeys?: string[];    // For sub-account support (Ayrshare Business profiles)
}

class AyrshareClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Post to one or more platforms.
   */
  async post(options: PostOptions): Promise<PostResult[]> {
    const text = options.hashtags
      ? `${options.text}\n\n${options.hashtags.join(" ")}`
      : options.text;

    const body: Record<string, any> = {
      post: text,
      platforms: options.platforms,
    };

    if (options.scheduleDate) {
      body.scheduleDate = options.scheduleDate.toISOString();
    }
    if (options.mediaUrls?.length) {
      body.mediaUrls = options.mediaUrls;
    }
    if (options.profileKeys?.length) {
      body.profileKeys = options.profileKeys;
    }

    try {
      const response = await axios.post(`${BASE_URL}/post`, body, {
        headers: this.headers(),
        timeout: 30_000,
      });

      const data = response.data;

      // Ayrshare returns per-platform results
      return options.platforms.map((platform) => {
        const result = data[platform];
        if (!result) return { platform, success: false, error: "No response for platform" };
        return {
          platform,
          success: result.status === "success",
          postId: result.id,
          url: result.postUrl,
          error: result.errors?.[0]?.message,
        };
      });
    } catch (err: any) {
      console.error("[Ayrshare] Post error:", err.response?.data ?? err.message);
      return options.platforms.map(platform => ({
        platform,
        success: false,
        error: err.response?.data?.message ?? err.message,
      }));
    }
  }

  /**
   * Schedule a post for a future time.
   */
  async schedule(options: PostOptions & { scheduleDate: Date }): Promise<PostResult[]> {
    return this.post(options);
  }

  /**
   * Get analytics for recent posts.
   */
  async getAnalytics(platform: string, id: string) {
    try {
      const response = await axios.get(`${BASE_URL}/analytics/post`, {
        headers: this.headers(),
        params: { id, platforms: [platform] },
        timeout: 10_000,
      });
      return response.data;
    } catch (err: any) {
      console.error("[Ayrshare] Analytics error:", err.message);
      return null;
    }
  }

  /**
   * Create a sub-account profile (Business plan required).
   * Used for promotional sub-accounts.
   */
  async createProfile(title: string, type: string = "profile"): Promise<{ profileKey: string } | null> {
    try {
      const response = await axios.post(`${BASE_URL}/profiles/profile`, {
        title,
        type,
      }, {
        headers: this.headers(),
        timeout: 10_000,
      });
      return { profileKey: response.data.profileKey };
    } catch (err: any) {
      console.error("[Ayrshare] Create profile error:", err.message);
      return null;
    }
  }
}

let _client: AyrshareClient | null = null;

export function getAyrshareClient(): AyrshareClient | null {
  const key = process.env.AYRSHARE_API_KEY;
  if (!key) {
    console.warn("[Ayrshare] AYRSHARE_API_KEY not set");
    return null;
  }
  if (!_client) _client = new AyrshareClient(key);
  return _client;
}

export { AyrshareClient };
