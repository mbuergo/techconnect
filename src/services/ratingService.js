// ratingService.js — handles submitting star ratings after a job is complete.
// Both the customer and mechanic rate each other. Each rating:
//   1. Creates a new document in the "ratings" collection
//   2. Updates the rated user's running average in their "users" document

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── submitRating ─────────────────────────────────────────────────────────────
// Writes a rating and updates the recipient's average score in one operation.
//
// Parameters:
//   jobId      — which job this rating is for
//   fromUserId — the person giving the rating (customer or mechanic)
//   toUserId   — the person receiving the rating
//   stars      — number from 1 to 5
//   comment    — optional text feedback (defaults to empty string)
export async function submitRating({ jobId, fromUserId, toUserId, stars, comment = '' }) {
  // Step 1: Save the rating as its own document in the "ratings" collection.
  // addDoc auto-generates the document ID.
  await addDoc(collection(db, 'ratings'), {
    jobId,
    fromUserId,
    toUserId,
    stars,
    comment,
    createdAt: serverTimestamp(),
  });

  // Step 2: Update the recipient's average rating on their user document.
  // We store a running average so we don't have to re-read all ratings every time.
  const userRef = doc(db, 'users', toUserId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const { averageRating = 0, totalRatings = 0 } = userSnap.data();

    // Calculate the new average by working backwards from the stored values.
    // (old average × old count + new stars) ÷ new count
    const newTotal = totalRatings + 1;
    const newAverage = (averageRating * totalRatings + stars) / newTotal;

    // Round to one decimal place (e.g. 4.666... → 4.7) so it displays cleanly
    await updateDoc(userRef, {
      averageRating: Math.round(newAverage * 10) / 10,
      totalRatings: newTotal,
    });
  }
}
