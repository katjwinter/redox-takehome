const { getAllPullRequests, getRepos } = require('../index.js');
const nock = require('nock')

let expectedRepoResponse = [{
  name: 'testName',
  fullName: 'testName/testName',
  createdAt: '2019-03-29T08:00:00Z',
  updatedAt: '2019-03-29T09:00:00Z',
}];

let expectedPRResponse = [{
  title: 'testTitle',
}, {
  title: 'secondTitle',
}, {
  title: 'anotherTitle',
}];

describe('getRepos', () => {
  beforeEach(() => {
    const org = nock('https://api.github.com/orgs/ramda')
    .get('/repos')
    .reply(200, [{
        name: 'testName',
        full_name: 'testName/testName',
        created_at: '2019-03-29T08:00:00Z',
        updated_at: '2019-03-29T09:00:00Z',
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
      expect(Object.keys(res[0])).toEqual(['name', 'fullName', 'createdAt', 'updatedAt']);
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
        foo: 'bar',
      },{
        title: 'secondTitle',
        foo: 'baz',
      }]
    );

    const repo2 = nock('https://api.github.com/repos/ramda/ramdangular')
    .get('/pulls?state=all')
    .reply(200, [{
        title: 'anotherTitle',
        foo: 'anotherFoo',
      }]
    );

    const repoReject = nock('https://api.github.com/repos/fail/fail')
    .get('/pulls?state=all')
    .reply(404, {});
  });

  it('should rject on non-2xx status', (done) => {
    getAllPullRequests([{ fullName: 'fail/fail' }]).then(res => {
      expect(res).toBe(404);
      done();
    })
  });

  it('should return a properly flattened array of titles', (done) => {
    getAllPullRequests([{ fullName: 'ramda/ramda' }, { fullName: 'ramda/ramdangular' }]).then(res => {
      expect(res).toEqual(expectedPRResponse);
      done();
    });
  });
});
