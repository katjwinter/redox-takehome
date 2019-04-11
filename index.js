const request = require('request');
const rp = require('request-promise-native');
const moment = require('moment');

const org = 'ramda';
const username = '';
const token = '';
let headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'redox-takehome',
};
const baseURI = 'https://api.github.com';
const paginationRegex = /(?<=\<).+?(?=\>;\srel="next")/

// Check if authorization information has been provided, and if so, return
// a Basic Auth header.
const getAuth = () => {
  if (username && token) {
    const converted = Buffer.from(`${username}:${token}`).toString('base64');
    return `Basic ${converted}`;
  } else {
    console.log(`No auth provided, which will limit hourly rate limits`);
    return null;
  }
}

// Request all repos for an org
const getRepos = (org) => {
  const opts = {
    url: `${baseURI}/orgs/${org}/repos`,
    headers,
    resolveWithFullResponse: true,
  }
  return paginateRepos(opts, [])
  .then(results => {
    return results;
  })
  .catch(err => {
    console.log(`err: ${err}`);
    return err.statusCode;
  });
}

// Make API call for repos, and paginate if necessary.
const paginateRepos = (opts, results) => {
  return rp(opts).then(res => {
    const data = JSON.parse(res.body);
    const repos = data.map(repo => {
      return {
        name: repo.name,
        fullName: repo.full_name,
      };
    });
    results = results.concat(repos);

    if (res.headers.link && paginationRegex.test(res.headers.link)) {
      opts.url = paginationRegex.exec(res.headers.link)[0];
      return paginateRepos(opts, results);
    } else {
      return results;
    }
  });
}

// Make API calls for pull requests, and paginate if necessary.
const paginatePullRequests = (requests, results) => {
  if (requests.length) {
    return Promise.all(requests)
    .then(responses => {
      paginationRequests = [];

      responses.forEach(res => {
        results.push(JSON.parse(res.body));

        if (res.headers.link && paginationRegex.test(res.headers.link)) {
          const opts = {
            url: paginationRegex.exec(res.headers.link)[0],
            headers,
            resolveWithFullResponse: true,
          };
          paginationRequests.push( rp(opts) );
        }
      });
      return paginatePullRequests(paginationRequests, results);
    });
  } else {
    // If there are no further requests to paginate, just return results
    return results;
  }
}

// Request pull requests for each repo and return them as a single array of PRs
const getAllPullRequests = (repos) => {
  // Create an array of requests from the array of repos
  let arrayOfRequests = repos.map(repo => {
    const opts = {
      url: `${baseURI}/repos/${repo.fullName}/pulls?state=all`,
      headers,
      resolveWithFullResponse: true,
    };
    return rp(opts);
  });

  return paginatePullRequests(arrayOfRequests, [])
  .then(results => {
    // flatten to a single array of pull requests
    return results.reduce( (a,b) => a.concat(b), []);
  })
  .catch(err => {
    console.log(`err: ${err}`);
    return err.statusCode;
  });
}

// Parse PRs for the pertinent information we might want
const parsePullRequests = (pullRequests) => {
  return pullRequests.map(pr => {
    return {
      title: pr.title,
      number: pr.number,
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
      repo: pr.repo.full_name,
    };
  });
}

// Week over week average size based on number of files
const avgByFileCount = (pullRequests) => {
  const result = {};
  let arrayOfFileRequests = [];

  pullRequests.forEach(pr => {
    arrayOfFileRequests.push(getFileCount(pr));
  });

  return Promise.all(arrayOfFileRequests).then(results => {
    const weeklyPRs = prsByWeek(results);
    Object.keys(weeklyPRs).forEach(week => {
      const sum = weeklyPRs[week].reduce((acc, pr) => {
        return acc + pr.fileCount;
      }, 0);
      result[week] = sum / weeklyPRs[week].length;
    })
    return result;
  });
}

const getFileCount = (pr) => {
  return getFiles(pr).then(files => {
    pr.fileCount = files.length;
    return pr;
  })
}

const getFiles = (pr) => {
  const opts = {
    url: `${baseURI}/repos/${pr.repo}/pulls/${pr.number}/files`,
    headers,
    resolveWithFullResponse: true,
  }
  return paginateFiles(opts, [])
  .then(results => {
    return results;
  });
}

const paginateFiles = (opts, results) => {
  return rp(opts).then(res => {
    let data = JSON.parse(res.body);
    results = results.concat(data);

    if (res.headers.link && paginationRegex.test(res.headers.link)) {
      opts.url = paginationRegex.exec(res.headers.link)[0];
      return paginateFiles(opts, results);
    } else {
      return results;
    }
  });
}

