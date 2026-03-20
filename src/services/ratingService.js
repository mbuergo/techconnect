import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export async function submitRating({ jobId, fromUserId, toUserId, stars, comment = '' }) {
  // Write rating document
  await addDoc(collection(db, 'ratings'), {
    jobId,
    fromUserId,
    toUserId,
    stars,
    comment,
    createdAt: serverTimestamp(),
  });

  // Update the rated user's average rating
  const userRef = doc(db, 'users', toUserId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const { averageRating = 0, totalRatings = 0 } = userSnap.data();
    const newTotal = totalRatings + 1;
    const newAverage = (averageRating * totalRatings + stars) / newTotal;
    await updateDoc(userRef, {
      averageRating: Math.round(newAverage * 10) / 10,
      totalRatings: newTotal,
    });
  }
}
