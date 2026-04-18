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
  tabSwitchCount: number,
  fullscreenExitCount: number,
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

  const integrityScore = Math.max(0, 100 - tabSwitchCount * 10 - fullscreenExitCount * 15);

  await updateDoc(ref, {
    answers,
    status: 'submitted',
    submittedAt: serverTimestamp(),
    tabSwitchCount,
    fullscreenExitCount,
    integrityScore,
    autoSubmitReason: autoSubmitReason || null,
  });
}

export async function updateViolationCount(
  uid: string,
  tabSwitchCount: number,
  fullscreenExitCount: number
): Promise<void> {
  const ref = doc(db(), 'submissions', uid);
  const integrityScore = Math.max(0, 100 - tabSwitchCount * 10 - fullscreenExitCount * 15);
  await updateDoc(ref, { tabSwitchCount, fullscreenExitCount, integrityScore });
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
  return {
    eventLive: true,
    allowSubmission: true,
    questionTimers: [120, 120, 180],
    maxWords: 350,
    minWords: 30,
  };
}

export async function updateConfig(data: Partial<Config>): Promise<void> {
  const ref = doc(db(), 'config', 'main');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    await setDoc(ref, {
      eventLive: true,
      allowSubmission: true,
      questionTimers: [120, 120, 180],
      maxWords: 350,
      minWords: 30,
      ...data,
    });
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
