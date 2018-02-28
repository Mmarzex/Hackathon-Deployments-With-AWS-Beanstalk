const packageJson = require('./package.json');

var port = process.env.PORT || 3000;
const restify = require('restify');
const AWS = require('aws-sdk');
AWS.config.update({region: "us-east-1"});

const dynamodb = new AWS.DynamoDB();

const fs = require('fs');

const server = restify.createServer();

server.get('/', (req, res, next) => {
  res.json({'message': 'test from eb', 'version': packageJson.version});
  return next();
});

server.get('/movies', (req, res, next) => {
  const docClient = new AWS.DynamoDB.DocumentClient();

  var params = {
    TableName: 'MarvelMovies'
  }

  docClient.scan(params, (err, data) => {
    if(err) {
      res.json(err);
    } else {
      res.json(data);
    }
  });
});

// server.get('/movies/:year', (req, res, next) => {
//   const docClient = new AWS.DynamoDB.DocumentClient();

//   var params = {
//     TableName: 'MarvelMovies',
//     KeyConditionExpression: "#yr = :yyyy",
//     ExpressionAttributeNames: {
//       "#yr": "year"
//     },
//     ExpressionAttributeValues: {
//       ":yyyy": parseInt(req.params.year)
//     }
//   }

//   docClient.query(params, (err, data) => {
//     if(err) {
//       res.json(err);
//     } else {
//       res.json(data);
//     }
//   });
// });

server.get('/dynamo/setup/table', (req, res, next) => {
  var params = {
    TableName: 'MarvelMovies',
    KeySchema: [
      { AttributeName: 'year', KeyType: 'HASH'},
      { AttributeName: 'title', KeyType: 'RANGE'}
    ],
    AttributeDefinitions: [
      { AttributeName: 'year', AttributeType: 'N'},
      { AttributeName: 'title', AttributeType: 'S'}
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 2,
      WriteCapacityUnits: 2
    }
  };

  dynamodb.createTable(params, (err, data) => {
    if(err) {
      res.json({'message': 'no work'});
    } else {
      res.json({'message': 'setup dynamo'});
    }
  });
});

server.get('/dynamo/setup/items', (req, res, next) => {
  const movies = JSON.parse(fs.readFileSync('movies.json', 'utf8'));
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = movies.map(movie => {
    return {
      PutRequest: {
        Item: {
          'year': movie.year,
          'title': movie.title
        }
      }
    }
  });
  const batchParam = {
    RequestItems: {
      'MarvelMovies': params
    }
  }
  docClient.batchWrite(batchParam, (err, data) => {
    if(err) {
      res.json(err);
    } else {
      res.json({'message': 'records written'});
    }
  })
});

server.listen(port, () => {
  console.log('%s listening at %s', server.name, server.url);
});
