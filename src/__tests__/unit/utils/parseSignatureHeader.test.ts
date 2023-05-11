import { expect } from '@loopback/testlab';
import { parseSignatureHeader } from '../../../utils/parseSignatureHeader';

describe('parseSignatureHeader', () => {
  const expectedParsedObject = {
    timestamp: 1683810604,
    value: 'YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=',
  };

  [
    [
      't=1683810604 v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=',
      expectedParsedObject,
    ],
    [
      'v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc= t=1683810604',
      expectedParsedObject,
    ],
    [
      't=1683810604 v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc= v2=8bv1rB6Hz9D4/UFyxbWN7PCci29eB7m7lblUTl+KmwA=',
      expectedParsedObject,
    ],
    [
      '    t=1683810604     v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=   ',
      expectedParsedObject,
    ],
    [
      `
        t=1683810604

        v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=
      `,
      expectedParsedObject,
    ],
  ].forEach(([input, expected], i) => {
    it(`Works #${i + 1}`, () => {
      expect(parseSignatureHeader(input)).to.eql(expected);
    });
  });

  [
    ['', 'No signature header string to parse'],
    [undefined, 'No signature header string to parse'],
    [null, 'No signature header string to parse'],
    ['abc123', 'Malformed signature header'],
    ['t=1683810604 ', 'Malformed signature header'],
    [
      'v1=YVDHA/tG6mDid95MtrBpcc4+RegJ7WpMpQlGQIekcQc=',
      'Malformed signature header',
    ],
  ].forEach(([input, expectedErrorMsg], i) => {
    it(`Throws for invalid input #${i + 1}`, () => {
      expect(() => {
        parseSignatureHeader(input);
      }).to.throw(expectedErrorMsg);
    });
  });
});
