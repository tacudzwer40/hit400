module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173',
        'http://localhost:4173/user-dashboard'
      ],
      startServerCommand: 'npm run preview',
      numberOfRuns: 1
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
