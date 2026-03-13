module.exports = {
  apps: [
    {
      name: 'myqwerty',
      cwd: __dirname,
      script: 'npm',
      args: 'run serve:prod',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
