const mysql = require('mysql2');

function fail(message) {
  console.error(JSON.stringify({ error: message }));
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 3) {
  fail('Missing required DB runner arguments.');
}

let config;
let sql;
let values;

try {
  config = JSON.parse(Buffer.from(args[0], 'base64').toString('utf8'));
  sql = Buffer.from(args[1], 'base64').toString('utf8');
  values = JSON.parse(Buffer.from(args[2], 'base64').toString('utf8'));
} catch (err) {
  fail(err && err.message ? err.message : 'Failed to decode runner arguments.');
}

const conn = mysql.createConnection(config);

conn.connect((connectErr) => {
  if (connectErr) {
    fail(connectErr.message || 'Database connection failed.');
  }

  const isSelect = /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN|WITH)\b/i.test(sql);

  const handleResult = (err, result) => {
    if (err) {
      conn.end(() => fail(err.message || 'Database query failed.'));
      return;
    }

    if (isSelect) {
      console.log(JSON.stringify({ rows: Array.isArray(result) ? result : [] }));
    } else {
      console.log(
        JSON.stringify({
          rows: {
            insertId: result && result.insertId !== undefined ? result.insertId : 0,
            affectedRows: result && result.affectedRows !== undefined ? result.affectedRows : 0,
          },
        }),
      );
    }

    conn.end(() => process.exit(0));
  };

  if (isSelect) {
    conn.query(sql, Array.isArray(values) ? values : [], handleResult);
    return;
  }

  conn.execute(sql, Array.isArray(values) ? values : [], handleResult);
});
