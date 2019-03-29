var index = require('../index.js');

describe('getPullRequests', () => {
  it('should return hello world', () => {
    expect(index.getPullRequests()).toBe('hello world!');
  });
});
