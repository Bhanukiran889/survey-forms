export const SURVEY_VERSION = '1.0.0';
export const DRAFT_RETENTION_DAYS = 30;
export interface Question { id: string; number: number; version: number; prompt: string; type: 'single' | 'multi' | 'text'; required: boolean; maxSelections?: number; options: { value: string; label: string }[]; }
export interface Section { id: number; title: string; questions: Question[]; }
export type Answer = { values?: string[]; other?: string; text?: string };
export type Answers = Record<string, Answer>;
export const sections: Section[] = [
  {
    "id": 1,
    "title": "About your preparation",
    "questions": [
      {
        "id": "q1",
        "number": 1,
        "version": 1,
        "prompt": "Which best describes your current status?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q1_a1",
            "label": "MBBS student preparing alongside college"
          },
          {
            "value": "q1_a2",
            "label": "Intern preparing for NEET-PG"
          },
          {
            "value": "q1_a3",
            "label": "Full-time NEET-PG aspirant"
          },
          {
            "value": "q1_a4",
            "label": "Repeater / drop-year aspirant"
          },
          {
            "value": "q1_a5",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q2",
        "number": 2,
        "version": 1,
        "prompt": "How long have you been preparing for NEET-PG?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q2_a1",
            "label": "Less than 3 months"
          },
          {
            "value": "q2_a2",
            "label": "3–6 months"
          },
          {
            "value": "q2_a3",
            "label": "6–12 months"
          },
          {
            "value": "q2_a4",
            "label": "1–2 years"
          },
          {
            "value": "q2_a5",
            "label": "More than 2 years"
          }
        ]
      },
      {
        "id": "q3",
        "number": 3,
        "version": 1,
        "prompt": "What is your primary study method?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q3_a1",
            "label": "Online video lectures"
          },
          {
            "value": "q3_a2",
            "label": "Offline coaching"
          },
          {
            "value": "q3_a3",
            "label": "Self-study using notes and textbooks"
          },
          {
            "value": "q3_a4",
            "label": "A combination of coaching and self-study"
          },
          {
            "value": "q3_a5",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q4",
        "number": 4,
        "version": 1,
        "prompt": "On a typical study day, how much time do you spend studying?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q4_a1",
            "label": "Less than 3 hours"
          },
          {
            "value": "q4_a2",
            "label": "3–5 hours"
          },
          {
            "value": "q4_a3",
            "label": "6–8 hours"
          },
          {
            "value": "q4_a4",
            "label": "9–11 hours"
          },
          {
            "value": "q4_a5",
            "label": "12 or more hours"
          }
        ]
      },
      {
        "id": "q5",
        "number": 5,
        "version": 1,
        "prompt": "Which stage best describes your current preparation?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q5_a1",
            "label": "Learning most subjects for the first time"
          },
          {
            "value": "q5_a2",
            "label": "Completing the syllabus"
          },
          {
            "value": "q5_a3",
            "label": "First revision"
          },
          {
            "value": "q5_a4",
            "label": "Second or subsequent revision"
          },
          {
            "value": "q5_a5",
            "label": "Mainly solving MCQs and taking mock tests"
          }
        ]
      }
    ]
  },
  {
    "id": 2,
    "title": "Memory and recall",
    "questions": [
      {
        "id": "q6",
        "number": 6,
        "version": 1,
        "prompt": "How often do you struggle to recall something you studied earlier?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q6_a1",
            "label": "Never or almost never"
          },
          {
            "value": "q6_a2",
            "label": "Rarely"
          },
          {
            "value": "q6_a3",
            "label": "Sometimes"
          },
          {
            "value": "q6_a4",
            "label": "Often"
          },
          {
            "value": "q6_a5",
            "label": "Very often"
          }
        ]
      },
      {
        "id": "q7",
        "number": 7,
        "version": 1,
        "prompt": "When do you most commonly notice difficulty recalling a topic? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q7_a1",
            "label": "The next day"
          },
          {
            "value": "q7_a2",
            "label": "After 3–7 days"
          },
          {
            "value": "q7_a3",
            "label": "After 2–4 weeks"
          },
          {
            "value": "q7_a4",
            "label": "After a month or longer"
          },
          {
            "value": "q7_a5",
            "label": "During MCQ practice"
          },
          {
            "value": "q7_a6",
            "label": "During mock tests"
          },
          {
            "value": "q7_a7",
            "label": "During discussions or clinical application"
          },
          {
            "value": "q7_a8",
            "label": "I do not experience this regularly"
          }
        ]
      },
      {
        "id": "q8",
        "number": 8,
        "version": 1,
        "prompt": "Which types of information are hardest for you to retain? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q8_a1",
            "label": "Basic concepts and mechanisms"
          },
          {
            "value": "q8_a2",
            "label": "Facts and classifications"
          },
          {
            "value": "q8_a3",
            "label": "Drug names, indications and adverse effects"
          },
          {
            "value": "q8_a4",
            "label": "Diagnostic criteria and investigations"
          },
          {
            "value": "q8_a5",
            "label": "Diseases with similar presentations"
          },
          {
            "value": "q8_a6",
            "label": "Microbiology organisms and treatments"
          },
          {
            "value": "q8_a7",
            "label": "Anatomy, pathways and diagrams"
          },
          {
            "value": "q8_a8",
            "label": "Numbers, values and scoring systems"
          },
          {
            "value": "q8_a9",
            "label": "Clinical guidelines and management protocols"
          },
          {
            "value": "q8_a10",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q9",
        "number": 9,
        "version": 1,
        "prompt": "Which subjects or topics are most difficult for you to retain?",
        "type": "text",
        "required": false,
        "options": []
      },
      {
        "id": "q10",
        "number": 10,
        "version": 1,
        "prompt": "When you cannot answer a question from a previously studied topic, what is usually the main reason?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q10_a1",
            "label": "I have forgotten the information"
          },
          {
            "value": "q10_a2",
            "label": "I remember the concept but not the exact fact"
          },
          {
            "value": "q10_a3",
            "label": "I confuse it with a similar concept"
          },
          {
            "value": "q10_a4",
            "label": "I understood it poorly the first time"
          },
          {
            "value": "q10_a5",
            "label": "I can recognize the answer but cannot recall it independently"
          },
          {
            "value": "q10_a6",
            "label": "I have not revised the topic enough"
          },
          {
            "value": "q10_a7",
            "label": "Other"
          }
        ]
      }
    ]
  },
  {
    "id": 3,
    "title": "Current revision process",
    "questions": [
      {
        "id": "q11",
        "number": 11,
        "version": 1,
        "prompt": "How do you currently decide which topics to revise? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q11_a1",
            "label": "Follow a fixed timetable"
          },
          {
            "value": "q11_a2",
            "label": "Follow my coaching institute's plan"
          },
          {
            "value": "q11_a3",
            "label": "Use a calendar or reminder app"
          },
          {
            "value": "q11_a4",
            "label": "Revise topics I have forgotten"
          },
          {
            "value": "q11_a5",
            "label": "Use incorrect MCQs or mock-test results"
          },
          {
            "value": "q11_a6",
            "label": "Revise from marked notes or highlighted content"
          },
          {
            "value": "q11_a7",
            "label": "Revise whenever I find spare time"
          },
          {
            "value": "q11_a8",
            "label": "I do not have a consistent method"
          },
          {
            "value": "q11_a9",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q12",
        "number": 12,
        "version": 1,
        "prompt": "How often do you revisit a topic after studying it for the first time?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q12_a1",
            "label": "The same day"
          },
          {
            "value": "q12_a2",
            "label": "Within 1–2 days"
          },
          {
            "value": "q12_a3",
            "label": "Within a week"
          },
          {
            "value": "q12_a4",
            "label": "Within 2–4 weeks"
          },
          {
            "value": "q12_a5",
            "label": "Only before a test or exam"
          },
          {
            "value": "q12_a6",
            "label": "There is no fixed pattern"
          }
        ]
      },
      {
        "id": "q13",
        "number": 13,
        "version": 1,
        "prompt": "What do you usually do when revising a topic? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q13_a1",
            "label": "Reread notes or textbooks"
          },
          {
            "value": "q13_a2",
            "label": "Rewatch lecture videos"
          },
          {
            "value": "q13_a3",
            "label": "Solve MCQs"
          },
          {
            "value": "q13_a4",
            "label": "Use flashcards or active-recall questions"
          },
          {
            "value": "q13_a5",
            "label": "Recall the topic without looking at notes"
          },
          {
            "value": "q13_a6",
            "label": "Review incorrect answers"
          },
          {
            "value": "q13_a7",
            "label": "Discuss the topic with others"
          },
          {
            "value": "q13_a8",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q14",
        "number": 14,
        "version": 1,
        "prompt": "What makes revision difficult for you? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q14_a1",
            "label": "Not enough time"
          },
          {
            "value": "q14_a2",
            "label": "Too much new syllabus to cover"
          },
          {
            "value": "q14_a3",
            "label": "Large revision backlog"
          },
          {
            "value": "q14_a4",
            "label": "Difficulty deciding what to revise"
          },
          {
            "value": "q14_a5",
            "label": "Revision takes too long"
          },
          {
            "value": "q14_a6",
            "label": "Boredom or repetitive work"
          },
          {
            "value": "q14_a7",
            "label": "Difficulty finding good questions"
          },
          {
            "value": "q14_a8",
            "label": "Difficulty understanding explanations"
          },
          {
            "value": "q14_a9",
            "label": "I forget even after repeated revision"
          },
          {
            "value": "q14_a10",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q15",
        "number": 15,
        "version": 1,
        "prompt": "Approximately how much time do you spend revising previously studied material each day?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q15_a1",
            "label": "None on most days"
          },
          {
            "value": "q15_a2",
            "label": "Less than 30 minutes"
          },
          {
            "value": "q15_a3",
            "label": "30–60 minutes"
          },
          {
            "value": "q15_a4",
            "label": "1–2 hours"
          },
          {
            "value": "q15_a5",
            "label": "More than 2 hours"
          },
          {
            "value": "q15_a6",
            "label": "It varies considerably"
          }
        ]
      }
    ]
  },
  {
    "id": 4,
    "title": "Questions, tools and tracking",
    "questions": [
      {
        "id": "q16",
        "number": 16,
        "version": 1,
        "prompt": "Which tools or resources do you currently use for revision? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q16_a1",
            "label": "Coaching institute app"
          },
          {
            "value": "q16_a2",
            "label": "Online question bank"
          },
          {
            "value": "q16_a3",
            "label": "Printed notes or textbooks"
          },
          {
            "value": "q16_a4",
            "label": "Digital notes or PDFs"
          },
          {
            "value": "q16_a5",
            "label": "Anki or other flashcard apps"
          },
          {
            "value": "q16_a6",
            "label": "Spreadsheets or personal trackers"
          },
          {
            "value": "q16_a7",
            "label": "Calendar or reminder apps"
          },
          {
            "value": "q16_a8",
            "label": "AI tools"
          },
          {
            "value": "q16_a9",
            "label": "WhatsApp, Telegram or study groups"
          },
          {
            "value": "q16_a10",
            "label": "No dedicated revision tool"
          },
          {
            "value": "q16_a11",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q17",
        "number": 17,
        "version": 1,
        "prompt": "How do you track topics you get wrong or repeatedly forget?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q17_a1",
            "label": "My question bank tracks them"
          },
          {
            "value": "q17_a2",
            "label": "I maintain a notebook or error log"
          },
          {
            "value": "q17_a3",
            "label": "I mark questions in my notes"
          },
          {
            "value": "q17_a4",
            "label": "I use flashcards"
          },
          {
            "value": "q17_a5",
            "label": "I track them digitally"
          },
          {
            "value": "q17_a6",
            "label": "I rely on memory"
          },
          {
            "value": "q17_a7",
            "label": "I do not track them systematically"
          }
        ]
      },
      {
        "id": "q18",
        "number": 18,
        "version": 1,
        "prompt": "What is the biggest limitation of your current revision method or tools? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q18_a1",
            "label": "They do not remind me when to revise"
          },
          {
            "value": "q18_a2",
            "label": "They do not focus on topics I personally struggle with"
          },
          {
            "value": "q18_a3",
            "label": "They have too many irrelevant questions"
          },
          {
            "value": "q18_a4",
            "label": "They do not explain why an answer is correct"
          },
          {
            "value": "q18_a5",
            "label": "They do not track long-term retention"
          },
          {
            "value": "q18_a6",
            "label": "They require too much manual work"
          },
          {
            "value": "q18_a7",
            "label": "They are spread across multiple tools"
          },
          {
            "value": "q18_a8",
            "label": "They take too much time"
          },
          {
            "value": "q18_a9",
            "label": "I am generally satisfied with my current system"
          },
          {
            "value": "q18_a10",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q19",
        "number": 19,
        "version": 1,
        "prompt": "How often do you complete the revision sessions you planned?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q19_a1",
            "label": "Almost always"
          },
          {
            "value": "q19_a2",
            "label": "Most of the time"
          },
          {
            "value": "q19_a3",
            "label": "About half the time"
          },
          {
            "value": "q19_a4",
            "label": "Occasionally"
          },
          {
            "value": "q19_a5",
            "label": "Almost never"
          },
          {
            "value": "q19_a6",
            "label": "I do not plan revision sessions"
          }
        ]
      }
    ]
  },
  {
    "id": 5,
    "title": "Product concept validation",
    "questions": [
      {
        "id": "q20",
        "number": 20,
        "version": 1,
        "prompt": "Imagine a tool that records topics you studied and schedules personalized MCQs to revisit them over time. How useful would this be for your preparation?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q20_a1",
            "label": "Not at all useful"
          },
          {
            "value": "q20_a2",
            "label": "Slightly useful"
          },
          {
            "value": "q20_a3",
            "label": "Moderately useful"
          },
          {
            "value": "q20_a4",
            "label": "Very useful"
          },
          {
            "value": "q20_a5",
            "label": "Extremely useful"
          },
          {
            "value": "q20_a6",
            "label": "Unsure"
          }
        ]
      },
      {
        "id": "q21",
        "number": 21,
        "version": 1,
        "prompt": "Which features would be most valuable to you? Select up to three.",
        "type": "multi",
        "required": true,
        "maxSelections": 3,
        "options": [
          {
            "value": "q21_a1",
            "label": "Enter topics studied each day"
          },
          {
            "value": "q21_a2",
            "label": "Import topics from notes or PDFs"
          },
          {
            "value": "q21_a3",
            "label": "Automatically generate topic-specific MCQs"
          },
          {
            "value": "q21_a4",
            "label": "Schedule revision based on past performance"
          },
          {
            "value": "q21_a5",
            "label": "Explain every answer, including incorrect options"
          },
          {
            "value": "q21_a6",
            "label": "Track topics I repeatedly forget"
          },
          {
            "value": "q21_a7",
            "label": "Show subject-wise retention and weak areas"
          },
          {
            "value": "q21_a8",
            "label": "Create a daily revision plan based on available time"
          },
          {
            "value": "q21_a9",
            "label": "Integrate with an existing question bank"
          },
          {
            "value": "q21_a10",
            "label": "Provide reminders for due revision sessions"
          }
        ]
      },
      {
        "id": "q22",
        "number": 22,
        "version": 1,
        "prompt": "How would you prefer to add the topics you studied?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q22_a1",
            "label": "Type topics manually"
          },
          {
            "value": "q22_a2",
            "label": "Select topics from a predefined syllabus"
          },
          {
            "value": "q22_a3",
            "label": "Upload notes or PDFs"
          },
          {
            "value": "q22_a4",
            "label": "Import topics from a study resource I already use"
          },
          {
            "value": "q22_a5",
            "label": "Use voice input"
          },
          {
            "value": "q22_a6",
            "label": "A combination of these methods"
          }
        ]
      },
      {
        "id": "q23",
        "number": 23,
        "version": 1,
        "prompt": "How much time would you realistically spend on a daily revision session in such a tool?",
        "type": "single",
        "required": true,
        "options": [
          {
            "value": "q23_a1",
            "label": "Under 5 minutes"
          },
          {
            "value": "q23_a2",
            "label": "5–10 minutes"
          },
          {
            "value": "q23_a3",
            "label": "10–15 minutes"
          },
          {
            "value": "q23_a4",
            "label": "15–30 minutes"
          },
          {
            "value": "q23_a5",
            "label": "More than 30 minutes"
          },
          {
            "value": "q23_a6",
            "label": "I would not use it daily"
          }
        ]
      },
      {
        "id": "q24",
        "number": 24,
        "version": 1,
        "prompt": "What would prevent you from using a tool like this regularly? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q24_a1",
            "label": "It adds work to my existing routine"
          },
          {
            "value": "q24_a2",
            "label": "I already have a system that works"
          },
          {
            "value": "q24_a3",
            "label": "Questions may be inaccurate or unreliable"
          },
          {
            "value": "q24_a4",
            "label": "It may not match the NEET-PG exam pattern"
          },
          {
            "value": "q24_a5",
            "label": "I would not trust AI-generated medical content without verification"
          },
          {
            "value": "q24_a6",
            "label": "Too many reminders or notifications"
          },
          {
            "value": "q24_a7",
            "label": "Subscription cost"
          },
          {
            "value": "q24_a8",
            "label": "Privacy concerns about my notes or study data"
          },
          {
            "value": "q24_a9",
            "label": "I may stop using it after a few days"
          },
          {
            "value": "q24_a10",
            "label": "Nothing specific"
          },
          {
            "value": "q24_a11",
            "label": "Other"
          }
        ]
      },
      {
        "id": "q25",
        "number": 25,
        "version": 1,
        "prompt": "What would you need to see before trusting this tool for your preparation? Select all that apply.",
        "type": "multi",
        "required": true,
        "options": [
          {
            "value": "q25_a1",
            "label": "Verified, accurate medical content"
          },
          {
            "value": "q25_a2",
            "label": "Questions aligned with the NEET-PG syllabus"
          },
          {
            "value": "q25_a3",
            "label": "Reliable explanations and references"
          },
          {
            "value": "q25_a4",
            "label": "Evidence that scheduled revision improves my recall"
          },
          {
            "value": "q25_a5",
            "label": "A demonstration using my own study topics"
          },
          {
            "value": "q25_a6",
            "label": "Recommendations from students or faculty"
          },
          {
            "value": "q25_a7",
            "label": "A free trial"
          },
          {
            "value": "q25_a8",
            "label": "Integration with my existing study resources"
          },
          {
            "value": "q25_a9",
            "label": "Other"
          }
        ]
      }
    ]
  },
  {
    "id": 6,
    "title": "Open feedback",
    "questions": [
      {
        "id": "q26",
        "number": 26,
        "version": 1,
        "prompt": "What is the single biggest problem you face during NEET-PG preparation that you wish someone would solve?",
        "type": "text",
        "required": false,
        "options": []
      },
      {
        "id": "q27",
        "number": 27,
        "version": 1,
        "prompt": "Describe the last time you forgot a topic you had previously studied. What happened, and how did you handle it?",
        "type": "text",
        "required": false,
        "options": []
      },
      {
        "id": "q28",
        "number": 28,
        "version": 1,
        "prompt": "What would make revision easier or more effective for you?",
        "type": "text",
        "required": false,
        "options": []
      }
    ]
  }
];
export const questions = sections.flatMap(section => section.questions);
export const questionById = Object.fromEntries(questions.map(question => [question.id, question]));
export function answerLabel(id: string, value: string) { return questionById[id]?.options.find(option => option.value === value)?.label ?? value; }
export function displayAnswer(id: string, answer?: Answer) { return answer?.text?.trim() || answer?.values?.map(value => answerLabel(id, value) + (answer.other && answerLabel(id, value) === 'Other' ? `: ${answer.other}` : '')).join('; ') || 'Not answered'; }
export const sectionDescriptions = [
  'A little context about where you are in your NEET-PG journey.',
  'Help us understand what stays with you, and what slips away.',
  'Tell us how revision fits into your everyday preparation.',
  'The resources you rely on and how you keep track of your progress.',
  'Your honest perspective on a possible approach to revision.',
  'A little space for the things that matter most to you.',
];
