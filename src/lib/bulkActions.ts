export function summarizeBulkResults(results: PromiseSettledResult<boolean>[]): { succeeded: number; failed: number } {
  let succeeded = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) succeeded++;
    else failed++;
  }
  return { succeeded, failed };
}
