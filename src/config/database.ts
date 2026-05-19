import path from 'path';

interface DatabaseConfig {
  development: {
    path: string;
    options: {
      verbose?: Console['log'];
    };
  };
  production: {
    path: string;
    options: Record<string, unknown>;
  };
  test: {
    path: string;
    options: Record<string, unknown>;
  };
}

const dbConfig: DatabaseConfig = {
  development: {
    path: path.resolve(__dirname, '../../database/pos_billing_dev.db'),
    options: {
      verbose: console.log,
    },
  },
  production: {
    path: path.resolve(__dirname, '../../database/pos_billing.db'),
    options: {},
  },
  test: {
    path: path.resolve(__dirname, '../../database/pos_billing_test.db'),
    options: {},
  },
};

export default dbConfig;
