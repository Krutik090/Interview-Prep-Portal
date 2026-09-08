// Static questionnaire definition served to the client to render the
// onboarding wizard. The submit payload shape (onboardingValidators.js)
// mirrors these fields directly onto the initial Profile document.
export const ONBOARDING_QUESTIONNAIRE = {
  version: 'v1',
  sections: [
    {
      key: 'education',
      title: 'Education',
      fields: [
        { name: 'education.degree', label: 'Degree', type: 'text', required: true },
        { name: 'education.institution', label: 'Institution', type: 'text', required: true },
        { name: 'education.graduationYear', label: 'Graduation year', type: 'number', required: true },
        { name: 'education.branch', label: 'Branch/Major', type: 'text', required: false },
      ],
    },
    {
      key: 'goals',
      title: 'Career goals',
      fields: [
        { name: 'targetRole', label: 'Target role', type: 'text', required: true },
        { name: 'targetDomain', label: 'Target domain', type: 'text', required: false },
        {
          name: 'experienceLevel',
          label: 'Experience level',
          type: 'select',
          options: ['fresher', '0-1yr', '1-3yr', '3+yr'],
          required: true,
        },
        { name: 'preferredCompanies', label: 'Preferred companies', type: 'tags', required: false },
      ],
    },
    {
      key: 'selfAssessment',
      title: 'Self-assessment',
      fields: [
        { name: 'currentSkills', label: 'Current skills', type: 'tags', required: true },
        { name: 'strengths', label: 'Strengths', type: 'tags', required: false },
        { name: 'weaknesses', label: 'Areas to improve', type: 'tags', required: false },
      ],
    },
  ],
};
