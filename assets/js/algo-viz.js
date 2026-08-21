// Minimal step-player used by the interactive LeetCode-pattern posts.
// Usage: AlgoViz.mount(document.getElementById('viz-id'), { steps, render, initialSpeed })
//   steps:  array of arbitrary state objects, one per animation frame
//   render: (stageEl, step, index, total) => void — draws `step` into stageEl
window.AlgoViz = (function () {
  function mount(root, { steps, render, initialSpeed = 700 }) {
    let idx = 0;
    let playing = false;
    let timer = null;
    let speed = initialSpeed;

    const stage = document.createElement('div');
    stage.className = 'algoviz-stage';

    const controls = document.createElement('div');
    controls.className = 'algoviz-controls';

    const btn = (label, title) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.className = 'algoviz-btn';
      return b;
    };

    const resetBtn = btn('⟲', 'Reset');
    const prevBtn = btn('◀', 'Step back');
    const playBtn = btn('▶', 'Play');
    const nextBtn = btn('▶|', 'Step forward');
    const counter = document.createElement('span');
    counter.className = 'algoviz-counter';

    const speedLbl = document.createElement('label');
    speedLbl.className = 'algoviz-speed';
    speedLbl.append('Speed');
    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.min = '150';
    speedInput.max = '1500';
    speedInput.step = '50';
    speedInput.value = String(initialSpeed);
    speedLbl.appendChild(speedInput);

    controls.append(resetBtn, prevBtn, playBtn, nextBtn, counter, speedLbl);
    root.append(stage, controls);

    function update() {
      render(stage, steps[idx], idx, steps.length);
      counter.textContent = (idx + 1) + ' / ' + steps.length;
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === steps.length - 1;
    }

    function stop() {
      playing = false;
      playBtn.textContent = '▶';
      if (timer) { clearInterval(timer); timer = null; }
    }

    function play() {
      if (idx >= steps.length - 1) idx = 0;
      playing = true;
      playBtn.textContent = '⏸';
      timer = setInterval(() => {
        if (idx >= steps.length - 1) { stop(); return; }
        idx++;
        update();
      }, speed);
    }

    resetBtn.onclick = () => { stop(); idx = 0; update(); };
    prevBtn.onclick = () => { stop(); if (idx > 0) { idx--; update(); } };
    nextBtn.onclick = () => { stop(); if (idx < steps.length - 1) { idx++; update(); } };
    playBtn.onclick = () => { playing ? stop() : play(); };
    speedInput.oninput = (e) => {
      speed = Number(e.target.value);
      if (playing) { stop(); play(); }
    };

    update();
    return { goTo(i) { stop(); idx = Math.max(0, Math.min(steps.length - 1, i)); update(); } };
  }

  return { mount };
})();
