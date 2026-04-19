import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  where,
  increment,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import {
  Participant,
  Submission,
  Evaluation,
  ViolationLog,
  Config,
} from '@/types';

// Always get db lazily (client-only)
const db = () => getFirebaseDb();

// ─── Participants ────────────────────────────────────────────────────────────

export async function createOrUpdateParticipant(
  uid: string,
  data: Partial<Participant>
): Promise<void> {
  const ref = doc(db(), 'participants', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...data });
  } else {
    await setDoc(ref, { uid, createdAt: serverTimestamp(), ...data });
  }
}

export async function getParticipant(uid: string): Promise<Participant | null> {
  const ref = doc(db(), 'participants', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Participant) : null;
}

export async function getAllParticipants(): Promise<Participant[]> {
  const snap = await getDocs(collection(db(), 'participants'));
  return snap.docs.map((d) => d.data() as Participant);
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export async function createSubmission(
  uid: string,
  name: string,
  email: string,
  timers: number[]
): Promise<void> {
  const ref = doc(db(), 'submissions', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  await setDoc(ref, {
    uid,
    name,
    email,
    answers: [],
    startedAt: serverTimestamp(),
    questionIndex: 0,
    questionStartTime: serverTimestamp(),
    status: 'in_progress',
    tabSwitchCount: 0,
    fullscreenExitCount: 0,
    integrityScore: 100,
    autoSubmitReason: null,
    allowedTimers: timers,
  });
}

export async function getSubmission(uid: string): Promise<Submission | null> {
  const ref = doc(db(), 'submissions', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Submission) : null;
}

export async function saveAnswer(
  uid: string,
  questionIndex: number,
  text: string,
  wordCount: number
): Promise<void> {
  try {
    const ref = doc(db(), 'submissions', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Submission;

    const answers = [...(data.answers || [])];
    const existingIdx = answers.findIndex((a) => a.questionIndex === questionIndex);
    const newAnswer = { 
      questionIndex, 
      text, 
      wordCount, 
      savedAt: Timestamp.now() 
    };
    
    if (existingIdx >= 0) {
      // Only update if the text is different to save bandwidth/costs
      if (answers[existingIdx].text === text) return;
      answers[existingIdx] = newAnswer;
    } else {
      answers.push(newAnswer);
    }

    await updateDoc(ref, { answers });
  } catch (error) {
    console.error(`Failed to save answer for Q${questionIndex}:`, error);
    throw error;
  }
}

export async function advanceQuestion(
  uid: string,
  nextIndex: number,
  answeredText: string,
  wordCount: number
): Promise<void> {
  try {
    const ref = doc(db(), 'submissions', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Submission;

    const answers = [...(data.answers || [])];
    const existingIdx = answers.findIndex((a) => a.questionIndex === data.questionIndex);
    const newAnswer = {
      questionIndex: data.questionIndex,
      text: answeredText,
      wordCount,
      savedAt: Timestamp.now(),
    };
    
    if (existingIdx >= 0) answers[existingIdx] = newAnswer;
    else answers.push(newAnswer);

    await updateDoc(ref, {
      answers,
      questionIndex: nextIndex,
      questionStartTime: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to advance question:', error);
    throw error;
  }
}

export async function submitSubmission(
  uid: string,
  finalAnswer: string,
  wordCount: number,
  autoSubmitReason?: string
): Promise<void> {
  const ref = doc(db(), 'submissions', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as Submission;
  if (data.status === 'submitted' || data.status === 'locked') return;

  const answers = [...(data.answers || [])];
  const existingIdx = answers.findIndex((a) => a.questionIndex === data.questionIndex);
  const finalAns = { questionIndex: data.questionIndex, text: finalAnswer, wordCount, savedAt: Timestamp.now() };
  if (existingIdx >= 0) answers[existingIdx] = finalAns;
  else answers.push(finalAns);

  await updateDoc(ref, {
    answers,
    status: 'submitted',
    submittedAt: serverTimestamp(),
    autoSubmitReason: autoSubmitReason || null,
  });
}

export async function updateViolationCount(
  uid: string,
  type: 'tab_switch' | 'fullscreen_exit'
): Promise<void> {
  const ref = doc(db(), 'submissions', uid);
  const penalty = type === 'tab_switch' ? 10 : 15;
  
  await updateDoc(ref, {
    tabSwitchCount: increment(type === 'tab_switch' ? 1 : 0),
    fullscreenExitCount: increment(type === 'fullscreen_exit' ? 1 : 0),
    integrityScore: increment(-penalty),
  });
}

export async function getAllSubmissions(): Promise<(Submission & { id: string })[]> {
  const snap = await getDocs(collection(db(), 'submissions'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission & { id: string }));
}

// ─── Evaluations ─────────────────────────────────────────────────────────────

export async function saveEvaluation(
  evaluation: Omit<Evaluation, 'id' | 'createdAt'>
): Promise<string> {
  const q = query(
    collection(db(), 'evaluations'),
    where('submissionId', '==', evaluation.submissionId),
    where('judgeId', '==', evaluation.judgeId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const existingRef = snap.docs[0].ref;
    await updateDoc(existingRef, { ...evaluation, createdAt: serverTimestamp() });
    return snap.docs[0].id;
  }
  const ref = await addDoc(collection(db(), 'evaluations'), {
    ...evaluation,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getEvaluationsForSubmission(submissionId: string): Promise<Evaluation[]> {
  const q = query(collection(db(), 'evaluations'), where('submissionId', '==', submissionId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
}

export async function getAllEvaluations(): Promise<Evaluation[]> {
  const snap = await getDocs(collection(db(), 'evaluations'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));
}

// ─── Logs ────────────────────────────────────────────────────────────────────

export async function logViolation(
  uid: string,
  name: string,
  type: ViolationLog['type'],
  metadata?: string
): Promise<void> {
  await addDoc(collection(db(), 'logs'), {
    uid,
    name,
    type,
    timestamp: serverTimestamp(),
    metadata: metadata || null,
  });
}

export async function getAllLogs(): Promise<ViolationLog[]> {
  const q = query(collection(db(), 'logs'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ViolationLog));
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getConfig(): Promise<Config> {
  const ref = doc(db(), 'config', 'main');
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as Config;
  
  // Default seeding if nothing in Firestore yet
  return {
    eventLive: true,
    allowSubmission: true,
    maxWords: 350,
    minWords: 30,
    questions: [
      {
        title: 'Problem Statement',
        prompt: 'Describe the problem you are trying to solve. What is the pain point? Who is affected, and how significantly?',
        emoji: '🧩',
        timer: 150,
      },
      {
        title: 'Proposed Solution',
        prompt: 'Explain your proposed solution in detail. How does it address the problem? What technology, methodology, or innovation does it leverage?',
        emoji: '💡',
        timer: 150,
      },
      {
        title: 'Impact & Innovation',
        prompt: 'What makes your idea innovative? Describe the potential impact — social, economic, environmental.',
        emoji: '🌍',
        timer: 150,
      },
    ],
  };
}

export async function updateConfig(data: Partial<Config>): Promise<void> {
  const ref = doc(db(), 'config', 'main');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    // Initial creation logic
    const base: Config = {
      eventLive: true,
      allowSubmission: true,
      maxWords: 350,
      minWords: 30,
      questions: [
        {
          title: 'Problem Statement',
          prompt: 'Describe the problem you are trying to solve.',
          emoji: '🧩',
          timer: 150,
        },
        {
          title: 'Proposed Solution',
          prompt: 'Explain your proposed solution in detail.',
          emoji: '💡',
          timer: 150,
        },
        {
          title: 'Impact & Innovation',
          prompt: 'What makes your idea innovative?',
          emoji: '🌍',
          timer: 150,
        },
      ],
    };
    await setDoc(ref, { ...base, ...data });
  }
}

// ─── Role Checks ─────────────────────────────────────────────────────────────

export async function isAdmin(email: string): Promise<boolean> {
  const ref = doc(db(), 'admins', email);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function isJudge(email: string): Promise<boolean> {
  const ref = doc(db(), 'judges', email);
  const snap = await getDoc(ref);
  return snap.exists();
}

// ─── Developer Tools ─────────────────────────────────────────────────────────

export async function deleteSubmission(uid: string): Promise<void> {
  const ref = doc(db(), 'submissions', uid);
  await deleteDoc(ref);
}

export async function seedFreshUsers(): Promise<void> {
  const batch = writeBatch(db());
  const users = [
    { uid: 'fresh-001', name: 'Aarav Kumar', email: 'aarav@test.com', phone: '9876543210' },
    { uid: 'fresh-002', name: 'Riya Sharma', email: 'riya@test.com', phone: '9988776655' },
    { uid: 'fresh-003', name: 'Kaleb J.', email: 'kaleb@test.com', phone: '9123456789' },
  ];

  for (const u of users) {
    const pRef = doc(db(), 'participants', u.uid);
    batch.set(pRef, {
      ...u,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function deleteAllTestData(): Promise<void> {
  const batch = writeBatch(db());
  
  // Clean logs
  const logs = await getDocs(collection(db(), 'logs'));
  logs.forEach(d => { if (d.id.startsWith('seed-') || d.data().uid?.startsWith('fresh-')) batch.delete(d.ref); });

  // Clean participants
  const parts = await getDocs(collection(db(), 'participants'));
  parts.forEach(d => { if (d.id.startsWith('fresh-')) batch.delete(d.ref); });

  // Clean submissions
  const subs = await getDocs(collection(db(), 'submissions'));
  subs.forEach(d => { if (d.id.startsWith('fresh-')) batch.delete(d.ref); });

  await batch.commit();
}
