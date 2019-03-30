const { getAllPullRequests, getRepos, parsePullRequests } = require('../index.js');
const nock = require('nock')

let expectedRepoResponse = [{
  name: 'testName',
  fullName: 'testName/testName',
}];

let expectedPRResponse = [{
    title: 'testTitle',
    number: '1',
    state: 'open',
    created_at: '2019-03-29T09:00:00Z',
    updated_at: '2019-03-29T09:00:00Z',
    closed_at: '2019-03-29T09:00:00Z',
    merged_at: '2019-03-29T09:00:00Z',
    foo: 'bar',
  }, {
    title: 'secondTitle',
    number: '2',
    state: 'open',
    created_at: '2019-02-24T09:00:00Z',
    updated_at: '2019-02-24T09:00:00Z',
    closed_at: '2019-02-24T09:00:00Z',
    merged_at: '2019-02-24T09:00:00Z',
    foo: 'baz',
  }, {
    title: 'anotherTitle',
    number: '3',
    state: 'open',
    created_at: '2019-03-28T09:00:00Z',
    updated_at: '2019-03-28T09:00:00Z',
    closed_at: '2019-03-28T09:00:00Z',
    merged_at: '2019-03-28T09:00:00Z',
    foo: 'anotherFoo',
}];

let expectedParsedResponse = [{
  title: 'testTitle',
  number: '1',
  state: 'open',
  createdAt: '2019-03-29T09:00:00Z',
  updatedAt: '2019-03-29T09:00:00Z',
  closedAt: '2019-03-29T09:00:00Z',
  mergedAt: '2019-03-29T09:00:00Z',
}, {
  title: 'secondTitle',
  number: '2',
  state: 'open',
  createdAt: '2019-02-24T09:00:00Z',
  updatedAt: '2019-02-24T09:00:00Z',
  closedAt: '2019-02-24T09:00:00Z',
  mergedAt: '2019-02-24T09:00:00Z',
}, {
  title: 'anotherTitle',
  number: '3',
  state: 'open',
  createdAt: '2019-03-28T09:00:00Z',
  updatedAt: '2019-03-28T09:00:00Z',
  closedAt: '2019-03-28T09:00:00Z',
  mergedAt: '2019-03-28T09:00:00Z',
}];

describe('getRepos', () => {
  beforeEach(() => {
    const org = nock('https://api.github.com/orgs/ramda')
    .get('/repos')
    .reply(200, [{
        name: 'testName',
        full_name: 'testName/testName',
        foo: 'bar',
      }]
    );

    const orgReject = nock('https://api.github.com/orgs/fail')
    .get('/repos')
    .reply(404, {});
  });

  it('should reject on non-2xx status', (done) => {
    getRepos('fail').then(res => {
      expect(res).toBe(404);
      done();
    });
  });

  it('should return an array of repos', (done) => {
    getRepos('ramda').then(res => {
      expect(Object.keys(res[0])).toEqual(['name', 'fullName']);
      done();
    });
  });

  it('should return the expected response', (done) => {
    getRepos('ramda').then(res => {
      expect(res).toEqual(expectedRepoResponse);
      done();
    });
  });
});

describe('getAllPullRequests', () => {
  beforeEach(() => {
    const repo1 = nock('https://api.github.com/repos/ramda/ramda')
    .get('/pulls?state=all')
    .reply(200, [{
        title: 'testTitle',
        number: '1',
        state: 'open',
        created_at: '2019-03-29T09:00:00Z',
        updated_at: '2019-03-29T09:00:00Z',
        closed_at: '2019-03-29T09:00:00Z',
        merged_at: '2019-03-29T09:00:00Z',
        foo: 'bar',
      },{
        title: 'secondTitle',
        number: '2',
        state: 'open',
        created_at: '2019-02-24T09:00:00Z',
        updated_at: '2019-02-24T09:00:00Z',
        closed_at: '2019-02-24T09:00:00Z',
        merged_at: '2019-02-24T09:00:00Z',
        foo: 'baz',
      }]
    );

    const repo2 = nock('https://api.github.com/repos/ramda/ramdangular')
    .get('/pulls?state=all')
    .reply(200, [{
        title: 'anotherTitle',
        number: '3',
        state: 'open',
        created_at: '2019-03-28T09:00:00Z',
        updated_at: '2019-03-28T09:00:00Z',
        closed_at: '2019-03-28T09:00:00Z',
        merged_at: '2019-03-28T09:00:00Z',
        foo: 'anotherFoo',
      }]
    );

    const repoReject = nock('https://api.github.com/repos/fail/fail')
    .get('/pulls?state=all')
    .reply(404, {});
  });

  it('should reject on non-2xx status', (done) => {
    getAllPullRequests([{ fullName: 'fail/fail' }]).then(res => {
      expect(res).toBe(404);
      done();
    })
  });

  it('should return a properly flattened array of PRs', (done) => {
    getAllPullRequests([{ fullName: 'ramda/ramda' }, { fullName: 'ramda/ramdangular' }]).then(res => {
      expect(res).toEqual(expectedPRResponse);
      done();
    });
  });
});

describe('parsePullRequests', () => {
  it('should return an array of PRs simplifed to the pertinent data', () => {
    expect(parsePullRequests(expectedPRResponse)).toEqual(expectedParsedResponse);
  });
});
