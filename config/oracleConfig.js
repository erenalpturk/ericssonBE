// oracleConfig.js
const oracleConfigs = {
  OMNI: {
    user: 'OTOPERF',
    password: 'OTOPERF',
    connectString: '10.6.254.134:1521/RODB',
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 30,
    stmtCacheSize: 30,
    connectTimeout: 10,
    callTimeout: 20000
  },
  OMNI2: {
    user: 'OTOPERF',
    password: 'OTOPERF',
    connectString: '10.6.254.134:1521/RDB',
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 30,
    stmtCacheSize: 30,
    connectTimeout: 10,
    callTimeout: 20000
  },
  OMNI3: {
    user: 'OTOPERF',
    password: 'OTOPERF',
    connectString: '10.6.254.134:1521/RODB',
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 30,
    stmtCacheSize: 30,
    connectTimeout: 10,
    callTimeout: 20000
  },
  OMNI4: {
    user: 'OTOPERF',
    password: 'OTOPERF',
    connectString: '10.6.254.132:1521/FDB',
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 30,
    stmtCacheSize: 30,
    connectTimeout: 10,
    callTimeout: 20000
  },
  OMNI5: {
    user: 'OTOPERF',
    password: 'OTOPERF',
    connectString: '10.6.254.132:1521/FODB',
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 30,
    stmtCacheSize: 30,
    connectTimeout: 10,
    callTimeout: 20000
  }
};

module.exports = oracleConfigs; 