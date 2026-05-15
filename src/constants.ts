/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GuidedWorkout } from './types';

export const GUIDED_WORKOUTS: GuidedWorkout[] = [
  // 10-minute workouts
  {
    title: "Quick Morning Activate",
    durationMinutes: 10,
    energyCost: 'low',
    exercises: [
      { name: "Jumping Jacks", repOrDuration: "30 seconds", instructions: "Stand with feet together, jump feet out while raising arms overhead, return to start." },
      { name: "Push-Ups", repOrDuration: "10 reps", instructions: "Hands shoulder-width apart, lower chest to floor, push back up keeping core tight." },
      { name: "Bodyweight Squats", repOrDuration: "15 reps", instructions: "Feet hip-width apart, lower until thighs are parallel to floor, drive through heels to stand." },
      { name: "High Knees", repOrDuration: "30 seconds", instructions: "Run in place driving knees up to hip height, pump arms in rhythm." },
      { name: "Plank Hold", repOrDuration: "30 seconds", instructions: "Forearms on floor, body in a straight line from head to heels, breathe steadily." }
    ]
  },
  {
    title: "Desk Break Reset",
    durationMinutes: 10,
    energyCost: 'low',
    exercises: [
      { name: "Neck Rolls", repOrDuration: "30 seconds", instructions: "Slowly roll neck in circles, clockwise then counter-clockwise." },
      { name: "Shoulder Shrugs", repOrDuration: "15 reps", instructions: "Lift shoulders to ears, hold for 1s, then drop." },
      { name: "Seated Leg Extensions", repOrDuration: "10 reps/side", instructions: "While sitting, extend one leg straight out, hold for 2s, lower and repeat." },
      { name: "Wall Push-Ups", repOrDuration: "15 reps", instructions: "Arms length from wall, hands on wall, lower chest and push back." },
      { name: "Standing Hamstring Stretch", repOrDuration: "30 seconds/side", instructions: "One heel on floor, lean forward from hips until stretch is felt in back of leg." }
    ]
  },
  {
    title: "Sunset Wind Down",
    durationMinutes: 10,
    energyCost: 'low',
    exercises: [
      { name: "Child’s Pose", repOrDuration: "60 seconds", instructions: "Kneel, sit on heels, lean forward until forehead touches floor, reach arms forward." },
      { name: "Cat-Cow Stretch", repOrDuration: "10 reps", instructions: "On hands and knees, arch back (cow) then round it (cat) at a slow pace." },
      { name: "Bird Dog", repOrDuration: "5 reps/side", instructions: "On hands and knees, extend opposite arm and leg simultaneously, hold 2s." },
      { name: "Glute Bridges", repOrDuration: "15 reps", instructions: "Lying on back, knees bent, lift hips toward ceiling, squeeze glutes at top." },
      { name: "Deep Breathing", repOrDuration: "1 minute", instructions: "Sit comfortably, inhale for 4s, hold for 4s, exhale for 4s." }
    ]
  },
  // 20-minute workouts
  {
    title: "Core Power Flow",
    durationMinutes: 20,
    energyCost: 'medium',
    exercises: [
      { name: "Mountain Climbers", repOrDuration: "45 seconds", instructions: "Plank position, drive knees toward chest alternately at a fast pace." },
      { name: "Bicycle Crunches", repOrDuration: "20 reps", instructions: "Lying on back, opposite elbow to opposite knee while cycling legs." },
      { name: "Russian Twists", repOrDuration: "30 reps", instructions: "Sitting with knees bent, feet off floor, rotate torso from side to side." },
      { name: "Flutter Kicks", repOrDuration: "45 seconds", instructions: "Lying on back, hands under glutes, kick legs up and down in small movements." },
      { name: "Side Planks", repOrDuration: "30 seconds/side", instructions: "On one forearm and side of foot, body in straight line, hold steadily." }
    ]
  },
  {
    title: "Lower Body Burn",
    durationMinutes: 20,
    energyCost: 'medium',
    exercises: [
      { name: "Lunges", repOrDuration: "10 reps/side", instructions: "Step forward, lower hips until both knees are 90 degrees, push back to start." },
      { name: "Sumo Squats", repOrDuration: "20 reps", instructions: "Wide stance, toes pointed out, lower until thighs are parallel to floor." },
      { name: "Calf Raises", repOrDuration: "30 reps", instructions: "Standing, lift heels as high as possible, hold 1s, lower slowly." },
      { name: "Curtsy Lunges", repOrDuration: "10 reps/side", instructions: "Step one leg back and across the other, lower hips, push back to start." },
      { name: "Wall Sit", repOrDuration: "60 seconds", instructions: "Back against wall, lower until thighs are parallel to floor, hold." }
    ]
  },
  {
    title: "Cardio Kickstart",
    durationMinutes: 20,
    energyCost: 'medium',
    exercises: [
      { name: "Burpees", repOrDuration: "10 reps", instructions: "Squat, jump feet back to plank, push-up, jump feet forward, jump up." },
      { name: "Skaters", repOrDuration: "45 seconds", instructions: "Jump side to side landing on one foot, swing arms like a speed skater." },
      { name: "Butt Kicks", repOrDuration: "45 seconds", instructions: "Run in place, kicking heels back toward glutes quickly." },
      { name: "Shadow Boxing", repOrDuration: "60 seconds", instructions: "Punch air in various combinations (jab, cross, hook) while moving feet." },
      { name: "Jump Squats", repOrDuration: "15 reps", instructions: "Perform a squat, then jump explosively, land softly back in squat." }
    ]
  },
  // 30-minute workouts
  {
    title: "Full Body Mastery",
    durationMinutes: 30,
    energyCost: 'medium',
    exercises: [
       { name: "Diamond Push-Ups", repOrDuration: "12 reps", instructions: "Hands close with fingers forming a diamond, lower and push back up." },
       { name: "Reverse Lunges", repOrDuration: "12 reps/side", instructions: "Step one leg back, lower hips, return to center." },
       { name: "Plank Jacks", repOrDuration: "45 seconds", instructions: "Plank position, jump feet out and in like a jumping jack." },
       { name: "Superman Reach", repOrDuration: "15 reps", instructions: "Lying on stomach, lift chest and legs simultaneously, hold 1s." },
       { name: "Inchworms", repOrDuration: "10 reps", instructions: "Stand, hands to floor, walk hands out to plank, walk hands back to feet." }
    ]
  },
  {
    title: "Stamina Builder",
    durationMinutes: 30,
    energyCost: 'medium',
    exercises: [
        { name: "High Knee Run", repOrDuration: "60 seconds", instructions: "Intense run in place with knees driving high." },
        { name: "Bear Crawls", repOrDuration: "45 seconds", instructions: "On hands and toes, move forward and backward keeping hips low." },
        { name: "Pike Push-Ups", repOrDuration: "10 reps", instructions: "Hips high in V-shape, lower head toward floor between hands, push up." },
        { name: "Tuck Jumps", repOrDuration: "10 reps", instructions: "Jump high, tucking knees to chest mid-air, land softly." },
        { name: "Hollow Body Hold", repOrDuration: "45 seconds", instructions: "Lying on back, lift arms and legs slightly off floor, engage core intensely." }
    ]
  },
  {
    title: "Agility & Flow",
    durationMinutes: 30,
    energyCost: 'medium',
    exercises: [
        { name: "Lateral Shuffles", repOrDuration: "45 seconds", instructions: "Stay low, shuffle 3 steps left then 3 steps right quickly." },
        { name: "Commandos", repOrDuration: "12 reps", instructions: "Low plank to high plank, one arm at a time, keeping core stable." },
        { name: "Plank Rotations", repOrDuration: "10 reps/side", instructions: "Plank position, rotate to one side extending arm to ceiling, repeat." },
        { name: "Lunge Jumps", repOrDuration: "20 total", instructions: "Jump from lunge position switching legs in mid-air." },
        { name: "Single Leg Deadlift", repOrDuration: "10 reps/side", instructions: "Balance on one leg, lean forward keeping back flat, return to stand." }
    ]
  }
];
