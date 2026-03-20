export function getE2EFixtureFromSearch(search = '') {
  const params = new URLSearchParams(search);
  return (params.get('__e2e') || '').trim();
}

export function appendE2EFixture(path, search = '') {
  const fixture = getE2EFixtureFromSearch(search);
  if (!fixture) return path;

  const [basePath, rawQuery = ''] = path.split('?');
  const params = new URLSearchParams(rawQuery);
  params.set('__e2e', fixture);

  const nextQuery = params.toString();
  return nextQuery ? `${basePath}?${nextQuery}` : basePath;
}
