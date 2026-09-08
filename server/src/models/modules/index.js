// Importing this file registers all four Module discriminators as a
// side-effect. Import it (for side effects) anywhere Module documents of a
// specific type are created or queried, before any such operation runs.
export { MaterialModule } from './MaterialModule.js';
export { QuizModule } from './QuizModule.js';
export { AiInterviewModule } from './AiInterviewModule.js';
export { GdSubmissionModule } from './GdSubmissionModule.js';
