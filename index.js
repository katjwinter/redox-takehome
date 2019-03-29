const request = require('request');
const rp = require('request-promise-native');

const baseURI = 'https://api.github.com';
const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'redox-takehome',
};

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
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
      };
    });
    return repos;
  }).catch(err => {
    // Request-Promise will reject any non-2xx status codes, so we can assume
    // a succesfull request above, and then handle any  non-2xx status codes here.
    return err.statusCode;
  });
}

const getAllPullRequests = (repos) => {
  // create an array of requests from the array of repos
  let arrayOfRequests = repos.map(repo => {
    const opts = {
      url: `${baseURI}/repos/${repo.fullName}/pulls?state=all`,
      headers,
      resolveWithFullResponse: true,
    };
    return rp(opts);
  });

  // Make all of the requests, and then process all of the responses:
  // 1. Parse each response body
  // 2. Use mapping to extract only the information we need
  // 3. Use reduce to flatten the resulting array of arrays
  return Promise.all(arrayOfRequests).then(responses => {
    responses = responses.map(response => {
      const data = JSON.parse(response.body);
      pulls = data.map(pull => {
        return {
          title: pull.title,
        }
      });
      return pulls;
    }).reduce( (a,b) => a.concat(b), [] );
    return responses;
  }).catch(err => {
    return err.statusCode;
  });
}

const parsePullRequests = (res) => {

}

const run = () => {
  getRepos('ramda')
  .then(repos => {
    return getAllPullRequests(repos);
  }).then(pullRequests => {
    console.log(`stuff: ${JSON.stringify(pullRequests)}`);
  });

}

// Don't actually run when we're just testing
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

module.exports = { getAllPullRequests, getRepos }
