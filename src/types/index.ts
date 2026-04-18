import { Timestamp } from 'firebase/firestore';

export interface Participant {
  uid: string;
  name: string;
  email: string;
  phone: string;
  createdAt: Timestamp;
}

export interface Answer {
  questionIndex: number;
  text: string;
  wordCount: number;
  savedAt: Timestamp;
}

export interface Submission {
  uid: string;
  name: string;
  email: string;
  answers: Answer[];
  startedAt: Timestamp;
  submittedAt?: Timestamp;
  questionIndex: number; // current question (0,1,2)
  questionStartTime: Timestamp;
  status: 'in_progress' | 'submitted' | 'locked';
  tabSwitchCount: number;
  fullscreenExitCount: number;
  integrityScore: number;
  autoSubmitReason?: string;
}

export interface EvaluationScores {
  innovation: number; // 0-10
  feasibility: number; // 0-10
  impact: number; // 0-10
  clarity: number; // 0-10
}

export interface Evaluation {
  id?: string;
  submissionId: string;
  judgeId: string;
  judgeName: string;
  scores: EvaluationScores;
  total: number;
  remarks: string;
  createdAt: Timestamp;
}

export interface ViolationLog {
  id?: string;
  uid: string;
  name: string;
  type: 'tab_switch' | 'fullscreen_exit' | 'auto_submit';
  timestamp: Timestamp;
  metadata?: string;
}

export interface QuestionConfig {
  title: string;
  prompt: string;
  emoji: string;
  timer: number; // in seconds
}

export interface Config {
  eventLive: boolean;
  allowSubmission: boolean;
  questions: QuestionConfig[];
  maxWords: number; // 350
  minWords: number; // 30
}

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}
