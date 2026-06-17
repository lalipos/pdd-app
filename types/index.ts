export interface Answer {
  answer_text: string;
  is_correct: boolean;
}

export interface Question {
  title: string;
  ticket_number: string;
  ticket_category: string;
  image: string;
  question: string;
  answers: Answer[];
  correct_answer: string;
  answer_tip: string;
  topic: string[];
  id: string;
}

export type Category = 'AB' | 'CD';
export type SessionMode = 'train' | 'ticket' | 'exam' | 'review' | 'cram';

export interface Stats {
  totalAnswered: number;
  totalCorrect: number;
  wrongQuestionIds: string[];
}

export type Screen =
  | { name: 'category' }
  | { name: 'home' }
  | { name: 'tickets' }
  | { name: 'session'; mode: SessionMode; ticketNumber?: number }
  | { name: 'stats' };
