const request = require('request');
const rp = require('request-promise-native');

const baseURI = 'https://api.github.com';
const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'redox-takehome',
};

// Request all repos for an org and filter for pertinent information
const getRepos = (org) => {
  const opts = {
    url: `${baseURI}/orgs/${org}/repos`,
    headers,
    resolveWithFullResponse: true,
  }

  return rp(opts).then(res => {
    const data = JSON.parse(res.body);
    const repos = data.map(repo => {
      return {
        name: repo.name,
        fullName: repo.full_name,
      };
    });
    return repos;
  }).catch(err => {
    // Request-Promise will reject any non-2xx status codes, so we can assume
    // a succesfull request above, and then handle any  non-2xx status codes here.
    return err.statusCode;
  });
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

  // Make requests for PRs for each repo, extract body from the response,
  // and use 'reduce' to flatten to a single array of PRs
  return Promise.all(arrayOfRequests).then(responses => {
    return responses.map(response => {
      const data = JSON.parse(response.body);
      return data;
    }).reduce( (a,b) => a.concat(b), []);
  }).catch(err => {
    return err.statusCode;
  });
}

// Parse PRs for the pertinent information we might want
const parsePullRequests = (pullRequests) => {
  console.log(`PR Count: ${pullRequests.length}`);
  return pullRequests.map(pr => {
    return {
      title: pr.title,
      number: pr.number,
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
    };
  });
}

// Main control
const run = () => {
  getRepos('ramda')
  .then(repos => {
    return getAllPullRequests(repos);
  }).then(pullRequests => {
    return parsePullRequests(pullRequests);
  }).then(results => {
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

module.exports = { getAllPullRequests, getRepos, parsePullRequests }
