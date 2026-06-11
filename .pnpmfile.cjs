const removedDependencyMap = {
  // These Umi packages do not reference the legacy browser polyfills they declare.
  '@umijs/bundler-webpack': {
    version: '4.6.61',
    dependencies: ['node-libs-browser'],
  },
  '@umijs/mako': {
    version: '0.11.10',
    dependencies: ['node-libs-browser-okam'],
  },
};

function removeDependencies(pkg, dependencyNames) {
  for (const dependencyName of dependencyNames) {
    delete pkg.dependencies?.[dependencyName];
    delete pkg.optionalDependencies?.[dependencyName];
    delete pkg.devDependencies?.[dependencyName];
  }
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      const rule = removedDependencyMap[pkg.name];

      if (rule && pkg.version === rule.version) {
        removeDependencies(pkg, rule.dependencies);
      }

      return pkg;
    },
  },
};
