// quiz.js - vanilla JS quiz renderer and engine
document.addEventListener('DOMContentLoaded', () => {
  async function initQuiz() {
    const roots = document.querySelectorAll('.quarto-content .quiz, .quiz');
    if (!roots || roots.length === 0) return;
    for (const root of roots) {
      const src = root.dataset.quiz;
      if (!src) continue;
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error('Quiz data not found: ' + src);
        const data = await res.json();
        renderQuiz(root, data);
      } catch (e) {
        root.innerHTML = '<p>Quiz cannot load — <a href="https://forms.office.com/e/2wiFXSSLSG">Try the original MS Form</a></p>';
        console.error(e);
      }
    }
  }

  function createEl(tag, attrs = {}, children = []){
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)){
      if (k === 'class') el.className = v;
      else if (k.startsWith('aria')) el.setAttribute(k, v);
      else el[k] = v;
    }
    children.forEach(c => {
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function renderQuiz(root, data){
    root.classList.add('rm-quiz-root');
    root.innerHTML = '';
    const header = createEl('div',{class:'quiz-header'},[
      createEl('h2',{class:'quiz-title'},[data.title || 'Quiz'])
    ]);
    root.appendChild(header);

    const form = createEl('form',{class:'quiz-form', action:'#'});
    data.questions.forEach((q, qi) => {
  const field = createEl('fieldset',{class:'quiz-question', id:`question-${q.id}`, role: 'group'});
  const legendId = `legend-${q.id}`;
  const legend = createEl('legend',{id: legendId, class:'quiz-question-title'},[ `${qi+1}. ${q.text}`]);
  field.setAttribute('aria-labelledby', legendId);
      field.appendChild(legend);
      if (q.hint) field.appendChild(createEl('p',{class:'quiz-question-hint'},[q.hint]));

      const options = createEl('div',{class:'quiz-options'});
      q.options.forEach(opt => {
        const optId = `${q.id}-${opt.id}`;
        const inputType = q.type === 'multi-select' ? 'checkbox' : 'radio';
  const input = createEl('input', {type: inputType, name: `ans-${q.id}`, id: optId, value: opt.id});
        const label = createEl('label', {htmlFor: optId, class:'quiz-label'}, [opt.text]);
        const wrap = createEl('div', {class:'quiz-option'});
        wrap.appendChild(input);
        wrap.appendChild(label);
        // accessible description for feedback
  const fbId = `${optId}-fb`;
  const fb = createEl('div', {id: fbId, class:'quiz-feedback', 'aria-hidden':'true'}, [opt.feedback || '']);
  input.setAttribute('aria-describedby', fbId);
        wrap.appendChild(fb);
        options.appendChild(wrap);
      });
      field.appendChild(options);
      // explain text
      if (q.explainCorrect) {
        const explain = createEl('div',{class:'quiz-explain', 'aria-hidden':'true'}, [q.explainCorrect]);
        field.appendChild(explain);
      }
      form.appendChild(field);
    });

    const actions = createEl('div',{class:'quiz-actions'},[
      createEl('button',{type:'submit', class:'btn btn-primary quiz-submit'},['Submit']),
      createEl('button',{type:'button', class:'btn btn-secondary quiz-reset'},['Reset'])
    ]);

    const resultsBox = createEl('div',{class:'quiz-results', 'aria-live':'polite'});
    root.appendChild(form);
    root.appendChild(actions);
    root.appendChild(resultsBox);

    form.addEventListener('submit', e => {
      e.preventDefault();
      const results = gradeForm(form, data.questions);
      showResults(root, results, data.questions);
    });

    root.querySelector('.quiz-reset').addEventListener('click', e => {
      e.preventDefault();
      form.reset();
      // clear feedback
      root.querySelectorAll('.quiz-feedback').forEach(e => { e.setAttribute('aria-hidden','true'); e.style.display = 'none'; });
      root.querySelectorAll('.quiz-explain').forEach(e => { e.setAttribute('aria-hidden','true'); e.style.display = 'none'; });
      resultsBox.innerHTML = '';
    });
  }

  function gradeForm(form, questions){
    // Returns {score, maxScore, perQuestion: [{id,score,max,explain,optionFeedbacks:[{optionId,selected,isCorrect,feedback}]}]}
    let totalScore = 0;
    let totalMax = 0;
    const perQuestion = questions.map(q => {
      const nodes = [...form.querySelectorAll(`[name='ans-${q.id}']`)];
      const selectedIds = nodes.filter(n => n.checked).map(n => n.value);
      let score = 0;
      let max = q.weight || 1;
      // Multi-select partial scoring: +1 per correct selected, -1 per incorrect selected; min 0; normalized by #correct
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
      } else { // single-select
        const correctOpt = q.options.find(o => o.isCorrect);
        const correctId = correctOpt ? correctOpt.id : null;
        if (!correctId) {
          // defensive: no correct answer defined, treat as 0 and warn
          console.warn(`No correct option configured for question ${q.id}`);
          score = 0;
        } else {
          score = selectedIds.length && selectedIds[0] === correctId ? max : 0;
        }
      }
      totalScore += score;
      totalMax += max;
      // option feedback
      const optionFeedbacks = q.options.map(o => ({ optionId: o.id, selected: selectedIds.includes(o.id), isCorrect: !!o.isCorrect, feedback: o.feedback }));
      return { id: q.id, score, max, optionFeedbacks, explain: q.explainCorrect };
    });
    return { score: totalScore, max: totalMax, perQuestion };
  }

  function showResults(root, results, questions){
    const resultsBox = root.querySelector('.quiz-results');
    resultsBox.innerHTML = '';
    const pct = Math.round((results.score / results.max) * 100);
    const summary = createEl('div', {class:'quiz-summary'}, [ `Score: ${Math.round(results.score*100)/100} / ${results.max} (${pct}%)` ]);
    resultsBox.appendChild(summary);
    results.perQuestion.forEach((r, i) => {
      const q = questions.find(q => q.id === r.id);
      const qEl = root.querySelector(`#question-${r.id}`);
      // show per-option feedback
      const optNodes = qEl.querySelectorAll('.quiz-option');
      r.optionFeedbacks.forEach(of=>{
        const sel = qEl.querySelector(`#${q.id}-${of.optionId}`);
        if(!sel) return;
        const fb = sel.closest('.quiz-option').querySelector('.quiz-feedback');
        if(of.selected){ fb.style.display = 'block'; fb.setAttribute('aria-hidden','false'); }
        else { fb.style.display = 'none'; fb.setAttribute('aria-hidden','true'); }
        // color selection
        if(of.selected && of.isCorrect) sel.closest('label').classList.add('quiz-correct');
        if(of.selected && !of.isCorrect) sel.closest('label').classList.add('quiz-incorrect');
      });
      // show explanation
      const explain = qEl.querySelector('.quiz-explain');
      if(explain){ explain.style.display = 'block'; explain.setAttribute('aria-hidden','false'); }
      // attach per-question score
      const qScore = createEl('div',{class:'quiz-per-question-score'}, [`Question score: ${Math.round(r.score*100)/100} / ${r.max}`]);
      resultsBox.appendChild(qScore);
    });
    // Thank you message
    const thankYou = createEl('div',{class:'quiz-thankyou'}, [ 'Thank you for completing the quiz. ']);
    const viewResults = createEl('button',{class:'btn btn-link', type:'button'}, ['View Results']);
    viewResults.addEventListener('click', () => {
      // expand/collapse result details
      const expanded = resultsBox.classList.toggle('expanded');
      viewResults.textContent = expanded ? 'Hide Results' : 'View Results';
    });
    thankYou.appendChild(viewResults);
    resultsBox.appendChild(thankYou);
    // Persist best score in localStorage
    try{
      const key = 'quiz-best-' + (root.dataset.quiz || 'quiz');
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      if (!existing.best || results.score > existing.best) {
        localStorage.setItem(key, JSON.stringify({best: results.score, max: results.max, timestamp: new Date().toISOString()}));
      }
    } catch(e){ console.warn('Could not persist quiz score', e); }
  }

  initQuiz();
});