// Week over week average time from first commit to merge
const avgFromCommit = (pullRequests) => {
  const result = {};
  let arrayOfCommitRequests = [];

  pullRequests.forEach(pr => {
    arrayOfCommitRequests.push(getFirstCommit(pr));
  });

  return Promise.all(arrayOfCommitRequests).then(results => {
    const weeklyPRs = prsByWeek(results);
    Object.keys(weeklyPRs).forEach(week => {
      const sum = weeklyPRs[week].reduce((acc, pr) => {
        return acc + moment(pr.mergedAt).diff(pr.firstCommit, 'days');
      }, 0);
      result[week] = sum / weeklyPRs[week].length;
    })
    return result;
  });
}

const getFirstCommit = (pr) => {
  return getCommits(pr).then(commits => {
    pr.firstCommit = commits[0].committer.date;
    return pr;
  });
}

const getCommitsForPR = (pr) => {
  return getCommits(pr).then(commits => {
    pr.commits = commits;
    return pr;
  });
}

// Week over week size based on average number of commits
const avgCommitCount = (pullRequests) => {
  const result = {};
  let arrayOfCommitRequests = [];

  pullRequests.forEach(pr => {
    arrayOfCommitRequests.push(getCommitsForPR(pr));
  });

  return Promise.all(arrayOfCommitRequests).then(results => {
    const weeklyPRs = prsByWeek(results);
    Object.keys(weeklyPRs).forEach(week => {
      const sum = weeklyPRs[week].reduce((acc, pr) => {
        return acc + pr.commits.length;
      }, 0)
      result[week] = sum / weeklyPRs[week].length;
    })
    return result;
  })
}

// Commits for a given PR
const getCommits = (pr) => {
  const opts = {
    url: `${baseURI}/repos/${pr.repo}/pulls/${pr.number}/commits`,
    headers,
    resolveWithFullResponse: true,
  }
  return paginateCommits(opts, [])
  .then(results => {
    results = results.sort((commit1, commit2) => {
      const date1 = moment(commit1.committer.date);
      const date2 = moment(commit2.committer.date);
      return date1.diff(date2, 'days');
    });
    return results;
  });
}

const paginateCommits = (opts, results) => {
  return rp(opts).then(res => {
    let data = JSON.parse(res.body);
    results = results.concat(data);

    if (res.headers.link && paginationRegex.test(res.headers.link)) {
      opts.url = paginationRegex.exec(res.headers.link)[0];
      return paginateCommits(opts, results);
    } else {
      return results;
    }
  });
}

// PRs sorted by merge date
const prsByWeek = (pullRequests) => {
  const results = {};
  pullRequests = pullRequests.filter(pr => {
    return pr.mergedAt;
  });

  pullRequests.forEach(pr => {
    const week = moment(pr.mergedAt).startOf('week').format('YYYY-MM-DD');
    if (results[week]) {
      results[week].push(pr);
    } else {
      results[week] = [pr];
    }
  });

  return results;
}

// Week over week PR counts
const prCountsByWeek = (pullRequests) => {
  let strResult = '';
  const weeklyPRs = prsByWeek(pullRequests);
  Object.keys(weeklyPRs).forEach(week => {
    strResult = strResult ? strResult + ', ' : strResult;
    strResult = strResult + `${week}: ${weeklyPRs[week].length}`;
  });

  return strResult;
}

// Week over week average of time from creation to merge
const avgTimeToMerge = (pullRequests) => {
  const result = {};
  const weeklyPRs = prsByWeek(pullRequests);

  Object.keys(weeklyPRs).forEach(week => {
    const sum = weeklyPRs[week].reduce((acc, pr) => {
      return acc + moment(pr.mergedAt).diff(pr.createdAt, 'days');
    }, 0)
    result[week] = sum / weeklyPRs[week].length;
  });

  return result;
}

// Main control
const run = () => {
  const auth = getAuth();
  if (auth) {
    headers.Authorization = auth;
  }

  getRepos(org)
  .then(repos => {
    return getAllPullRequests(repos);
  }).then(pullRequests => {
    return parsePullRequests(pullRequests);
  }).then(results => {
    console.log(`PR Count: ${results.length}`);
    // do stuff with results
  });
}

// Ensure we only call run when we want to and not during testing
for (var i = 0; i < process.argv.length; i++) {
  switch (process.argv[i]) {
    case 'run':
      run();
      break;
    default:
      // must only be testing
      break;
  }
}

module.exports = { avgByFileCount, avgCommitCount, avgFromCommit, avgTimeToMerge, getAllPullRequests, getFirstCommit, getRepos, parsePullRequests, prsByWeek, prCountsByWeek }
