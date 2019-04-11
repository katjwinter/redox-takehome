const { avgByFileCount, avgCommitCount, avgFromCommit, avgTimeToMerge, getAllPullRequests, getFirstCommit, getRepos, parsePullRequests, prsByWeek, prCountsByWeek } = require('../index.js');
const nock = require('nock')

let expectedRepoResponse = [{
  name: 'testName',
  fullName: 'testName/testName',
}];

let expectedPaginatedRepoResponse = [{
  name: 'testName',
  fullName: 'testName/testName',
}, {
  name: 'test2Name',
  fullName: 'test2Name/test2Name',
}];

let expectedPRResponse = [{
    title: 'testTitle',
    number: '1',
    state: 'open',
    created_at: '2019-03-29T09:00:00Z',
    updated_at: '2019-03-29T09:00:00Z',
    closed_at: '2019-03-29T09:00:00Z',
    merged_at: '2019-03-29T09:00:00Z',
    repo: {
      full_name: 'bar',
    },
  }, {
    title: 'secondTitle',
    number: '2',
    state: 'open',
    created_at: '2019-02-24T09:00:00Z',
    updated_at: '2019-02-24T09:00:00Z',
    closed_at: '2019-02-24T09:00:00Z',
    merged_at: '2019-02-24T09:00:00Z',
    repo: {
      full_name: 'baz',
    },
  }, {
    title: 'anotherTitle',
    number: '3',
    state: 'open',
    created_at: '2019-03-28T09:00:00Z',
    updated_at: '2019-03-28T09:00:00Z',
    closed_at: '2019-03-28T09:00:00Z',
    merged_at: '2019-03-28T09:00:00Z',
    repo: {
      full_name: 'anotherFoo',
    },
}];

let expectedPaginatedPRResponse = [{
  title: 'a PR',
  number: '1',
  state: 'open',
  created_at: '2019-03-29T09:00:00Z',
  updated_at: '2019-03-29T09:00:00Z',
  closed_at: '2019-03-29T09:00:00Z',
  merged_at: '2019-03-29T09:00:00Z',
  repo: {
    full_name: 'bar',
  },
}, {
  title: 'another PR',
  number: '2',
  state: 'open',
  created_at: '2019-03-29T09:00:00Z',
  updated_at: '2019-03-29T09:00:00Z',
  closed_at: '2019-03-29T09:00:00Z',
  merged_at: '2019-03-29T09:00:00Z',
  repo: {
    full_name: 'baz',
  },
}];

let expectedParsedResponse = [{
  title: 'testTitle',
  number: '1',
  state: 'open',
  createdAt: '2019-03-29T09:00:00Z',
  updatedAt: '2019-03-29T09:00:00Z',
  closedAt: '2019-03-29T09:00:00Z',
  mergedAt: '2019-03-29T09:00:00Z',
  repo: 'bar',
}, {
  title: 'secondTitle',
  number: '2',
  state: 'open',
  createdAt: '2019-02-24T09:00:00Z',
  updatedAt: '2019-02-24T09:00:00Z',
  closedAt: '2019-02-24T09:00:00Z',
  mergedAt: '2019-02-24T09:00:00Z',
  repo: 'baz',
}, {
  title: 'anotherTitle',
  number: '3',
  state: 'open',
  createdAt: '2019-03-28T09:00:00Z',
  updatedAt: '2019-03-28T09:00:00Z',
  closedAt: '2019-03-28T09:00:00Z',
  mergedAt: '2019-03-28T09:00:00Z',
  repo: 'anotherFoo',
}];

let weeklyMergedInput = [{
  title: 'testTitle',
  number: '1',
  state: 'open',
  createdAt: '2019-01-08T09:00:00Z',
  updatedAt: '2019-01-09T09:00:00Z',
  closedAt: '2019-01-09T09:00:00Z',
  mergedAt: '2019-01-09T09:00:00Z',
  repo: 'bar',
}, {
  title: 'secondTitle',
  number: '2',
  state: 'open',
  createdAt: '2019-01-01T09:00:00Z',
  updatedAt: '2019-01-02T09:00:00Z',
  closedAt: '2019-01-02T09:00:00Z',
  mergedAt: '2019-01-02T09:00:00Z',
  repo: 'baz',
}, {
  title: 'anotherTitle',
  number: '3',
  state: 'open',
  createdAt: '2019-01-05T09:00:00Z',
  updatedAt: '2019-01-08T09:00:00Z',
  closedAt: '2019-01-08T09:00:00Z',
  mergedAt: '2019-01-08T09:00:00Z',
  repo: 'anotherFoo',
}];

