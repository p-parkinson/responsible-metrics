#!/usr/bin/env node
// Simple node-based tests for quiz scoring logic (mirrors gradeForm)
const fs = require('fs');
const path = require('path');

function gradeQuestion(q, selectedIds){
  let score = 0;
  let max = q.weight || 1;
  if (q.type === 'multi-select'){
    const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
    const numCorrect = correctIds.length || 1;
    let raw = 0;
    selectedIds.forEach(sel => {
      if (correctIds.includes(sel)) raw += 1;
      else raw -= 1;
    });
    if (raw < 0) raw = 0;
    score = (raw / numCorrect) * max;
  } else {
    const correctOpt = q.options.find(o => o.isCorrect);
    const correctId = correctOpt ? correctOpt.id : null;
    score = (selectedIds.length && selectedIds[0] === correctId) ? max : 0;
  }
  return score;
}

function approxEqual(a,b,t=1e-6){ return Math.abs(a-b) < t; }

function run(){
  const data = JSON.parse(fs.readFileSync(path.join(__dirname,'..','quizzes','test_your_knowledge.json'),'utf8'));
  const q1 = data.questions.find(q=>q.id==='q1');
  // q1 has 2 correct: q1o2 and q1o3
  console.log('q1: select both correct -> expect full credit (1)');
  console.log(gradeQuestion(q1, ['q1o2','q1o3']));
  console.log('q1: select only one correct -> expect 0.5');
  console.log(gradeQuestion(q1, ['q1o2']));
  console.log('q1: select one correct and one incorrect -> expect 0');
  console.log(gradeQuestion(q1, ['q1o2','q1o1']));

  const q3 = data.questions.find(q=>q.id==='q3');
  console.log('q3 (single): select correct -> expect full credit');
  console.log(gradeQuestion(q3, ['q3o2']));
  console.log('q3 (single): select incorrect -> expect 0');
  console.log(gradeQuestion(q3, ['q3o1']));

  // assertions
  console.log('Running assertions...');
  if(!approxEqual(gradeQuestion(q1, ['q1o2','q1o3']), 1)) throw new Error('q1 full credit failed');
  if(!approxEqual(gradeQuestion(q1, ['q1o2']), 0.5)) throw new Error('q1 partial failed');
  if(!approxEqual(gradeQuestion(q1, ['q1o2','q1o1']), 0)) throw new Error('q1 incorrect penalty failed');
  if(!approxEqual(gradeQuestion(q3, ['q3o2']), 1)) throw new Error('q3 correct failed');
  if(!approxEqual(gradeQuestion(q3, ['q3o1']), 0)) throw new Error('q3 incorrect failed');
  console.log('All tests passed.');
}

run();
