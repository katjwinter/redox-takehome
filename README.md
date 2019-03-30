## About:
This app gets all pull requests for the Ramda organization using the
Github web API, and stores the results in memory.

## Requirements:
This app requires Node.js and npm. You can download and install
from https://nodejs.org/en/download/ (npm is included with Node.js).

Once Node.js and npm are installed, do an `npm install` from the top level
directory to get required dependencies.

## Authentication:
The Github API has reduced hourly rate limits if you do not authenticate.
You can add your username and password or Personal Access Token at the top of index.js
in order to authenticate for the requests.

## Running:
To run the app, do `npm start` or `node index.js run` from the top level directory.

## Testing:
To run tests, do `npm test` from the top level directory.
