const localApiProxy = {
  '/api/': {
    target: process.env.OPENCORE_API_PROXY_TARGET ?? 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default {
  dev: localApiProxy,
  test: localApiProxy,
  pre: localApiProxy,
};
