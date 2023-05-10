export function parseSignatureHeader(rawHeaderString) {
  if (!rawHeaderString) {
    throw new Error('No signature header string to parse');
  }

  const tokens: Record<string, string> = rawHeaderString
    .split(' ')
    .reduce((accumulator, currentToken) => {
      const [tokenKey, tokenValue] = currentToken.split(/=(.*)/, 2);
      accumulator[tokenKey] = tokenValue;
      return accumulator;
    }, {});

  return {
    value: tokens['v1'],
    timestamp: parseInt(tokens['t']),
  };
}
