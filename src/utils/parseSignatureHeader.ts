export function parseSignatureHeader(rawHeaderString) {
  if (!rawHeaderString) {
    throw new Error('No signature header string to parse');
  }

  const tokens: Record<string, string> = rawHeaderString
    .split(/[\s\n\r]+/)
    .reduce((accumulator, currentToken) => {
      const [tokenKey, tokenValue] = currentToken.split(/=(.*)/, 2);
      accumulator[tokenKey] = tokenValue;
      return accumulator;
    }, {});

  const timestampTokenValue = tokens['t'];
  const signatureTokenValue = tokens['v1'];

  if (!timestampTokenValue || !signatureTokenValue) {
    throw new Error('Malformed signature header');
  }

  return {
    value: tokens['v1'],
    timestamp: parseInt(tokens['t']),
  };
}