let expectedWeeklyOutput = {
  '2019-01-06': [{
    title: 'testTitle',
    number: '1',
    state: 'open',
    createdAt: '2019-01-08T09:00:00Z',
    updatedAt: '2019-01-09T09:00:00Z',
    closedAt: '2019-01-09T09:00:00Z',
    mergedAt: '2019-01-09T09:00:00Z',
    repo: 'bar',
  }, {
    title: 'anotherTitle',
    number: '3',
    state: 'open',
    createdAt: '2019-01-05T09:00:00Z',
    updatedAt: '2019-01-08T09:00:00Z',
    closedAt: '2019-01-08T09:00:00Z',
    mergedAt: '2019-01-08T09:00:00Z',
    repo: 'anotherFoo'
  }],
  '2018-12-30': [{
    title: 'secondTitle',
    number: '2',
    state: 'open',
    createdAt: '2019-01-01T09:00:00Z',
    updatedAt: '2019-01-02T09:00:00Z',
    closedAt: '2019-01-02T09:00:00Z',
    mergedAt: '2019-01-02T09:00:00Z',
    repo: 'baz',
  }],
};

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

    const pag1 = nock('https://api.github.com/orgs/manyRepos')
    .get('/repos')
    .reply(200, [{
      name: 'testName',
      full_name: 'testName/testName',
      foo: 'bar'
    }], {
      link: '<https://api.github.com/orgs/manyRepos/repos?page=2>; rel="next", <https://api.github.com/repositories/10851820/pulls?state=all&page=50>; rel="last"'
    });

    const pag2 = nock('https://api.github.com/orgs/manyRepos')
    .get('/repos?page=2')
    .reply(200, [{
        name: 'test2Name',
        full_name: 'test2Name/test2Name',
        foo: 'bar',
      }]
    );
  });

  it('should reject on non-2xx status', (done) => {
    getRepos('fail').then(res => {
      expect(res).toBe(404);
      done();
    });
  });

  it('should paginate correctly', (done) => {
    getRepos('manyRepos').then(res => {
      expect(res).toEqual(expectedPaginatedRepoResponse);
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
        repo: {
          full_name: 'bar',
        },
      },{
        title: 'secondTitle',
        number: '2',
        state: 'open',
        created_at: '2019-02-24T09:00:00Z',
        updated_at: '2019-02-24T09:00:00Z',
        closed_at: '2019-02-24T09:00:00Z',
        merged_at: '2019-02-24T09:00:00Z',
        repo: {
          full_name: 'baz',
        },
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
        repo: {
          full_name: 'anotherFoo',
        },
      }]
    );

    const pagRepo = nock('https://api.github.com/repos/manyPR/one')
    .get('/pulls?state=all')
    .reply(200, [{
      title: 'a PR',
      number: '1',
      state: 'open',
      created_at: '2019-03-29T09:00:00Z',
      updated_at: '2019-03-29T09:00:00Z',
      closed_at: '2019-03-29T09:00:00Z',
      merged_at: '2019-03-29T09:00:00Z',
      repo: {
        full_name: 'bar',
      },
    }], {
      link: '<https://api.github.com/repos/manyPR/one/pulls?state=all&page=2>; rel="next", <https://api.github.com/repos/manyPR/one/pulls?state=all&page=20>; rel="last"'
    });

    const pagRepo2 = nock('https://api.github.com/repos/manyPR/one')
    .get('/pulls?state=all&page=2')
    .reply(200, [{
      title: 'another PR',
      number: '2',
      state: 'open',
      created_at: '2019-03-29T09:00:00Z',
      updated_at: '2019-03-29T09:00:00Z',
      closed_at: '2019-03-29T09:00:00Z',
      merged_at: '2019-03-29T09:00:00Z',
      repo: {
        full_name: 'baz',
      },
    }]);

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

  it('should paginate correctly', (done) => {
    getAllPullRequests([{ fullName: 'manyPR/one' }]).then(res => {
      expect(res).toEqual(expectedPaginatedPRResponse);
      done();
    });
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

describe('prsByWeek', () => {
  it('should return the PRs merged each week', () => {
    expect(prsByWeek(weeklyMergedInput)).toEqual(expectedWeeklyOutput);
  });
});

describe('prCountsByWeek', () => {
  it('should return the number of PRs merged each week', () => {
    expect(prCountsByWeek(weeklyMergedInput)).toEqual('2019-01-06: 2, 2018-12-30: 1');
  });
});

// where weeklyMergedInput has two PR's in 2019 with created dates 1 day and 3 days prior
// to merge date respectively, and the one PR in 2018 has a created date 1 day prior to merge.
describe('avgTimeToMerge', () => {
  it('should return the average of days between creation and merge', () => {
    expect(avgTimeToMerge(weeklyMergedInput)).toEqual({
      '2019-01-06': 2,
      '2018-12-30': 1,
    });
  })
})

describe('avgTimeFromCommit', () => {
  beforeEach(() => {
    const pagCommits = nock('https://api.github.com/repos/baz/pulls/2')
    .get('/commits')
    .reply(200, [{
      committer: {
        date: '2019-01-02' // same as merge date (but shouldn't come up as first commit)
      }
    }], {
      link: '<https://api.github.com/repos/baz/pulls/2/commits&page=2>; rel="next", <https://api.github.com/repos/baz/pulls/2/commits&page=20>; rel="last"'
    });

    const pagCommits2 = nock('https://api.github.com/repos/baz/pulls/2')
    .get('/commits&page=2')
    .reply(200, [{
      committer: {
        date: '2019-01-01' // 1 day prior to merge date
      }
    }]);

    const barCommits = nock('https://api.github.com/repos/bar/pulls/1')
    .get('/commits')
    .reply(200, [{
      committer: {
        date: '2019-01-08' // 1 day prior to merge date
      }
    }]);

    const fooCommits = nock('https://api.github.com/repos/anotherFoo/pulls/3')
    .get('/commits')
    .reply(200, [{
      committer: {
        date: '2019-01-05' // 3 days prior to merge date
      }
    }]);
  });

  it('should return the first commit', (done) => {
    getFirstCommit({ repo: 'baz', number: 2}).then(res => {
      expect(res.firstCommit).toEqual('2019-01-01');
      done();
    });
  });

  it('should average time from the first commit to the merge time', (done) => {
    avgFromCommit(weeklyMergedInput).then(res => {
      expect(res).toEqual({
        '2019-01-06': 2,
        '2018-12-30': 1,
      });
      done();
    });
  });

  it('should average by PR commit count per week', (done) => {
    avgCommitCount(weeklyMergedInput).then(res => {
      expect(res).toEqual({
        '2019-01-06': 1,
        '2018-12-30': 2,
      });
      done();
    });
  });
});

describe('avgSizeOfPR', () => {
  beforeEach(() => {
    const bazFiles = nock('https://api.github.com/repos/baz/pulls/2')
    .get('/files')
    .reply(200, [{
      filename: 'a_file.txt',
    }, {
      filename: 'second_file.txt'
    }], {
      link: '<https://api.github.com/repos/baz/pulls/2/files&page=2>; rel="next", <https://api.github.com/repos/baz/pulls/2/files&page=20>; rel="last"'
    });

    const bazFiles2 = nock('https://api.github.com/repos/baz/pulls/2')
    .get('/files&page=2')
    .reply(200, [{
      filename: 'another_file.txt',
    }]);

    const barFiles = nock('https://api.github.com/repos/bar/pulls/1')
    .get('/files')
    .reply(200, [{
      filename: 'a.txt',
    }, {
      filename: 'b.txt',
    }]);

    const fooFiles = nock('https://api.github.com/repos/anotherFoo/pulls/3')
    .get('/files')
    .reply(200, [{
      filename: 'c.txt',
    }]);
  });

  it('should average by PR size per week', (done) => {
    avgByFileCount(weeklyMergedInput).then(res => {
      expect(res).toEqual({
        '2019-01-06': 1.5,
        '2018-12-30': 3,
      });
      done();
    });
  });
});
