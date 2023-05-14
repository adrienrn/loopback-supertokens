export function sanitizeWebhookEndpoint(endpoint: string) {
  try {
    const parsedUrl = new URL(endpoint);

    return parsedUrl.toString();
  } catch (err) {
    throw new Error(
      `Invalid webhook endpoint, expected valid URL, got "${endpoint}"`,
    );
  }
}
