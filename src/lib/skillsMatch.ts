export function computeMatchScore(jobRequirements: string[], userSkills: string[]): number {
  if (jobRequirements.length === 0 || userSkills.length === 0) return 0;

  const normJob  = jobRequirements.map((s) => s.toLowerCase().trim());
  const normUser = userSkills.map((s) => s.toLowerCase().trim());

  const matches = normJob.filter((req) =>
    normUser.some(
      (skill) =>
        skill === req ||
        skill.includes(req) ||
        req.includes(skill),
    ),
  );

  return Math.round((matches.length / normJob.length) * 100);
}
