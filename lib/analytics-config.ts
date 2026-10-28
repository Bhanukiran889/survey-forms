export const chartDefinitions = [
  { id: 'stages', field: 'preparationStage', question: 'q5', title: 'Where students are in their preparation', short: 'Preparation stage', description: 'Current stage of the preparation journey', multi: false },
  { id: 'recall', field: 'recallFrequency', question: 'q6', title: 'How often recall feels difficult', short: 'Recall difficulties', description: 'Reported frequency of difficulty remembering', multi: false },
  { id: 'obstacles', field: 'responses.q14.values', question: 'q14', title: 'What gets in the way of revision', short: 'Revision obstacles', description: 'Challenges students select most often', multi: true },
  { id: 'methods', field: 'revisionMethod', question: 'q13', title: 'How students revise today', short: 'Current revision methods', description: 'Methods used to revisit previously studied topics', multi: true },
  { id: 'features', field: 'selectedFeatures', question: 'q21', title: 'What students would find valuable', short: 'Preferred features', description: 'Up to three priorities selected by each student', multi: true },
  { id: 'usefulness', field: 'productUsefulness', question: 'q20', title: 'A perspective on the product concept', short: 'Perceived usefulness', description: 'Usefulness of a personalized MCQ revision tool', multi: false },
  { id: 'time', field: 'responses.q15.values', question: 'q15', title: 'Time set aside for revision', short: 'Daily revision time', description: 'Daily time spent revisiting studied material', multi: true },
];
