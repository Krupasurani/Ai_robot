import { PromptVisibility } from '@/api/prompt-library';
import { PromptFormValues } from './schemas/prompt-form-schema';

export const TEMPLATE_OPTIONS: Array<{
  id: string;
  label: string;
  helper: string;
  values: PromptFormValues;
}> = [
  {
    id: 'summary',
    label: 'Executive summary',
    helper: 'Turn long-form content into crisp status updates.',
    values: {
      title: 'Executive Summary Generator',
      description: 'Summarize long documents into crisp executive updates.',
      category: 'analysis',
      visibility: 'private' as PromptVisibility,
      tags: ['summary', 'analysis'],
      content: `You are an executive briefing assistant.
Summarize the provided content using this structure:
- Context (1 sentence)
- Key developments (3 concise bullets)
- Risks / blockers (optional)
- Next best actions (1-2 bullets)

Guidelines:
- Use action-oriented verbs
- Quantify numbers and dates when available
- Keep total output under 180 words`,
    },
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm creative ideas',
    helper: 'Divergent thinking prompts for ideation.',
    values: {
      title: 'Divergent Ideation Prompt',
      description: 'Generate unconventional but practical ideas.',
      category: 'brainstorming',
      visibility: 'workspace' as PromptVisibility,
      tags: ['brainstorm', 'ideas'],
      content: `You are a creative strategist.
Task: Produce 5 unconventional but realistic ideas for the user's goal.

For each idea include:
- Title
- One-liner pitch
- Why it could work
- Key first experiment to validate it

Guidelines:
- Avoid clich�s
- Reference relevant analogies from other industries
- Highlight potential risks`,
    },
  },
  {
    id: 'code-review',
    label: 'Code review helper',
    helper: 'Structured checklist for reviewing PRs.',
    values: {
      title: 'Code Review Checklist',
      description: 'Catch regressions and improve readability during reviews.',
      category: 'engineering',
      visibility: 'private' as PromptVisibility,
      tags: ['code', 'review'],
      content: `You are a senior engineer reviewing a pull request.
When provided with code and context, respond with:
1. Summary of what the code changes do
2. Potential bugs or edge cases
3. Readability & maintainability concerns
4. Security / performance watch-outs
5. Clear ?/??/? recommendation

Guidelines:
- Reference specific functions/lines
- Suggest concrete improvements
- Assume reviewer access to CI logs`,
    },
  },
];
